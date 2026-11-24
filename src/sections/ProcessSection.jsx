const stages = [
  { number: '01', title: 'Planificación', description: 'Definición de alcance, etapas y coordinación inicial del proyecto.' },
  { number: '02', title: 'Ejecución', description: 'Organización de especialidades y seguimiento de los trabajos en terreno.' },
  { number: '03', title: 'Entrega', description: 'Revisión final de los trabajos y cierre de las etapas acordadas.' },
]

function ProcessSection() {
  return (
    <section className="process-section section-wrap" id="proceso">
      <div className="container process-layout">
        <div className="process-heading">
          <p className="eyebrow">Nuestro proceso</p>
          <h2>Estructuras sólidas desde el primer día</h2>
          <p>Planificación y ejecución detallada en cada etapa del proyecto.</p>
        </div>
        <div className="process-list">
          {stages.map((stage) => (
            <article className="process-step" key={stage.number}>
              <span>{stage.number}</span>
              <div><h3>{stage.title}</h3><p>{stage.description}</p></div>
              <span className="process-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProcessSection
