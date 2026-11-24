const projects = [
  { title: 'Fundaciones', type: 'Obra civil', image: '/images/fundaciones.jpeg', alt: 'Trabajos de enfierradura y fundaciones en obra' },
  { title: 'Montaje estructural', type: 'Estructuras', image: '/images/estructura-metalica.jpeg', alt: 'Montaje de estructura metálica en una obra' },
  { title: 'Ejecución en terreno', type: 'Construcción', image: '/images/obra-industrial.jpeg', alt: 'Ejecución de estructura de hormigón y acero' },
  { title: 'Preparación de obra', type: 'Fundaciones', image: '/images/obra-civil.jpeg', alt: 'Preparación de fundaciones para una obra' },
]

function ProjectsSection() {
  return (
    <section className="projects-section section-wrap" id="proyectos">
      <div className="container">
        <div className="section-heading projects-heading">
          <div>
            <p className="eyebrow">Trabajo en terreno</p>
            <h2>Nuestra experiencia y proyectos</h2>
          </div>
          <p>Una selección de registros de obras y procesos constructivos.</p>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => (
            <figure className={`project-card project-card-${index + 1}`} key={project.image}>
              <img src={project.image} alt={project.alt} loading="lazy" />
              <figcaption>
                <span>{project.type}</span>
                <strong>{project.title}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProjectsSection
