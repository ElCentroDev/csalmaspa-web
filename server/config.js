import path from 'node:path'

const parseRecipients = (value) => value.split(',').map((email) => email.trim()).filter(Boolean)

const dataDir = path.resolve(process.env.DATA_DIR || 'data')

export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  mailTransport: process.env.MAIL_TRANSPORT || 'stream',
  mailFrom: process.env.MAIL_FROM || '',
  // Fixed server-side route; may grow to a category-to-recipient map later.
  recipients: {
    default: parseRecipients(process.env.CONTACT_TO || 'contacto@csalma.cl'),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
  },
  rateLimit: {
    max: Number(process.env.RATE_LIMIT_MAX || 5),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  },
  storage: {
    // Base de datos SQLite e imágenes subidas desde el panel. Deben quedar fuera de la carpeta web pública.
    dataDir,
    databaseFile: process.env.DATABASE_FILE || path.join(dataDir, 'csalma.db'),
    uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(dataDir, 'uploads')),
  },
  admin: {
    // Sin login todavía: por defecto el panel solo responde a peticiones locales (127.0.0.1 / ::1).
    allowRemote: process.env.ADMIN_ALLOW_REMOTE === 'true',
  },
  privacy: {
    // Sal para guardar la IP de origen solo como hash (Ley N° 19.628 / 21.719).
    ipHashSalt: process.env.IP_HASH_SALT || 'csalma-local-salt',
  },
  monitor: {
    targetUrl: process.env.MONITOR_URL || 'https://csalma.cl',
    intervalMs: Number(process.env.MONITOR_INTERVAL_MS || 60000),
    timeoutMs: Number(process.env.MONITOR_TIMEOUT_MS || 5000),
    enabled: process.env.MONITOR_ENABLED !== 'false',
  },
  files: {
    projectRoot: path.resolve(process.env.PROJECT_ROOT || process.cwd()),
    webRoot: process.env.WEB_ROOT || '/var/www/csalma',
    allowWrite:
      process.env.ADMIN_FILES_WRITE !== undefined
        ? process.env.ADMIN_FILES_WRITE === 'true'
        : process.env.ADMIN_ALLOW_REMOTE !== 'true',
  },
  auth: {
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 168),
    initialAdminUser: process.env.INITIAL_ADMIN_USER || 'admin',
    initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD || 'admin',
    initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL || 'admin@csalma.cl',
  },
}
