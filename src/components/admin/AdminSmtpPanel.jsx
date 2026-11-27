function AdminSmtpPanel({ overview }) {
  if (!overview) return null

  const { smtp, admin } = overview
  const smtpReady = smtp.transport === 'smtp' && smtp.configured

  return (
    <div className="admin-stack">
      <section className="admin-card" aria-labelledby="smtp-status-title">
        <div className="admin-card-header">
          <div>
            <h2 id="smtp-status-title">Configuración de correo y SMTP</h2>
            <p>
              Estado de la cuenta de envío conectada al formulario web y al compositor de respuestas del panel.
            </p>
          </div>
          <span className={`admin-pill ${smtpReady ? 'admin-pill--respondida' : 'admin-pill--nueva'}`}>
            {smtpReady ? 'SMTP conectado' : 'Modo prueba (stream)'}
          </span>
        </div>

        <dl className="admin-meta-grid">
          <div>
            <dt>Transporte activo</dt>
            <dd>{smtp.transport}</dd>
          </div>
          <div>
            <dt>Correo receptor (CONTACT_TO)</dt>
            <dd>{smtp.contactTo?.join(', ') || 'No definido'}</dd>
          </div>
          <div>
            <dt>Remitente (MAIL_FROM)</dt>
            <dd>{smtp.mailFrom || 'No configurado aún'}</dd>
          </div>
          <div>
            <dt>Servidor SMTP y puerto</dt>
            <dd>{smtp.host}:{smtp.port}</dd>
          </div>
          <div>
            <dt>Acceso al panel</dt>
            <dd>{admin.allowRemote ? 'Remoto habilitado (ADMIN_ALLOW_REMOTE=true)' : 'Solo local (127.0.0.1)'}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-card" aria-labelledby="smtp-guide-title">
        <div className="admin-card-header">
          <div>
            <h2 id="smtp-guide-title">Pasos para activar Google Workspace SMTP</h2>
            <p>Las contraseñas nunca se guardan en el código ni en el repositorio.</p>
          </div>
        </div>

        <ol className="admin-steps-list">
          <li>
            En la cuenta de Google Workspace de <code>csalma.cl</code>, activa la verificación en dos pasos y genera una <strong>Contraseña de aplicación</strong>.
          </li>
          <li>
            Copia <code>.env.example</code> a <code>.env.local</code> (fuera de Git) y completa:
            <pre className="admin-code-block">{`MAIL_TRANSPORT=smtp
MAIL_FROM=CSALMA <tu-correo@csalma.cl>
CONTACT_TO=tu-correo@csalma.cl
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@csalma.cl
SMTP_PASSWORD=clave-de-aplicacion`}</pre>
          </li>
          <li>
            Reinicia el backend Node (<code>npm run dev:server</code> en desarrollo o el servicio del servidor en producción). A partir de ese momento las nuevas solicitudes y todas las respuestas enviadas desde este panel saldrán por SMTP real.
          </li>
        </ol>
      </section>
    </div>
  )
}

export default AdminSmtpPanel
