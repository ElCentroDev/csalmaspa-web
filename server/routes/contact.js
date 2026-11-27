import crypto from 'node:crypto'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+56\s?9(?:\s?\d){8}$/

const contactSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['nombre', 'email', 'telefono', 'detalle', 'consentimiento'],
    properties: {
      nombre: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[^\\r\\n]+$' },
      empresa: { type: 'string', maxLength: 120 },
      email: { type: 'string', minLength: 3, maxLength: 120, format: 'email' },
      telefono: { type: 'string', minLength: 1, maxLength: 30 },
      especialidad: { type: 'string', maxLength: 150, pattern: '^[^\\r\\n]*$' },
      detalle: { type: 'string', minLength: 1, maxLength: 3000 },
      consentimiento: { type: 'boolean', const: true },
      website_trap: { type: 'string', maxLength: 200 },
    },
  },
}

function hashIp(ip, salt) {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${ip || ''}`)
    .digest('hex')
    .slice(0, 32)
}

export default async function contactRoutes(fastify, { config, mailService, requestsRepo, activityRepo }) {
  fastify.post('/api/contact', { schema: contactSchema }, async (request, reply) => {
    const data = Object.fromEntries(
      Object.entries(request.body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    )

    if (data.website_trap) return { success: true }

    if (!data.nombre || !data.email || !data.telefono || !data.detalle) {
      return reply.code(422).send({ success: false, error: 'Complete los campos obligatorios.' })
    }
    if (!emailPattern.test(data.email)) {
      return reply.code(422).send({ success: false, error: 'Ingrese un correo electrónico válido.' })
    }
    if (!phonePattern.test(data.telefono)) {
      return reply.code(422).send({ success: false, error: 'Ingrese el formato correcto (+56 9 XXXX XXXX).' })
    }

    const ipHash = hashIp(request.ip, config.privacy.ipHashSalt)
    const id = requestsRepo.create({ ...data, ipHash })

    if (activityRepo) {
      activityRepo.record({
        modulo: 'solicitudes',
        accion: 'nueva_solicitud',
        descripcion: `Nueva solicitud de ${data.nombre}${data.especialidad ? ` (${data.especialidad})` : ''}.`,
        actor: 'Formulario Web',
      })
    }

    const recipient = config.recipients.default
    if (!recipient?.length) {
      request.log.error('No hay destinatario configurado para el formulario de contacto')
      requestsRepo.setNoticeState(id, 'error')
      return { success: true, id }
    }

    try {
      await mailService.sendContact({ recipient, data })
      requestsRepo.setNoticeState(id, config.mailTransport === 'smtp' ? 'enviado' : 'simulado')
    } catch (error) {
      request.log.error({ err: error }, 'No se pudo enviar el correo de contacto')
      requestsRepo.setNoticeState(id, 'error')
    }

    return { success: true, id }
  })
}
