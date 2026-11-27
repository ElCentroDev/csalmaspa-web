import { useCallback, useEffect, useState } from 'react'
import { adminApi, formatDateTime } from './adminApi.js'

const MAX_PROJECT_IMAGES = 12

const EMPTY_FORM = {
  titulo: '',
  categoria: '',
  ubicacion: '',
  anio: '',
  resumen: '',
  contenido: '',
  imagenes: [],
  publicado: true,
}

const CATEGORY_SUGGESTIONS = [
  'Obras Civiles',
  'Fundaciones',
  'Estructuras Metálicas',
  'Hormigón Armado',
  'Edificación',
  'Remodelación',
]

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'))
    reader.readAsDataURL(file)
  })
}

function normalizeProjectGallery(project) {
  if (Array.isArray(project.imagenes) && project.imagenes.length) {
    return project.imagenes.map((img) => ({
      url: img.url,
      alt: img.alt || '',
    }))
  }
  if (project.imagen_url) {
    return [{ url: project.imagen_url, alt: project.imagen_alt || '' }]
  }
  return []
}

function AdminProjectsModule({ onDataChanged }) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ publicados: 0, borradores: 0 })
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploadProgress, setUploadProgress] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listProjects()
      setItems(data.items || [])
      if (data.counts) setCounts(data.counts)
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    adminApi
      .listProjects()
      .then((data) => {
        if (!active) return
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', text: error.message })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleFilesChange = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const remainingSlots = MAX_PROJECT_IMAGES - form.imagenes.length
    if (remainingSlots <= 0) {
      setFeedback({ type: 'error', text: `Máximo ${MAX_PROJECT_IMAGES} imágenes por proyecto.` })
      return
    }

    const queue = files.slice(0, remainingSlots)
    setFeedback(null)

    const uploadedItems = []
    for (let i = 0; i < queue.length; i += 1) {
      const file = queue[i]
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFeedback({ type: 'error', text: `"${file.name}": solo se permiten JPG, PNG o WebP.` })
        continue
      }
      if (file.size > 4 * 1024 * 1024) {
        setFeedback({ type: 'error', text: `"${file.name}" supera el máximo de 4 MB.` })
        continue
      }

      setUploadProgress(`Subiendo ${i + 1} de ${queue.length}...`)
      try {
        const dataBase64 = await readFileAsBase64(file)
        const uploaded = await adminApi.uploadImage({
          contentType: file.type,
          dataBase64,
        })
        uploadedItems.push({
          url: uploaded.url,
          alt: form.titulo || 'Registro fotográfico de proyecto CSALMA',
        })
      } catch (error) {
        setFeedback({ type: 'error', text: error.message })
      }
    }

    setUploadProgress('')
    if (uploadedItems.length) {
      setForm((prev) => ({
        ...prev,
        imagenes: [...prev.imagenes, ...uploadedItems].slice(0, MAX_PROJECT_IMAGES),
      }))
      setFeedback({
        type: 'success',
        text: `${uploadedItems.length} fotografía(s) agregada(s) a la galería.`,
      })
    }
  }

  const updateImageAlt = (index, alt) => {
    setForm((prev) => ({
      ...prev,
      imagenes: prev.imagenes.map((img, i) => (i === index ? { ...img, alt } : img)),
    }))
  }

  const moveImage = (index, targetIndex) => {
    setForm((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.imagenes.length) return prev
      const next = [...prev.imagenes]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return { ...prev, imagenes: next }
    })
  }

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index),
    }))
  }

  const buildPayload = (source) => ({
    titulo: source.titulo,
    categoria: source.categoria,
    ubicacion: source.ubicacion,
    anio: source.anio,
    resumen: source.resumen,
    contenido: source.contenido,
    imagen_url: source.imagenes[0]?.url || '',
    imagen_alt: source.imagenes[0]?.alt || '',
    imagenes: source.imagenes,
    publicado: source.publicado,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const payload = buildPayload(form)
      if (editingId) {
        await adminApi.updateProject(editingId, payload)
        setFeedback({ type: 'success', text: 'Proyecto actualizado correctamente.' })
      } else {
        await adminApi.createProject(payload)
        setFeedback({
          type: 'success',
          text: form.publicado
            ? 'Proyecto creado y publicado en el Home.'
            : 'Proyecto guardado como borrador.',
        })
      }
      resetForm()
      await loadProjects()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (project) => {
    setEditingId(project.id)
    setFeedback(null)
    setForm({
      titulo: project.titulo || '',
      categoria: project.categoria || '',
      ubicacion: project.ubicacion || '',
      anio: project.anio || '',
      resumen: project.resumen || '',
      contenido: project.contenido || '',
      imagenes: normalizeProjectGallery(project),
      publicado: Boolean(project.publicado),
    })
  }

  const handleTogglePublish = async (project) => {
    setFeedback(null)
    try {
      const gallery = normalizeProjectGallery(project)
      await adminApi.updateProject(project.id, {
        titulo: project.titulo,
        categoria: project.categoria,
        ubicacion: project.ubicacion,
        anio: project.anio,
        resumen: project.resumen,
        contenido: project.contenido,
        imagen_url: gallery[0]?.url || '',
        imagen_alt: gallery[0]?.alt || '',
        imagenes: gallery,
        publicado: !project.publicado,
      })
      setFeedback({
        type: 'success',
        text: project.publicado
          ? 'Proyecto movido a borrador (oculto del Home).'
          : 'Proyecto publicado en el Home.',
      })
      await loadProjects()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    }
  }

  const handleDelete = async (id) => {
    setFeedback(null)
    try {
      await adminApi.deleteProject(id)
      if (editingId === id) resetForm()
      setConfirmDeleteId(null)
      setFeedback({ type: 'success', text: 'Proyecto eliminado.' })
      await loadProjects()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    }
  }

  const uploading = Boolean(uploadProgress)

  return (
    <div className="admin-stack">
      {feedback ? (
        <div className={`admin-banner admin-banner--${feedback.type}`}>{feedback.text}</div>
      ) : null}

      <div className="admin-projects-layout">
        <form className="admin-card admin-project-form" onSubmit={handleSubmit}>
          <div className="admin-card-header">
            <div>
              <h2>{editingId ? 'Editar publicación de proyecto' : 'Publicar nuevo proyecto'}</h2>
              <p>
                Puedes subir varias fotografías para formar una galería; la primera será la portada en el Home.
              </p>
            </div>
            {editingId ? (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={resetForm}>
                Cancelar edición
              </button>
            ) : null}
          </div>

          <div className="admin-form-grid">
            <div className="admin-field admin-field--full">
              <label htmlFor="proj-titulo">Título del proyecto *</label>
              <input
                id="proj-titulo"
                name="titulo"
                type="text"
                className="admin-input"
                required
                maxLength={140}
                placeholder="Ej: Galpón estructural y losa industrial"
                value={form.titulo}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="proj-categoria">Categoría</label>
              <input
                id="proj-categoria"
                name="categoria"
                type="text"
                list="csalma-project-categories"
                className="admin-input"
                maxLength={80}
                placeholder="Ej: Obras Civiles"
                value={form.categoria}
                onChange={handleFieldChange}
              />
              <datalist id="csalma-project-categories">
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="admin-field">
              <label htmlFor="proj-ubicacion">Ubicación</label>
              <input
                id="proj-ubicacion"
                name="ubicacion"
                type="text"
                className="admin-input"
                maxLength={120}
                placeholder="Ej: Talca, Región del Maule"
                value={form.ubicacion}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="proj-anio">Año</label>
              <input
                id="proj-anio"
                name="anio"
                type="text"
                className="admin-input"
                maxLength={16}
                placeholder="Ej: 2026"
                value={form.anio}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field admin-field--checkbox">
              <label className="admin-checkbox-label" htmlFor="proj-publicado">
                <input
                  id="proj-publicado"
                  name="publicado"
                  type="checkbox"
                  checked={form.publicado}
                  onChange={handleFieldChange}
                />
                <span>Publicar inmediatamente en el Home</span>
              </label>
            </div>

            <div className="admin-field admin-field--full">
              <label htmlFor="proj-resumen">Resumen para tarjeta (máx. 500 caracteres) *</label>
              <textarea
                id="proj-resumen"
                name="resumen"
                className="admin-textarea"
                rows={2}
                required
                maxLength={500}
                placeholder="Descripción breve visible en la grilla principal del sitio."
                value={form.resumen}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field admin-field--full">
              <label htmlFor="proj-contenido">Descripción completa de la obra</label>
              <textarea
                id="proj-contenido"
                name="contenido"
                className="admin-textarea"
                rows={5}
                maxLength={10000}
                placeholder="Alcance técnico, soluciones ejecutadas, plazos y detalles visibles al abrir el proyecto."
                value={form.contenido}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field admin-field--full">
              <label htmlFor="proj-imagenes">
                Galería de fotografías ({form.imagenes.length}/{MAX_PROJECT_IMAGES} · JPG, PNG o WebP, máx. 4 MB c/u)
              </label>
              <div className="admin-upload-row">
                <input
                  id="proj-imagenes"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFilesChange}
                  disabled={uploading || form.imagenes.length >= MAX_PROJECT_IMAGES}
                />
                {form.imagenes.length ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={() => setForm((prev) => ({ ...prev, imagenes: [] }))}
                  >
                    Vaciar galería
                  </button>
                ) : null}
              </div>

              {uploadProgress ? <p className="admin-field-note">{uploadProgress}</p> : null}

              {form.imagenes.length ? (
                <div className="admin-gallery-grid">
                  {form.imagenes.map((img, index) => (
                    <div className="admin-gallery-item" key={`${img.url}-${index}`}>
                      <div className="admin-gallery-thumb">
                        <img src={img.url} alt={img.alt || `Fotografía ${index + 1}`} />
                        {index === 0 ? <span className="admin-gallery-cover-badge">Portada</span> : null}
                      </div>

                      <input
                        type="text"
                        className="admin-input admin-gallery-alt"
                        maxLength={180}
                        placeholder="Texto alternativo..."
                        aria-label={`Texto alternativo de la imagen ${index + 1}`}
                        value={img.alt}
                        onChange={(event) => updateImageAlt(index, event.target.value)}
                      />

                      <div className="admin-gallery-controls">
                        {index > 0 ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            onClick={() => moveImage(index, 0)}
                          >
                            Portada
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={index === 0}
                          onClick={() => moveImage(index, index - 1)}
                          aria-label="Mover imagen a la izquierda"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={index === form.imagenes.length - 1}
                          onClick={() => moveImage(index, index + 1)}
                          aria-label="Mover imagen a la derecha"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger-ghost"
                          onClick={() => removeImage(index)}
                          aria-label="Quitar imagen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="admin-form-footer">
            <span className="admin-field-note">
              {counts.publicados} publicados · {counts.borradores} borradores
            </span>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving || uploading}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar publicación'}
            </button>
          </div>
        </form>

        <section className="admin-card" aria-labelledby="projects-list-title">
          <div className="admin-card-header">
            <div>
              <h2 id="projects-list-title">Proyectos registrados ({items.length})</h2>
              <p>Administra visibilidad, galería, edición o eliminación.</p>
            </div>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={loadProjects}>
              Actualizar
            </button>
          </div>

          {loading ? (
            <p className="admin-empty">Cargando proyectos...</p>
          ) : !items.length ? (
            <p className="admin-empty">
              Todavía no has publicado proyectos desde este módulo. Completa el formulario para crear el primero.
            </p>
          ) : (
            <div className="admin-project-list">
              {items.map((project) => {
                const gallery = normalizeProjectGallery(project)
                return (
                  <article className="admin-project-row" key={project.id}>
                    <div className="admin-project-thumb">
                      {gallery[0]?.url ? (
                        <img src={gallery[0].url} alt={gallery[0].alt || project.titulo} />
                      ) : (
                        <span>Sin foto</span>
                      )}
                      {gallery.length > 1 ? (
                        <span className="admin-project-photo-count">{gallery.length} fotos</span>
                      ) : null}
                    </div>

                    <div className="admin-project-info">
                      <div className="admin-project-head">
                        <strong>{project.titulo}</strong>
                        <span
                          className={`admin-pill ${
                            project.publicado ? 'admin-pill--respondida' : 'admin-pill--archivada'
                          }`}
                        >
                          {project.publicado ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>
                      <p className="admin-project-meta">
                        {[project.categoria, project.ubicacion, project.anio].filter(Boolean).join(' · ') ||
                          'Sin categoría'}
                      </p>
                      <p className="admin-project-summary">{project.resumen}</p>
                      <div className="admin-project-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={() => handleEdit(project)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => handleTogglePublish(project)}
                        >
                          {project.publicado ? 'Pasar a borrador' : 'Publicar'}
                        </button>
                        {project.publicado ? (
                          <a
                            className="admin-btn admin-btn--ghost"
                            href="/#proyectos-publicados"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver en Home ↗
                          </a>
                        ) : null}
                        {confirmDeleteId === project.id ? (
                          <div className="admin-confirm-inline">
                            <button
                              type="button"
                              className="admin-btn admin-btn--danger"
                              onClick={() => handleDelete(project.id)}
                            >
                              Sí, eliminar
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--ghost"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger-ghost"
                            onClick={() => setConfirmDeleteId(project.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <time className="admin-project-time">
                        Actualizado: {formatDateTime(project.updated_at)}
                      </time>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminProjectsModule
