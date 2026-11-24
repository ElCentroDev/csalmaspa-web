function AboutSection() {
  return (
    <section className="about-section section-wrap" id="empresa">
      <div className="container about-grid">
        <div className="about-copy">
          <p className="eyebrow">Construcción integral y eficiente</p>
          <h2>Precisión técnica en cada etapa de la obra</h2>
          <p>La planificación, la coordinación de especialidades y la supervisión en terreno permiten abordar cada proyecto con una mirada integral.</p>
          <p>Trabajamos junto al mandante para organizar la ejecución y mantener una comunicación clara durante el desarrollo de la obra.</p>
          <a className="text-link" href="#servicios">Conoce nuestros servicios <span aria-hidden="true">↗</span></a>
        </div>
        <figure className="about-image-wrap">
          <img src="/images/obra-industrial.jpeg" alt="Equipo trabajando en una estructura de hormigón y acero" loading="lazy" />
          <figcaption><span>01</span> Planificación y ejecución en terreno</figcaption>
        </figure>
      </div>
    </section>
  )
}

export default AboutSection
