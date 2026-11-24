import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Construcciones Salma SPA, inicio">
          <span className="brand-mark" aria-hidden="true">CS</span>
          <span className="brand-name">Construcciones Salma <span>SPA</span></span>
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#servicios">Servicios</a>
          <a href="#empresa">Empresa</a>
          <a className="nav-contact" href="#contacto">Contacto</a>
        </nav>
      </div>
    </header>
  )
}

export default Header
