const services = [
  { number: '01', title: 'Construcción', description: 'Soluciones constructivas planificadas para cada proyecto.' },
  { number: '02', title: 'Obras y proyectos', description: 'Coordinación y ejecución con foco en calidad y seguridad.' },
  { number: '03', title: 'Asesoría', description: 'Acompañamiento para definir los próximos pasos de tu proyecto.' },
]

function ServicesSection() {
  return (
    <section className="section container" id="servicios">
      <div className="section-heading">
        <p className="eyebrow">Lo que hacemos</p>
        <h2>Servicios</h2>
      </div>
      <div className="service-grid">
        {services.map((service) => (
          <article className="service-card" key={service.number}>
            <span className="service-number">{service.number}</span>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ServicesSection
