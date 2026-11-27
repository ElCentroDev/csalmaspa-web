import Fastify from 'fastify'
import { config } from './config.js'
import { openDatabase } from './db.js'
import { createActivityRepository } from './repositories/activityRepository.js'
import { createProjectsRepository } from './repositories/projectsRepository.js'
import { createRequestsRepository } from './repositories/requestsRepository.js'
import { createSessionsRepository } from './repositories/sessionsRepository.js'
import { createUsersRepository } from './repositories/usersRepository.js'
import adminRoutes from './routes/admin.js'
import authRoutes from './routes/auth.js'
import contactRoutes from './routes/contact.js'
import projectsPublicRoutes from './routes/projectsPublic.js'
import { createFileExplorerService } from './services/fileExplorerService.js'
import { createMailService } from './services/mailService.js'
import { createSystemInfoService } from './services/systemInfoService.js'
import { createUploadService } from './services/uploadService.js'
import { createUptimeMonitor } from './services/uptimeMonitor.js'

const HANDLED_CLIENT_STATUSES = new Set([400, 403, 404, 409, 413])

export function buildApp({
  appConfig = config,
  db,
  mailService = createMailService(appConfig),
  enableMonitor = appConfig.monitor.enabled,
  seedInitialAdmin = true,
} = {}) {
  const database = db || openDatabase(appConfig.storage.databaseFile)
  const requestsRepo = createRequestsRepository(database)
  const projectsRepo = createProjectsRepository(database)
  const activityRepo = createActivityRepository(database)
  const usersRepo = createUsersRepository(database)
  const sessionsRepo = createSessionsRepository(database, {
    ttlHours: appConfig.auth.sessionTtlHours,
    defaultAdminPassword: appConfig.auth.initialAdminPassword,
  })

  if (seedInitialAdmin) {
    usersRepo.ensureInitialAdmin({
      username: appConfig.auth.initialAdminUser,
      password: appConfig.auth.initialAdminPassword,
      nombre: 'Administrador CSALMA',
      email: appConfig.auth.initialAdminEmail,
    })
  }

  const uploadService = createUploadService(appConfig.storage.uploadsDir)
  const systemInfoService = createSystemInfoService({
    dataDir: appConfig.storage.dataDir,
    databaseFile: appConfig.storage.databaseFile,
  })
  const uptimeMonitor = createUptimeMonitor({
    db: database,
    config: appConfig,
    activityRepo,
  })
  const fileExplorerService = createFileExplorerService({
    projectRoot: appConfig.files.projectRoot,
    dataDir: appConfig.storage.dataDir,
    webRoot: appConfig.files.webRoot,
    allowWrite: appConfig.files.allowWrite,
  })

  const app = Fastify({
    logger: true,
    bodyLimit: 64 * 1024,
    // Only trust forwarded client IPs from a local reverse proxy.
    trustProxy: ['127.0.0.1', '::1'],
  })

  if (enableMonitor) {
    uptimeMonitor.start()
  }

  app.addHook('onClose', () => {
    uptimeMonitor.stop()
    if (!db) database.close()
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.code(400).send({ success: false, error: 'Los datos enviados no cumplen el formato esperado.' })
    }
    if (error.statusCode === 413) {
      return reply.code(413).send({ success: false, error: 'El archivo o la solicitud supera el tamaño máximo permitido.' })
    }
    if (HANDLED_CLIENT_STATUSES.has(error.statusCode)) {
      return reply.code(error.statusCode).send({ success: false, error: error.message || 'Solicitud inválida.' })
    }
    app.log.error(error)
    return reply.code(500).send({ success: false, error: 'Ocurrió un error interno. Intente más tarde.' })
  })

  app.addHook('onRequest', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  })

  const attemptsByIp = new Map()
  app.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'POST' || request.url !== '/api/contact') return
    const now = Date.now()
    if (attemptsByIp.size > 1000) {
      for (const [ip, timestamps] of attemptsByIp) {
        if (timestamps.every((timestamp) => now - timestamp >= appConfig.rateLimit.windowMs)) attemptsByIp.delete(ip)
      }
    }
    const prior = (attemptsByIp.get(request.ip) || []).filter((timestamp) => now - timestamp < appConfig.rateLimit.windowMs)
    if (prior.length >= appConfig.rateLimit.max) {
      return reply.code(429).send({ success: false, error: 'Demasiadas solicitudes. Intente más tarde.' })
    }
    prior.push(now)
    attemptsByIp.set(request.ip, prior)
  })

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
    }
  })

  app.register(contactRoutes, { config: appConfig, mailService, requestsRepo, activityRepo })
  app.register(projectsPublicRoutes, { projectsRepo, uploadService })
  app.register(authRoutes, { config: appConfig, usersRepo, sessionsRepo, activityRepo })
  app.register(adminRoutes, {
    config: appConfig,
    mailService,
    requestsRepo,
    projectsRepo,
    uploadService,
    activityRepo,
    usersRepo,
    sessionsRepo,
    systemInfoService,
    uptimeMonitor,
    fileExplorerService,
  })

  return app
}
