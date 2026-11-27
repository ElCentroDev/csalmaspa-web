import crypto from 'node:crypto'
import {
  buildSessionCookie,
  parseCookies,
  SESSION_COOKIE_NAME,
} from '../repositories/sessionsRepository.js'
import { sanitizeUser, verifyPassword } from '../repositories/usersRepository.js'
import { getPermissionsForRole } from '../services/permissions.js'

const MAX_FAILED_ATTEMPTS = 10
const FAILED_WINDOW_MS = 15 * 60 * 1000

const loginSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['identifier', 'password'],
    properties: {
      identifier: { type: 'string', minLength: 1, maxLength: 120 },
      password: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
}

function isSecureRequest(request) {
  return (
    process.env.NODE_ENV === 'production' ||
    String(request.headers['x-forwarded-proto'] || '').toLowerCase() === 'https'
  )
}

function hashIp(ip, salt) {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${ip || ''}`)
    .digest('hex')
    .slice(0, 32)
}

export default async function authRoutes(
  fastify,
  { config, usersRepo, sessionsRepo, activityRepo },
) {
  const failedByIp = new Map()

  const pruneOldAttempts = (ip, nowMs) => {
    const recent = (failedByIp.get(ip) || []).filter((ts) => nowMs - ts < FAILED_WINDOW_MS)
    if (recent.length) failedByIp.set(ip, recent)
    else failedByIp.delete(ip)
    return recent
  }

  fastify.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
    reply.header('X-Robots-Tag', 'noindex, nofollow')
  })

  fastify.post('/api/auth/login', { schema: loginSchema }, async (request, reply) => {
    const ip = request.ip || 'unknown'
    const nowMs = Date.now()
    if (failedByIp.size > 1000) {
      for (const key of failedByIp.keys()) pruneOldAttempts(key, nowMs)
    }

    const recentFailures = pruneOldAttempts(ip, nowMs)
    if (recentFailures.length >= MAX_FAILED_ATTEMPTS) {
      return reply.code(429).send({
        success: false,
        error: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.',
      })
    }

    const identifier = String(request.body.identifier || '').trim()
    const password = String(request.body.password || '')

    const userRow = usersRepo.findAuthByIdentifier(identifier)
    if (!userRow || !verifyPassword(password, userRow.password_hash)) {
      recentFailures.push(nowMs)
      failedByIp.set(ip, recentFailures)
      return reply.code(401).send({
        success: false,
        error: 'Usuario o contraseña incorrectos.',
      })
    }

    if (userRow.estado !== 'activo' || userRow.rol === 'ninguno') {
      return reply.code(403).send({
        success: false,
        error: 'Esta cuenta está desactivada o no tiene un rol asignado.',
      })
    }

    failedByIp.delete(ip)
    usersRepo.touchLastLogin(userRow.id)
    const freshRow = usersRepo.findAuthByIdentifier(userRow.email) || userRow
    const ipHash = hashIp(ip, config.privacy.ipHashSalt)
    const session = sessionsRepo.create(userRow.id, ipHash)

    if (activityRepo) {
      activityRepo.record({
        modulo: 'sistema',
        accion: 'login',
        descripcion: `Inició sesión en el panel (@${freshRow.username}).`,
        actor: `${freshRow.nombre} (@${freshRow.username})`,
      })
    }

    reply.header(
      'Set-Cookie',
      buildSessionCookie(session.token, {
        maxAgeSeconds: session.maxAgeSeconds,
        secure: isSecureRequest(request),
      }),
    )

    const user = {
      ...sanitizeUser(freshRow),
      is_default_password: Boolean(
        config.auth.initialAdminPassword &&
          verifyPassword(config.auth.initialAdminPassword, freshRow.password_hash),
      ),
    }

    return {
      authenticated: true,
      user,
      permissions: getPermissionsForRole(user.rol),
    }
  })

  fastify.get('/api/auth/status', async (request) => {
    const cookies = parseCookies(request.headers.cookie)
    const token = cookies[SESSION_COOKIE_NAME]
    const session = sessionsRepo.findValidSession(token)
    return { authenticated: Boolean(session) }
  })

  fastify.get('/api/auth/me', async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie)
    const token = cookies[SESSION_COOKIE_NAME]
    const session = sessionsRepo.findValidSession(token)
    if (!session) {
      return reply.code(401).send({ authenticated: false })
    }

    return {
      authenticated: true,
      user: session.user,
      permissions: session.permissions,
    }
  })

  fastify.post('/api/auth/logout', async (request, reply) => {
    const cookies = parseCookies(request.headers.cookie)
    const token = cookies[SESSION_COOKIE_NAME]
    const session = sessionsRepo.findValidSession(token)

    if (token) {
      sessionsRepo.revokeByToken(token)
    }

    if (session && activityRepo) {
      activityRepo.record({
        modulo: 'sistema',
        accion: 'logout',
        descripcion: `Cerró sesión en el panel (@${session.user.username}).`,
        actor: `${session.user.nombre} (@${session.user.username})`,
      })
    }

    reply.header(
      'Set-Cookie',
      buildSessionCookie('', {
        maxAgeSeconds: 0,
        secure: isSecureRequest(request),
      }),
    )

    return { success: true }
  })
}
