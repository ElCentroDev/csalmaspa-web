function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <a href="/#inicio" aria-label="Construcciones Salma SPA, inicio">
            <img src="/images/salma-logo.jpeg" width="168" height="60" alt="Construcciones Salma SPA" loading="lazy" />
          </a>
          <p>Construcciones Salma SPA</p>
        </div>
        <nav aria-label="Enlaces del pie de página">
          <a href="/#empresa">Empresa</a>
          <a href="/#servicios">Servicios</a>
          <a href="/#proyectos">Proyectos</a>
          <a href="/#contacto">Contacto</a>
        </nav>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Construcciones Salma SPA</p>
        <a href="/#inicio">Volver arriba ↑</a>
      </div>
    </footer>
  )
}

export default Footer
