import nodemailer from 'nodemailer'

export function createMailService(config) {
  const isSmtpConfigured =
    config.mailTransport === 'smtp' &&
    Boolean(config.smtp.user && config.smtp.password && config.mailFrom)

  const transporter =
    config.mailTransport === 'smtp'
      ? nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: { user: config.smtp.user, pass: config.smtp.password },
        })
      : nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })

  const defaultFrom = config.mailFrom || config.recipients.default[0] || 'contacto@csalma.cl'

  return {
    mode: config.mailTransport,
    isSmtpConfigured,

    async sendContact({ recipient, data }) {
      const subject = `Nueva consulta web CSALMA: ${data.especialidad || 'Contacto general'} - ${data.nombre}`
      const text = [
        `Nombre: ${data.nombre}`,
        `Empresa: ${data.empresa || 'No indicada'}`,
        `Correo: ${data.email}`,
        `Teléfono: ${data.telefono}`,
        `Especialidad: ${data.especialidad || 'No indicada'}`,
        '',
        'Detalle:',
        data.detalle,
      ].join('\n')

      return transporter.sendMail({
        from: defaultFrom,
        to: recipient,
        replyTo: { name: data.nombre, address: data.email },
        subject,
        text,
      })
    },

    async sendReply({ to, recipientName, subject, message, originalData }) {
      const replyAddress = config.recipients.default[0] || undefined
      const submittedDate = originalData?.created_at
        ? new Date(originalData.created_at).toLocaleString('es-CL')
        : ''
      const text = [
        message.trim(),
        '',
        '---',
        'Construcciones CSALMA SPA',
        'https://csalma.cl',
        '',
        'Referencia de su solicitud:',
        originalData?.especialidad ? `Especialidad: ${originalData.especialidad}` : null,
        submittedDate ? `Fecha de envío: ${submittedDate}` : null,
        originalData?.detalle ? `Detalle original:\n${originalData.detalle}` : null,
      ]
        .filter((line) => line !== null)
        .join('\n')

      return transporter.sendMail({
        from: defaultFrom,
        to: recipientName ? { name: recipientName, address: to } : to,
        replyTo: replyAddress,
        subject,
        text,
      })
    },
  }
}
