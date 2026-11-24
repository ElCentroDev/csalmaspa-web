const reasons = [
  { number: '01', title: 'Presupuesto transparente', description: 'Alcances y partidas definidos para contar con claridad desde el inicio.' },
  { number: '02', title: 'Planificación de obra', description: 'Organización de etapas y seguimiento del cronograma del proyecto.' },
  { number: '03', title: 'Supervisión en terreno', description: 'Coordinación técnica y revisión de los trabajos durante la ejecución.' },
]

function ReasonsSection() {
  return (
    <section className="reasons-section section-wrap">
      <div className="container">
        <div className="reasons-heading">
          <p className="eyebrow eyebrow-light">Respaldo y formalidad</p>
          <h2>Una forma clara de construir</h2>
          <p>Planificación, coordinación y seguimiento en cada etapa.</p>
        </div>
        <div className="reasons-grid">
          {reasons.map((reason) => (
            <article className="reason-card" key={reason.number}>
              <span>{reason.number}</span>
              <h3>{reason.title}</h3>
              <p>{reason.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ReasonsSection
