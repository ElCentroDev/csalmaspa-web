import { Link } from 'react-router-dom'

function PrivacyPage() {
  return (
    <div className="privacy-page">
      <section className="about-hero">
        <div className="container">
          <Link className="about-back-link" to="/">
            <span aria-hidden="true">←</span> Volver al inicio
          </Link>
          <p className="eyebrow eyebrow-light">Cumplimiento Normativo · Chile</p>
          <h1 className="about-hero-title">
            Política de Privacidad y Seguridad de la Información
          </h1>
          <p className="about-hero-lead">
            Tratamiento de datos personales y medidas de ciberseguridad conforme a la Ley N° 19.628,
            Ley N° 21.719 y estándares de la Ley Marco N° 21.663 de la República de Chile.
          </p>
        </div>
      </section>

      <section className="privacy-content section-wrap">
        <div className="container privacy-container">
          <article className="privacy-block">
            <h2>1. Responsable del Tratamiento</h2>
            <p>
              <strong>Construcciones CSALMA SPA</strong>, con domicilio operativo en Santiago, Chile,
              es responsable del tratamiento de los datos personales ingresados voluntariamente en
              el formulario de contacto del sitio web <strong>csalma.cl</strong>.
            </p>
          </article>

          <article className="privacy-block">
            <h2>2. Datos Recopilados y Finalidad Exclusiva</h2>
            <p>
              Únicamente solicitamos los antecedentes necesarios para evaluar técnicamente y responder
              tu solicitud de cotización o consulta de obra: nombre, empresa o mandante, correo
              electrónico, teléfono móvil, especialidad requerida y detalle del proyecto.
            </p>
            <p>
              Estos datos se utilizan <strong>exclusivamente</strong> para contacto comercial y técnico
              vinculado a tu requerimiento. No vendemos, cedemos ni transferimos bases de datos a terceros.
            </p>
          </article>

          <article className="privacy-block">
            <h2>3. Consentimiento Informado (Ley N° 19.628 / Ley N° 21.719)</h2>
            <p>
              El envío del formulario requiere tu autorización expresa mediante la casilla de
              consentimiento. Registramos la fecha y hora de dicha autorización como respaldo de
              cumplimiento normativo.
            </p>
          </article>

          <article className="privacy-block">
            <h2>4. Seguridad de la Información (Ley Marco N° 21.663)</h2>
            <ul>
              <li>Cifrado en tránsito mediante protocolo TLS/HTTPS en todas las comunicaciones.</li>
              <li>Validación estricta de entradas y sanitización contra inyección de cabeceras (Email Header Injection) y XSS.</li>
              <li>Control de origen (CORS estricto), limitación de tasa por IP con identificador hash SHA-256 (sin almacenar IPs en texto plano) y protección anti-bots.</li>
            </ul>
          </article>

          <article className="privacy-block">
            <h2>5. Derechos del Titular (ARCO)</h2>
            <p>
              En todo momento puedes ejercer tus derechos de <strong>Acceso, Rectificación, Cancelación
              (supresión) y Oposición</strong> respecto de tus datos personales escribiendo directamente a{' '}
              <a href="mailto:correo@csalma.cl">correo@csalma.cl</a> con el asunto{' '}
              <em>&ldquo;Derechos de Datos Personales — CSALMA&rdquo;</em>.
            </p>
          </article>

          <div className="about-cta-bar">
            <Link className="btn-primary" to="/#contacto">
              Ir al formulario de contacto
            </Link>
            <Link className="about-secondary-btn" to="/">
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PrivacyPage
