import nodemailer from 'nodemailer'

export function createMailService(config) {
  const transporter = config.mailTransport === 'smtp'
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: { user: config.smtp.user, pass: config.smtp.password },
      })
    : nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })

  return {
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
        from: config.mailFrom,
        to: recipient,
        replyTo: { name: data.nombre, address: data.email },
        subject,
        text,
      })
    },
  }
}
