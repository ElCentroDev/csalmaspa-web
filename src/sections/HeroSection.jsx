function HeroSection() {
  return (
    <section className="hero-section" id="inicio">
      <img className="hero-image" src="/images/estructura-metalica.jpeg" alt="Estructura metálica durante la ejecución de una obra" fetchPriority="high" />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <p className="eyebrow eyebrow-light">Obras civiles · Fundaciones · Estructuras · Chile</p>
        <h1>
          Construimos<br />
          lo que otros<br />
          no se atreven
        </h1>
        <span className="hero-rule" />
        <p className="hero-copy">Desde las fundaciones hasta la entrega, ejecutamos proyectos de construcción con precisión técnica y compromiso.</p>
        <div className="hero-actions">
          <a className="button button-light" href="#proyectos">Ver proyectos</a>
          <a className="button button-outline" href="#contacto">Solicitar cotización <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <p className="hero-caption">Construcciones Salma SPA <span>—</span> Chile</p>
    </section>
  )
}

export default HeroSection
