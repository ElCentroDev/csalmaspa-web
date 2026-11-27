import { buildApp } from './app.js'
import { config } from './config.js'

if (!['stream', 'smtp'].includes(config.mailTransport)) {
  throw new Error('MAIL_TRANSPORT debe ser stream o smtp')
}
if (process.env.NODE_ENV === 'production' && config.mailTransport !== 'smtp') {
  throw new Error('En producción, MAIL_TRANSPORT=smtp es obligatorio para evitar aceptar correos sin enviarlos.')
}
if (config.mailTransport === 'smtp' && (!config.smtp.user || !config.smtp.password || !config.mailFrom)) {
  throw new Error('MAIL_FROM, SMTP_USER y SMTP_PASSWORD son obligatorios cuando MAIL_TRANSPORT=smtp')
}

const app = buildApp()

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
