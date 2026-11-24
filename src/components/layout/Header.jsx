import { useState } from 'react'
import { Link } from 'react-router-dom'

const navigation = [
  ['servicios', 'Servicios'],
  ['proceso', 'Proceso'],
  ['proyectos', 'Proyectos'],
  ['empresa', 'Empresa'],
]

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Construcciones Salma SPA, inicio">
          <img src="/images/salma-logo.jpeg" width="168" height="60" alt="Construcciones Salma SPA" />
        </Link>
        <button
          className={`menu-toggle${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav className={`site-nav${menuOpen ? ' is-open' : ''}`} id="site-navigation" aria-label="Navegación principal">
          {navigation.map(([id, label]) => (
            <a href={`/#${id}`} key={id} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <a className="nav-cta" href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
        </nav>
      </div>
    </header>
  )
}

export default Header
