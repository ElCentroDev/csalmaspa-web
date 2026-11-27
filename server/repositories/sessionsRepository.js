import crypto from 'node:crypto'
import { getPermissionsForRole } from '../services/permissions.js'
import { sanitizeUser, verifyPassword } from './usersRepository.js'

export const SESSION_COOKIE_NAME = 'csalma_session'

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex')
}

export function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies
  for (const part of cookieHeader.split(';')) {
    const eqIndex = part.indexOf('=')
    if (eqIndex <= 0) continue
    const key = part.slice(0, eqIndex).trim()
    const rawVal = part.slice(eqIndex + 1).trim()
    if (!key) continue
    try {
      cookies[key] = decodeURIComponent(rawVal)
    } catch {
      cookies[key] = rawVal
    }
  }
  return cookies
}

export function buildSessionCookie(token, { maxAgeSeconds, secure = false } = {}) {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token || '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(Number(maxAgeSeconds) || 0))}`,
  ]
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

export function createSessionsRepository(db, { ttlHours = 168, defaultAdminPassword = 'admin' } = {}) {
  const maxAgeSeconds = Math.max(3600, Math.round(Number(ttlHours || 168) * 3600))

  const statements = {
    insert: db.prepare(`INSERT INTO sesiones (token_hash, usuario_id, created_at, expires_at, ip_hash)
      VALUES (:token_hash, :usuario_id, :created_at, :expires_at, :ip_hash)`),
    findValid: db.prepare(`SELECT s.token_hash, s.expires_at, u.*
      FROM sesiones s
      INNER JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = ? AND s.expires_at > ?
      LIMIT 1`),
    revokeByHash: db.prepare('DELETE FROM sesiones WHERE token_hash = ?'),
    revokeByUser: db.prepare('DELETE FROM sesiones WHERE usuario_id = ?'),
    revokeOtherUserSessions: db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND token_hash != ?'),
    pruneExpired: db.prepare('DELETE FROM sesiones WHERE expires_at <= ?'),
  }

  return {
    create(usuarioId, ipHash = '') {
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = hashToken(token)
      const nowMs = Date.now()
      const createdAt = new Date(nowMs).toISOString()
      const expiresAt = new Date(nowMs + maxAgeSeconds * 1000).toISOString()

      statements.pruneExpired.run(createdAt)
      statements.insert.run({
        token_hash: tokenHash,
        usuario_id: usuarioId,
        created_at: createdAt,
        expires_at: expiresAt,
        ip_hash: ipHash,
      })

      return { token, tokenHash, expiresAt, maxAgeSeconds }
    },

    findValidSession(rawToken) {
      if (!rawToken || typeof rawToken !== 'string') return null
      const tokenHash = hashToken(rawToken)
      const nowIso = new Date().toISOString()
      const row = statements.findValid.get(tokenHash, nowIso)
      if (!row) return null

      if (row.estado !== 'activo' || row.rol === 'ninguno') {
        statements.revokeByHash.run(tokenHash)
        return null
      }

      const user = {
        ...sanitizeUser(row),
        is_default_password: Boolean(
          defaultAdminPassword && verifyPassword(defaultAdminPassword, row.password_hash),
        ),
      }
      return {
        tokenHash: row.token_hash,
        user,
        permissions: getPermissionsForRole(row.rol),
      }
    },

    revokeByToken(rawToken) {
      if (!rawToken) return false
      return statements.revokeByHash.run(hashToken(rawToken)).changes > 0
    },

    revokeAllForUser(usuarioId, { exceptTokenHash } = {}) {
      if (exceptTokenHash) {
        return statements.revokeOtherUserSessions.run(usuarioId, exceptTokenHash).changes
      }
      return statements.revokeByUser.run(usuarioId).changes
    },
  }
}
