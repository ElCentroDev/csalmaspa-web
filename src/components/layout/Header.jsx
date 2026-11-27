import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/status', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setIsAdminLoggedIn(Boolean(data?.authenticated))
      })
      .catch(() => {
        setIsAdminLoggedIn(false)
      })

    return () => controller.abort()
  }, [pathname])

  const closeMenu = () => setMenuOpen(false)

  const handleLogoClick = (event) => {
    event.preventDefault()
    closeMenu()
    if (pathname !== '/' || hash) {
      navigate('/')
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className="site-header" role="banner">
      <div className="container header-inner">
        <a
          className="brand"
          href="/"
          onClick={handleLogoClick}
          aria-label="CSALMA — Ir a la pantalla principal"
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
          <Link
            to="/quienes-somos"
            className={pathname === '/quienes-somos' ? 'nav-link-active' : ''}
            onClick={closeMenu}
          >
            Quiénes somos
          </Link>
          <Link to="/#servicios" onClick={closeMenu}>Servicios</Link>
          <Link to="/#obras" onClick={closeMenu}>Obras</Link>
          <Link to="/#garantias" onClick={closeMenu}>Garantías</Link>
          <Link to="/#contacto" onClick={closeMenu}>Contacto</Link>
          <a
            href="https://wa.me/56912345678?text=Hola,%20me%20interesa%20solicitar%20una%20cotizaci%C3%B3n"
            className="nav-cta"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMenu}
          >
            Cotizar
          </a>
          {isAdminLoggedIn ? (
            <Link to="/admin" className="nav-admin-btn" onClick={closeMenu}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              Panel Admin
            </Link>
          ) : null}
        </nav>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
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
