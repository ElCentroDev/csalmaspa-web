import { useEffect, useState } from 'react'

const projects = [
  {
    title: 'Edificación y Muros Estructurales',
    type: 'Obras Civiles · Hormigón Armado',
    image: '/images/obra-muros-losa.jpeg',
    alt: 'Edificación y muros estructurales durante faena de construcción',
  },
  {
    title: 'Armaduras y Enfierradura',
    type: 'Estructuras',
    image: '/images/obra-enfierradura.jpeg',
    alt: 'Montaje de enfierradura estructural en terreno',
  },
  {
    title: 'Vaciado y Hormigonado',
    type: 'Control de Calidad',
    image: '/images/obra-hormigonado.jpeg',
    alt: 'Hormigonado en terreno bajo estricta norma sísmica',
  },
  {
    title: 'Fundaciones y Excavación',
    type: 'Fundaciones',
    image: '/images/obra-fundaciones.jpeg',
    alt: 'Etapa inicial de fundaciones y trazado en obra civil',
  },
]

function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    if (!selectedProject) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedProject(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedProject])

  return (
    <section className="projects-section section-wrap" id="obras" aria-labelledby="projects-title">
      <span id="proyectos" style={{ display: 'block', position: 'relative', top: '-100px', visibility: 'hidden' }} />
      <div className="container">
        <div className="section-heading projects-heading">
          <div>
            <p className="eyebrow">Registro en terreno</p>
            <h2 id="projects-title">Nuestra experiencia y proyectos</h2>
          </div>
          <p>Una selección de registros de obras, estructuras y procesos constructivos ejecutados por CSALMA. Haz clic en una obra para ampliarla.</p>
        </div>
        <div className="project-bento-grid">
          {projects.map((project, index) => (
            <figure
              className={`project-bento-card project-bento-card-${index + 1}`}
              key={project.image}
              role="button"
              tabIndex={0}
              aria-label={`Ampliar imagen de ${project.title}`}
              onClick={() => setSelectedProject(project)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedProject(project)
                }
              }}
            >
              <img src={project.image} alt={project.alt} loading="lazy" />
              <figcaption>
                <span>{project.type}</span>
                <strong>{project.title}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {selectedProject && (
        <div
          className="project-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selectedProject.title}
          onClick={() => setSelectedProject(null)}
        >
          <div className="project-lightbox-content">
            <button
              type="button"
              className="project-lightbox-close"
              aria-label="Cerrar vista ampliada"
              onClick={() => setSelectedProject(null)}
            >
              ✕
            </button>
            <img src={selectedProject.image} alt={selectedProject.alt} />
            <div className="project-lightbox-caption">
              <span>{selectedProject.type}</span>
              <strong>{selectedProject.title}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectsSection
