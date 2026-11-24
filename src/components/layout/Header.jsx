import { useState } from 'react'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogoClick = (e) => {
    closeMenu()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        <a
          className="brand"
          href="#inicio"
          onClick={handleLogoClick}
          aria-label="CSALMA — Volver al inicio"
        >
          <img
            src="/images/logo.webp"
            alt="CSALMA"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="brand-logo">CSA<span>LMA</span></span>
        </a>

        <nav
          className={`site-nav${menuOpen ? ' open' : ''}`}
          aria-label="Navegación principal"
        >
          <a href="#servicios" onClick={closeMenu}>Servicios</a>
          <a href="#obras" onClick={closeMenu}>Obras</a>
          <a href="#garantias" onClick={closeMenu}>Garantías</a>
          <a href="#contacto" onClick={closeMenu}>Contacto</a>
          <a
            href="https://wa.me/56912345678?text=Hola,%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
            className="nav-cta"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
          >
            Cotizar
          </a>
        </nav>

        <button
          className="nav-toggle"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span style={menuOpen ? { transform: 'translateY(6.5px) rotate(45deg)' } : {}} />
          <span style={menuOpen ? { opacity: 0 } : {}} />
          <span style={menuOpen ? { transform: 'translateY(-6.5px) rotate(-45deg)' } : {}} />
        </button>
      </div>
    </header>
  )
}

export default Header
