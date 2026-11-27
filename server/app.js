import Fastify from 'fastify'
import { config } from './config.js'
import contactRoutes from './routes/contact.js'
import { createMailService } from './services/mailService.js'

export function buildApp({ appConfig = config, mailService = createMailService(appConfig) } = {}) {
  const app = Fastify({
    logger: true,
    bodyLimit: 64 * 1024,
    // Only trust forwarded client IPs from a local reverse proxy.
    trustProxy: ['127.0.0.1', '::1'],
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.code(400).send({ success: false, error: 'Los datos enviados no cumplen el formato esperado.' })
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

  app.register(contactRoutes, { config: appConfig, mailService })
  return app
}
