const processSteps = [
  {
    num: '1',
    title: '1. Asesoría y Evaluación en Terreno',
    desc: 'Comprendemos la visión del cliente, analizamos las condiciones del terreno y definimos con precisión los requerimientos estructurales del proyecto.',
    position: 'bottom',
  },
  {
    num: '2',
    title: '2. Diseño y Planificación',
    desc: 'Desarrollamos planos detallados y estrategias de construcción a medida, diseñadas específicamente para garantizar la máxima durabilidad.',
    position: 'top',
  },
  {
    num: '3',
    title: '3. Preparación y Gestión',
    desc: 'Coordinamos la validación de permisos y preparamos el terreno para la obra, asegurando un inicio de trabajo ordenado, seguro y sin contratiempos.',
    position: 'bottom',
  },
  {
    num: '4',
    title: '4. Construcción y Ejecución',
    desc: 'Empleando materiales de primera calidad y técnicas modernas, edificamos cimientos precisos, resistentes y de alta integridad estructural.',
    position: 'top',
  },
  {
    num: '5',
    title: '5. Inspección y Entrega final',
    desc: 'Realizamos rigurosos controles de calidad para certificar la seguridad y solidez del trabajo antes de hacer la entrega oficial de la obra.',
    position: 'bottom',
  },
]

function ProcessSection() {
  return (
    <section className="process-section section-wrap" id="proceso" aria-labelledby="process-title">
      <div className="container">
        <div className="section-heading process-heading-wrap">
          <div>
            <p className="eyebrow">Nuestro Proceso</p>
            <h2 id="process-title">Estructuras sólidas desde el primer día</h2>
          </div>
          <p>Cinco etapas rigurosas y coordinadas para garantizar la máxima calidad y cumplimiento en cada obra.</p>
        </div>

        {/* Línea de tiempo horizontal con etapas alternadas */}
        <div className="timeline-container">
          <div className="timeline-bar" aria-hidden="true" />
          <div className="timeline-grid">
            {processSteps.map((step) => (
              <div
                key={step.num}
                className={`timeline-col timeline-col--${step.position}`}
              >
                <article className="timeline-card">
                  <h3 className="timeline-card-title">{step.title}</h3>
                  <p className="timeline-card-desc">{step.desc}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProcessSection
