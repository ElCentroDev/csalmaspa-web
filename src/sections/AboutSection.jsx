import { Link } from 'react-router-dom'

function AboutSection() {
  return (
    <section className="about-section section-wrap" id="empresa" aria-labelledby="about-title">
      <div className="container about-grid">
        <div className="about-copy">
          <p className="eyebrow">Construcciones CSALMA SPA · Chile</p>
          <h2 id="about-title">Precisión técnica en cada etapa de la obra</h2>
          <p>
            En <strong>Construcciones CSALMA SPA</strong> ejecutamos obras civiles, fundaciones,
            estructuras y construcción integral con planificación formal, supervisión residente en
            terreno y materiales certificados bajo normativa sísmica.
          </p>
          <p>
            Trabajamos junto al mandante desde la cubicación inicial hasta la entrega final,
            asegurando presupuesto cerrado, cumplimiento de plazos y comunicación directa en cada
            etapa del proyecto.
          </p>
          <div className="about-actions-row">
            <a className="btn-primary" href="#contacto">
              Solicitar cotización <span aria-hidden="true">→</span>
            </a>
            <Link className="text-link" to="/quienes-somos">
              Conoce quiénes somos <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <figure className="about-image-wrap">
          <img
            src="/images/obra-industrial.jpeg"
            alt="Equipo trabajando en una estructura de hormigón y acero"
            loading="lazy"
          />
          <figcaption>
            <span>01</span> Planificación y ejecución en terreno
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

export default AboutSection
