import { useCallback, useEffect, useState } from 'react'
import { adminApi, buildWhatsAppUrl, exportRequestsCsv, formatDateTime } from './adminApi.js'

const STATUS_OPTIONS = [
  { value: 'nueva', label: 'Nueva' },
  { value: 'leida', label: 'Leída' },
  { value: 'respondida', label: 'Respondida' },
  { value: 'archivada', label: 'Archivada' },
]

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS.map((item) => [item.value, item.label]))

const NOTICE_LABELS = {
  enviado: 'Correo enviado',
  simulado: 'Simulado (stream)',
  error: 'Error correo',
  pendiente: 'Pendiente',
}

function AdminRequestsModule({ initialSelectedId, onClearInitialSelection, onDataChanged }) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ nueva: 0, leida: 0, respondida: 0, archivada: 0, total: 0 })
  const [estadoFilter, setEstadoFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState(initialSelectedId || null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [editEstado, setEditEstado] = useState('nueva')
  const [editNotas, setEditNotas] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

  const [replyAsunto, setReplyAsunto] = useState('')
  const [replyMensaje, setReplyMensaje] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const loadList = useCallback(async () => {
    setLoadingList(true)
    setListError('')
    try {
      const data = await adminApi.listRequests({ estado: estadoFilter, q: searchQuery })
      setItems(data.items || [])
      if (data.counts) setCounts(data.counts)
    } catch (error) {
      setListError(error.message)
    } finally {
      setLoadingList(false)
    }
  }, [estadoFilter, searchQuery])

  useEffect(() => {
    let active = true
    adminApi
      .listRequests({ estado: estadoFilter, q: searchQuery })
      .then((data) => {
        if (!active) return
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
        setListError('')
      })
      .catch((error) => {
        if (active) setListError(error.message)
      })
      .finally(() => {
        if (active) setLoadingList(false)
      })
    return () => {
      active = false
    }
  }, [estadoFilter, searchQuery])

  const openDetail = useCallback(
    async (id, { silentFeedback = false } = {}) => {
      if (!id) return
      setSelectedId(id)
      setConfirmDelete(false)
      if (!silentFeedback) setFeedback(null)
      setLoadingDetail(true)
      try {
        const data = await adminApi.getRequest(id)
        const item = data.item
        setDetail(item)
        setEditEstado(item.estado)
        setEditNotas(item.notas || '')
        setReplyAsunto(
          `Re: Cotización CSALMA — ${item.especialidad || 'Consulta web'}`,
        )
        setReplyMensaje(
          `Estimado/a ${item.nombre},\n\nGracias por comunicarte con Construcciones CSALMA SPA respecto a tu solicitud${
            item.especialidad ? ` de ${item.especialidad}` : ''
          }.\n\n`,
        )
        setItems((prev) =>
          prev.map((row) => (row.id === id && row.estado === 'nueva' ? { ...row, estado: 'leida' } : row)),
        )
        adminApi
          .getOverview()
          .then((ov) => {
            if (ov?.solicitudes) setCounts(ov.solicitudes)
          })
          .catch(() => {})
        if (onDataChanged) onDataChanged()
      } catch (error) {
        setFeedback({ type: 'error', text: error.message })
      } finally {
        setLoadingDetail(false)
      }
    },
    [onDataChanged],
  )

  useEffect(() => {
    if (!initialSelectedId) return
    let active = true
    adminApi
      .getRequest(initialSelectedId)
      .then((data) => {
        if (!active) return
        const item = data.item
        setSelectedId(initialSelectedId)
        setConfirmDelete(false)
        setFeedback(null)
        setDetail(item)
        setEditEstado(item.estado)
        setEditNotas(item.notas || '')
        setReplyAsunto(`Re: Cotización CSALMA — ${item.especialidad || 'Consulta web'}`)
        setReplyMensaje(
          `Estimado/a ${item.nombre},\n\nGracias por comunicarte con Construcciones CSALMA SPA respecto a tu solicitud${
            item.especialidad ? ` de ${item.especialidad}` : ''
          }.\n\n`,
        )
        setItems((prev) =>
          prev.map((row) =>
            row.id === initialSelectedId && row.estado === 'nueva' ? { ...row, estado: 'leida' } : row,
          ),
        )
        adminApi
          .getOverview()
          .then((ov) => {
            if (ov?.solicitudes) setCounts(ov.solicitudes)
          })
          .catch(() => {})
        if (onDataChanged) onDataChanged()
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', text: error.message })
      })
      .finally(() => {
        if (active && onClearInitialSelection) onClearInitialSelection()
      })
    return () => {
      active = false
    }
  }, [initialSelectedId, onClearInitialSelection, onDataChanged])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const handleSaveMeta = async (event) => {
    event.preventDefault()
    if (!detail) return
    setSavingMeta(true)
    setFeedback(null)
    try {
      const data = await adminApi.updateRequest(detail.id, {
        estado: editEstado,
        notas: editNotas,
      })
      setDetail(data.item)
      setFeedback({ type: 'success', text: 'Estado y notas internas guardados.' })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSendReply = async (event) => {
    event.preventDefault()
    if (!detail) return
    setSendingReply(true)
    setFeedback(null)
    try {
      const data = await adminApi.replyToRequest(detail.id, {
        asunto: replyAsunto,
        mensaje: replyMensaje,
      })
      setDetail(data.item)
      setEditEstado(data.item.estado)
      const isSimulated = data.envioEstado === 'simulado'
      setFeedback({
        type: 'success',
        text: isSimulated
          ? 'Respuesta guardada en el historial (envío simulado en modo stream; activa SMTP en .env.local para entrega real).'
          : `Respuesta enviada correctamente a ${detail.email} mediante SMTP.`,
      })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      if (error.payload?.item) setDetail(error.payload.item)
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setSendingReply(false)
    }
  }

  const handleDelete = async () => {
    if (!detail) return
    setFeedback(null)
    try {
      await adminApi.deleteRequest(detail.id)
      setDetail(null)
      setSelectedId(null)
      setConfirmDelete(false)
      setFeedback({ type: 'success', text: 'Solicitud eliminada permanentemente.' })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    }
  }

  const activeCount = counts.nueva + counts.leida + counts.respondida
  const filterTabs = [
    { key: '', label: 'Activas', count: activeCount },
    { key: 'nueva', label: 'Nuevas', count: counts.nueva },
    { key: 'leida', label: 'Leídas', count: counts.leida },
    { key: 'respondida', label: 'Respondidas', count: counts.respondida },
    { key: 'archivada', label: 'Archivadas', count: counts.archivada },
  ]

  const whatsappUrl = detail
    ? buildWhatsAppUrl(detail.telefono, detail.nombre, detail.especialidad)
    : ''

  return (
    <div className="admin-stack">
      <div className="admin-toolbar">
        <div className="admin-filter-tabs" role="tablist" aria-label="Filtrar solicitudes por estado">
          {filterTabs.map((tab) => (
            <button
              key={tab.key || 'activas'}
              type="button"
              role="tab"
              aria-selected={estadoFilter === tab.key}
              className={`admin-filter-tab${estadoFilter === tab.key ? ' is-active' : ''}`}
              onClick={() => setEstadoFilter(tab.key)}
            >
              <span>{tab.label}</span>
              <span className="admin-filter-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="admin-toolbar-actions">
          <form className="admin-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              className="admin-input"
              placeholder="Buscar nombre, empresa o detalle..."
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value
                setSearchInput(value)
                if (!value.trim() && searchQuery) setSearchQuery('')
              }}
              aria-label="Buscar solicitudes"
            />
            <button type="submit" className="admin-btn admin-btn--secondary">
              Buscar
            </button>
          </form>

          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => exportRequestsCsv(items)}
            disabled={!items.length}
          >
            Exportar CSV
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={loadList}>
            Actualizar
          </button>
        </div>
      </div>

      {listError ? <div className="admin-banner admin-banner--error">{listError}</div> : null}

      <div className="admin-inbox-grid">
        <section className="admin-card admin-inbox-list" aria-label="Listado de solicitudes">
          {loadingList ? (
            <p className="admin-empty">Cargando solicitudes...</p>
          ) : !items.length ? (
            <p className="admin-empty">No hay solicitudes que coincidan con este filtro.</p>
          ) : (
            items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`admin-request-item${selectedId === item.id ? ' is-selected' : ''}${
                  item.estado === 'nueva' ? ' is-unread' : ''
                }`}
                onClick={() => openDetail(item.id)}
              >
                <div className="admin-request-item-top">
                  <strong>{item.nombre}</strong>
                  <span className={`admin-pill admin-pill--${item.estado}`}>
                    {STATUS_LABELS[item.estado] || item.estado}
                  </span>
                </div>
                <p className="admin-request-sub">
                  {item.empresa || item.email}
                  {item.especialidad ? ` · ${item.especialidad}` : ''}
                </p>
                <p className="admin-request-extract">{item.extracto}</p>
                <div className="admin-request-item-foot">
                  <time>{formatDateTime(item.created_at)}</time>
                  <span className="admin-notice-tag">
                    {NOTICE_LABELS[item.aviso_estado] || item.aviso_estado}
                  </span>
                </div>
              </button>
            ))
          )}
        </section>

        <section className="admin-card admin-inbox-detail" aria-label="Detalle y respuesta de solicitud">
          {loadingDetail && !detail ? (
            <p className="admin-empty">Cargando detalle...</p>
          ) : !detail ? (
            <div className="admin-empty-box">
              <h3>Selecciona una solicitud</h3>
              <p>
                Al abrir una solicitud podrás leer el requerimiento completo, cambiar su estado, anotar seguimiento interno y responder directo por correo SMTP.
              </p>
            </div>
          ) : (
            <div className="admin-stack">
              {feedback ? (
                <div className={`admin-banner admin-banner--${feedback.type}`}>{feedback.text}</div>
              ) : null}

              <header className="admin-detail-header">
                <div>
                  <div className="admin-detail-badges">
                    <span className={`admin-pill admin-pill--${detail.estado}`}>
                      {STATUS_LABELS[detail.estado] || detail.estado}
                    </span>
                    <span className="admin-notice-tag">
                      Aviso inicial: {NOTICE_LABELS[detail.aviso_estado] || detail.aviso_estado}
                    </span>
                    <span className="admin-muted-tag">#{detail.id}</span>
                  </div>
                  <h2>{detail.nombre}</h2>
                  <p className="admin-detail-sub">
                    {detail.empresa ? `${detail.empresa} · ` : ''}
                    Recibida el {formatDateTime(detail.created_at)}
                  </p>
                </div>

                <div className="admin-actions-inline">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn admin-btn--secondary"
                    >
                      Abrir WhatsApp ↗
                    </a>
                  ) : null}
                  {!confirmDelete ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger-ghost"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Eliminar
                    </button>
                  ) : (
                    <div className="admin-confirm-inline">
                      <span>¿Borrar definitivamente?</span>
                      <button
                        type="button"
                        className="admin-btn admin-btn--danger"
                        onClick={handleDelete}
                      >
                        Sí, eliminar
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </header>

              <dl className="admin-meta-grid">
                <div>
                  <dt>Correo electrónico</dt>
                  <dd>
                    <a href={`mailto:${detail.email}`}>{detail.email}</a>
                  </dd>
                </div>
                <div>
                  <dt>Teléfono móvil</dt>
                  <dd>{detail.telefono}</dd>
                </div>
                <div>
                  <dt>Especialidad</dt>
                  <dd>{detail.especialidad || 'No especificada'}</dd>
                </div>
                <div>
                  <dt>Consentimiento Ley 19.628</dt>
                  <dd>{formatDateTime(detail.consentimiento_at)}</dd>
                </div>
              </dl>

              <div className="admin-message-box">
                <h3>Detalle del requerimiento</h3>
                <p>{detail.detalle}</p>
              </div>

              <form className="admin-subcard" onSubmit={handleSaveMeta}>
                <h3>Seguimiento interno</h3>
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label htmlFor="req-estado">Estado</label>
                    <select
                      id="req-estado"
                      className="admin-input"
                      value={editEstado}
                      onChange={(event) => setEditEstado(event.target.value)}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-field admin-field--full">
                    <label htmlFor="req-notas">Notas privadas del equipo</label>
                    <textarea
                      id="req-notas"
                      className="admin-textarea"
                      rows={2}
                      maxLength={5000}
                      placeholder="Ej: Visita en terreno coordinada para el martes, cubicación enviada..."
                      value={editNotas}
                      onChange={(event) => setEditNotas(event.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-form-footer">
                  <button type="submit" className="admin-btn admin-btn--secondary" disabled={savingMeta}>
                    {savingMeta ? 'Guardando...' : 'Guardar seguimiento'}
                  </button>
                </div>
              </form>

              <form className="admin-subcard admin-subcard--reply" onSubmit={handleSendReply}>
                <div className="admin-subcard-head">
                  <h3>Responder cotización por correo</h3>
                  <span>Para: {detail.email}</span>
                </div>

                <div className="admin-field">
                  <label htmlFor="reply-asunto">Asunto</label>
                  <input
                    id="reply-asunto"
                    type="text"
                    className="admin-input"
                    required
                    maxLength={200}
                    value={replyAsunto}
                    onChange={(event) => setReplyAsunto(event.target.value)}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="reply-mensaje">Mensaje de respuesta</label>
                  <textarea
                    id="reply-mensaje"
                    className="admin-textarea"
                    rows={6}
                    required
                    maxLength={5000}
                    value={replyMensaje}
                    onChange={(event) => setReplyMensaje(event.target.value)}
                  />
                </div>

                <div className="admin-form-footer">
                  <p className="admin-field-note">
                    Se adjunta automáticamente la referencia de la solicitud original y se marca como Respondida.
                  </p>
                  <button type="submit" className="admin-btn admin-btn--primary" disabled={sendingReply}>
                    {sendingReply ? 'Enviando...' : 'Enviar respuesta'}
                  </button>
                </div>
              </form>

              <div className="admin-subcard">
                <h3>Historial de respuestas ({detail.respuestas?.length || 0})</h3>
                {!detail.respuestas?.length ? (
                  <p className="admin-empty-inline">Todavía no se han enviado respuestas para esta solicitud.</p>
                ) : (
                  <div className="admin-replies-list">
                    {detail.respuestas.map((reply) => (
                      <article className="admin-reply-entry" key={reply.id}>
                        <div className="admin-reply-entry-head">
                          <strong>{reply.asunto}</strong>
                          <div>
                            <span
                              className={`admin-pill ${
                                reply.envio_estado === 'error'
                                  ? 'admin-pill--error'
                                  : 'admin-pill--respondida'
                              }`}
                            >
                              {NOTICE_LABELS[reply.envio_estado] || reply.envio_estado}
                            </span>
                            <time>{formatDateTime(reply.created_at)}</time>
                          </div>
                        </div>
                        <p>{reply.mensaje}</p>
                        {reply.error ? (
                          <p className="admin-reply-error">Detalle error: {reply.error}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminRequestsModule
