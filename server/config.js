const parseRecipients = (value) => value.split(',').map((email) => email.trim()).filter(Boolean)

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
}
