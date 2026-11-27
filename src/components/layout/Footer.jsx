import { Link } from 'react-router-dom'

const currentYear = new Date().getFullYear()

function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-top">

          {/* Columna marca */}
          <div>
            <div className="footer-brand">CSA<span>LMA</span></div>
            <p className="footer-desc">
              Construcciones CSALMA SPA. Obras civiles, fundaciones y estructuras
              de alta exigencia técnica en Chile.
            </p>
            <a
              href="https://wa.me/56912345678?text=Hola,%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
              className="whatsapp-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="whatsapp-dot" />
              Contactar por WhatsApp
            </a>
          </div>

          {/* Columna navegación */}
          <div>
            <p className="footer-col-title">Secciones</p>
            <nav className="footer-links" aria-label="Navegación de pie de página">
              <Link to="/quienes-somos">Quiénes somos</Link>
              <Link to="/#servicios">Servicios</Link>
              <Link to="/#obras">Obras</Link>
              <Link to="/#garantias">Garantías</Link>
              <Link to="/#contacto">Contacto</Link>
            </nav>
          </div>

          {/* Columna especialidades */}
          <div>
            <p className="footer-col-title">Especialidades</p>
            <div className="footer-links">
              <span>Construcción Integral</span>
              <span>Obras Civiles</span>
              <span>Fundaciones y Losas</span>
              <span>Mantenimiento y Renovación</span>
            </div>
          </div>

          {/* Columna contacto */}
          <div>
            <p className="footer-col-title">Contacto</p>
            <div className="footer-contact-line">
              <span>✉</span>
              <a href="mailto:correo@csalma.cl">correo@csalma.cl</a>
            </div>
            <div className="footer-contact-line">
              <span>◷</span>
              <span>Lun–Vie 09:00–18:00</span>
            </div>
            <div className="footer-contact-line">
              <span>◈</span>
              <span>Santiago, Chile</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {currentYear} Construcciones CSALMA SPA · Todos los derechos reservados ·{' '}
            <Link to="/privacidad" style={{ textDecoration: 'underline' }}>
              Política de Privacidad (Ley N° 19.628)
            </Link>
          </p>
          <p className="footer-made">OBRAS CIVILES · FUNDACIONES · ESTRUCTURAS · CHILE</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
