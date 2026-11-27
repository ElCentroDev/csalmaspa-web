import { useEffect, useState } from 'react'

function getProjectImages(project) {
  if (!project) return []
  if (Array.isArray(project.imagenes) && project.imagenes.length) {
    return project.imagenes
  }
  if (project.imagen_url) {
    return [{ url: project.imagen_url, alt: project.imagen_alt || project.titulo }]
  }
  return []
}

function PublishedProjectsSection() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/proyectos', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload && Array.isArray(payload.items)) {
          setItems(payload.items)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected])

  if (!items.length) return null

  const openProject = async (project) => {
    setSelected(project)
    setActiveImageIndex(0)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/proyectos/${encodeURIComponent(project.slug)}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.item) setSelected(data.item)
      }
    } catch {
      // Mantiene los datos básicos ya cargados en la tarjeta.
    } finally {
      setLoadingDetail(false)
    }
  }

  const paragraphs = selected?.contenido
    ? selected.contenido
        .split(/\n\s*\n/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
    : []

  const modalImages = getProjectImages(selected)
  const currentModalImg = modalImages[activeImageIndex] || modalImages[0] || null

  return (
    <section
      className="published-projects-section section-wrap"
      id="proyectos-publicados"
      aria-labelledby="published-projects-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Proyectos</p>
            <h2 id="published-projects-title">Proyectos publicados</h2>
          </div>
          <p>
            Publicaciones recientes de obras, estructuras y ejecuciones incorporadas por el equipo de CSALMA.
          </p>
        </div>

        <div className="published-projects-grid">
          {items.map((project) => {
            const gallery = getProjectImages(project)
            const cover = gallery[0]
            const meta = [project.ubicacion, project.anio].filter(Boolean).join(' · ')
            return (
              <article className="published-project-card" key={project.id}>
                <button
                  type="button"
                  className="published-project-trigger"
                  onClick={() => openProject(project)}
                  aria-label={`Ver detalle de ${project.titulo}`}
                >
                  <div className="published-project-media">
                    {cover ? (
                      <img
                        src={cover.url}
                        alt={cover.alt || project.titulo}
                        loading="lazy"
                      />
                    ) : (
                      <div className="published-project-placeholder" aria-hidden="true">
                        <span>CSALMA</span>
                      </div>
                    )}
                    {project.categoria ? (
                      <span className="published-project-badge">{project.categoria}</span>
                    ) : null}
                    {gallery.length > 1 ? (
                      <span className="published-project-count-pill">{gallery.length} fotos</span>
                    ) : null}
                  </div>

                  <div className="published-project-body">
                    {meta ? <p className="published-project-meta">{meta}</p> : null}
                    <h3>{project.titulo}</h3>
                    <p className="published-project-summary">{project.resumen}</p>
                    <span className="published-project-cta">
                      Ver proyecto <span>→</span>
                    </span>
                  </div>
                </button>
              </article>
            )
          })}
        </div>
      </div>

      {selected && (
        <div
          className="published-project-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="published-modal-title"
          onClick={() => setSelected(null)}
        >
          <article
            className="published-project-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="project-lightbox-close"
              aria-label="Cerrar detalle del proyecto"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>

            {currentModalImg ? (
              <div className="published-modal-gallery">
                <div className="published-project-modal-media">
                  <img
                    src={currentModalImg.url}
                    alt={currentModalImg.alt || selected.titulo}
                  />
                  {modalImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="published-modal-nav published-modal-nav--prev"
                        aria-label="Imagen anterior"
                        onClick={() =>
                          setActiveImageIndex((idx) => (idx - 1 + modalImages.length) % modalImages.length)
                        }
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="published-modal-nav published-modal-nav--next"
                        aria-label="Siguiente imagen"
                        onClick={() =>
                          setActiveImageIndex((idx) => (idx + 1) % modalImages.length)
                        }
                      >
                        ›
                      </button>
                      <span className="published-modal-counter">
                        {activeImageIndex + 1} / {modalImages.length}
                      </span>
                    </>
                  ) : null}
                </div>

                {modalImages.length > 1 ? (
                  <div className="published-modal-thumbs" role="list" aria-label="Miniaturas del proyecto">
                    {modalImages.map((img, idx) => (
                      <button
                        key={`${img.url}-${idx}`}
                        type="button"
                        className={`published-modal-thumb${idx === activeImageIndex ? ' is-active' : ''}`}
                        aria-label={`Ver fotografía ${idx + 1}`}
                        onClick={() => setActiveImageIndex(idx)}
                      >
                        <img src={img.url} alt={img.alt || `Vista ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="published-project-modal-body">
              <div className="published-project-modal-tags">
                {selected.categoria ? (
                  <span className="published-project-badge published-project-badge--inline">
                    {selected.categoria}
                  </span>
                ) : null}
                {[selected.ubicacion, selected.anio].filter(Boolean).length ? (
                  <span className="published-project-meta">
                    {[selected.ubicacion, selected.anio].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </div>

              <h3 id="published-modal-title">{selected.titulo}</h3>
              <p className="published-project-modal-lead">{selected.resumen}</p>

              {loadingDetail && !paragraphs.length ? (
                <p className="published-project-modal-loading">Cargando ficha del proyecto...</p>
              ) : (
                paragraphs.map((paragraph, index) => (
                  <p className="published-project-modal-text" key={index}>
                    {paragraph}
                  </p>
                ))
              )}

              <div className="published-project-modal-footer">
                <a
                  href="#contacto"
                  className="button button-light"
                  onClick={() => setSelected(null)}
                >
                  Cotizar un proyecto similar <span>→</span>
                </a>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  )
}

export default PublishedProjectsSection
