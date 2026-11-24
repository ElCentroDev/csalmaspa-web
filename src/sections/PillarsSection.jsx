import { useEffect, useRef } from 'react'

const PILLARS = [
  {
    num: '01',
    title: 'Presupuesto Transparente y Cerrado',
    desc: 'Elaboramos cubicaciones detalladas partida por partida antes de entrar a faena. Eliminamos las sorpresas y sobrecostos durante la obra. El mandante conoce el costo real desde el día uno.',
    tag: 'Cero costos ocultos',
  },
  {
    num: '02',
    title: 'Cumplimiento Estricto de Carta Gantt',
    desc: 'Planificación metódica con programación Gantt formal, hitos de avance claros e informes periódicos de avance. Tu proyecto avanza en los plazos comprometidos sin retrasos injustificados.',
    tag: 'Hitos garantizados',
  },
  {
    num: '03',
    title: 'Supervisión Permanente en Terreno',
    desc: 'Jefes de proyecto y profesionales residentes en faena velando continuamente por los estándares de calidad, seguridad laboral y correcta ejecución de cada especialidad.',
    tag: 'Profesionales residentes',
  },
  {
    num: '04',
    title: 'Materiales Certificados (Norma Sísmica)',
    desc: 'Trazabilidad y control en cada partida crítica. Empleo exclusivo de hormigones ensayados y aceros estructurales que cumplen con la estricta normativa sísmica chilena (NCh433 / NCh2123).',
    tag: 'Trazabilidad y ensayos',
  },
  {
    num: '05',
    title: 'Garantía Post-Venta y Recepción Conforme',
    desc: 'Inspección técnica rigurosa previa a la entrega. Entregamos respaldo legal formal y soporte post-entrega para resolver cualquier observación con prontitud y seriedad.',
    tag: 'Respaldo legal formal',
  },
]

function PillarsSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll('.fade-target').forEach((item, index) => {
            setTimeout(() => {
              item.classList.add('visible')
            }, index * 80)
          })
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="pillars-section" id="garantias" ref={sectionRef} aria-labelledby="pillars-title">
      <div className="container">
        <div className="pillars-layout">

          {/* Columna Izquierda: Encabezado y Respaldo */}
          <div className="pillars-left fade-target">
            <span className="label label--dark">Respaldo y Formalidad</span>
            <h2 className="pillars-title" id="pillars-title">
              Por qué construir<br />
              con <em>CSALMA</em>
            </h2>
            <p className="pillars-subtitle">
              Cinco compromisos contractuales y técnicos que garantizan la solidez
              de tu estructura y la tranquilidad de tu inversión.
            </p>

            <div className="pillars-highlight-card">
              <span className="pillars-highlight-badge">Compromiso CSALMA</span>
              <p className="pillars-highlight-text">
                "No concebimos una obra sin rigurosidad técnica ni cumplimiento exacto
                de plazos. Cada proyecto es un compromiso formal con el mandante."
              </p>
              <div className="pillars-highlight-author">
                <strong>Gerencia Técnica</strong> · CSALMA SPA
              </div>
            </div>

            <a
              href="https://wa.me/56912345678?text=Hola,%20quisiera%20conocer%20las%20garant%C3%ADas%20y%20alcance%20de%20CSALMA"
              className="btn-primary"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: '24px' }}
            >
              Consultar alcances y garantías
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Columna Derecha: Tarjetas de Pilares */}
          <div className="pillars-right">
            {PILLARS.map((p) => (
              <article key={p.num} className="pillar-card fade-target">
                <div className="pillar-card-header">
                  <span className="pillar-number">{p.num}</span>
                  <span className="pillar-tag">{p.tag}</span>
                </div>
                <h3 className="pillar-heading">{p.title}</h3>
                <p className="pillar-desc">{p.desc}</p>
              </article>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

export default PillarsSection
