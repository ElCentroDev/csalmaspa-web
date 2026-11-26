const services = [
  {
    number: '01',
    title: 'Construcción integral',
    description:
      'Ejecución completa de viviendas, edificaciones y obras civiles desde el trazado inicial hasta la entrega conforme.',
    image: '/images/obra-civil.jpeg',
    alt: 'Obra civil en etapa de fundaciones',
  },
  {
    number: '02',
    title: 'Mantenimiento y renovación',
    description:
      'Habilitación, ampliación y remodelación de espacios comerciales, industriales o residenciales para extender su vida útil.',
    image: '/images/obra-industrial.jpeg',
    alt: 'Trabajo de construcción en una estructura existente',
  },
  {
    number: '03',
    title: 'Obras civiles y estructuras',
    description:
      'Fundaciones, radieres, losas, muros de hormigón armado y montaje de estructuras metálicas bajo norma sísmica.',
    image: '/images/fundaciones.jpeg',
    alt: 'Armado de enfierradura para fundaciones',
  },
]

function ServicesSection() {
  return (
    <section className="services-section section-wrap" id="servicios">
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Soluciones para tu proyecto</p>
            <h2>Servicios de construcción</h2>
          </div>
          <p>Coordinación y ejecución de especialidades desde la cubicación inicial hasta el trabajo en terreno.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.number}>
              <div className="service-image">
                <img src={service.image} alt={service.alt} loading="lazy" />
                <span className="service-index">{service.number}</span>
              </div>
              <div className="service-card-content">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="#contacto" aria-label={`Consultar por ${service.title}`}>
                  Consultar servicio <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ServicesSection
