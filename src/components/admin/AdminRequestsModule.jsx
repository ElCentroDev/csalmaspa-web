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

function getInitials(name) {
  return String(name || 'CL')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function AdminRequestsModule({ initialSelectedId, onClearInitialSelection, onDataChanged }) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ nueva: 0, leida: 0, respondida: 0, archivada: 0, total: 0 })
  const [estadoFilter, setEstadoFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [listFeedback, setListFeedback] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [modalFeedback, setModalFeedback] = useState(null)

  const [editEstado, setEditEstado] = useState('nueva')
  const [editNotas, setEditNotas] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

  const [replyAsunto, setReplyAsunto] = useState('')
  const [replyMensaje, setReplyMensaje] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)

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
    async (id) => {
      if (!id) return
      setModalOpen(true)
      setConfirmDelete(false)
      setModalFeedback(null)
      setListFeedback(null)
      setLoadingDetail(true)
      try {
        const data = await adminApi.getRequest(id)
        const item = data.item
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
        setModalFeedback({ type: 'error', text: error.message })
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
        setModalOpen(true)
        setConfirmDelete(false)
        setModalFeedback(null)
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
        if (active) setListError(error.message)
      })
      .finally(() => {
        if (active && onClearInitialSelection) onClearInitialSelection()
      })
    return () => {
      active = false
    }
  }, [initialSelectedId, onClearInitialSelection, onDataChanged])

  useEffect(() => {
    if (!modalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [modalOpen])

  const closeModal = () => {
    setModalOpen(false)
    setDetail(null)
    setConfirmDelete(false)
    setModalFeedback(null)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const handleSaveMeta = async (event) => {
    event.preventDefault()
    if (!detail) return
    setSavingMeta(true)
    setModalFeedback(null)
    try {
      const data = await adminApi.updateRequest(detail.id, {
        estado: editEstado,
        notas: editNotas,
      })
      setDetail(data.item)
      setModalFeedback({ type: 'success', text: 'Estado y notas internas guardados.' })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setModalFeedback({ type: 'error', text: error.message })
    } finally {
      setSavingMeta(false)
    }
  }

  const handleSendReply = async (event) => {
    event.preventDefault()
    if (!detail) return
    setSendingReply(true)
    setModalFeedback(null)
    try {
      const data = await adminApi.replyToRequest(detail.id, {
        asunto: replyAsunto,
        mensaje: replyMensaje,
      })
      setDetail(data.item)
      setEditEstado(data.item.estado)
      const isSimulated = data.envioEstado === 'simulado'
      setModalFeedback({
        type: 'success',
        text: isSimulated
          ? 'Respuesta guardada en el historial (envío simulado en modo stream; activa SMTP en .env.local para entrega real).'
          : `Respuesta enviada correctamente a ${detail.email} mediante SMTP.`,
      })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      if (error.payload?.item) setDetail(error.payload.item)
      setModalFeedback({ type: 'error', text: error.message })
    } finally {
      setSendingReply(false)
    }
  }

  const handleDelete = async () => {
    if (!detail) return
    setModalFeedback(null)
    try {
      await adminApi.deleteRequest(detail.id)
      closeModal()
      setListFeedback({ type: 'success', text: 'Solicitud eliminada permanentemente.' })
      await loadList()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setModalFeedback({ type: 'error', text: error.message })
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
              placeholder="Buscar nombre, empresa, correo o detalle..."
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
      {listFeedback ? (
        <div className={`admin-banner admin-banner--${listFeedback.type}`}>{listFeedback.text}</div>
      ) : null}

      <section className="admin-card admin-requests-card" aria-label="Solicitudes de cotización">
        <div className="admin-card-header">
          <div>
            <h2>Solicitudes recibidas ({items.length})</h2>
            <p>Haz clic en una fila o en «Abrir» para revisar la ficha completa y responder al cliente.</p>
          </div>
        </div>

        {loadingList ? (
          <p className="admin-empty">Cargando solicitudes...</p>
        ) : !items.length ? (
          <div className="admin-empty-box">
            <h3>Sin solicitudes en esta vista</h3>
            <p>
              No hay solicitudes que coincidan con el filtro o búsqueda actual. Cuando alguien envíe el formulario del sitio web aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="admin-requests-table-wrap">
            <table className="admin-requests-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Especialidad y detalle</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Recibida</th>
                  <th className="admin-requests-action-col">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`admin-request-row${item.estado === 'nueva' ? ' is-unread' : ''}`}
                    onClick={() => openDetail(item.id)}
                  >
                    <td>
                      <div className="admin-request-client">
                        <div className="admin-user-avatar" aria-hidden="true">
                          {getInitials(item.nombre)}
                        </div>
                        <div className="admin-request-client-info">
                          <div className="admin-request-client-name">
                            {item.estado === 'nueva' ? (
                              <span className="admin-request-unread-dot" title="Sin leer" />
                            ) : null}
                            <strong>{item.nombre}</strong>
                          </div>
                          <span>{item.empresa || 'Particular'}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="admin-request-detail-col">
                        {item.especialidad ? (
                          <span className="admin-muted-tag">{item.especialidad}</span>
                        ) : null}
                        <p className="admin-request-excerpt">{item.extracto}</p>
                      </div>
                    </td>

                    <td>
                      <div className="admin-request-contact-col">
                        <a
                          href={`mailto:${item.email}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {item.email}
                        </a>
                        <span>{item.telefono}</span>
                      </div>
                    </td>

                    <td>
                      <div className="admin-request-state-col">
                        <span className={`admin-pill admin-pill--${item.estado}`}>
                          {STATUS_LABELS[item.estado] || item.estado}
                        </span>
                        <span className="admin-notice-tag">
                          {NOTICE_LABELS[item.aviso_estado] || item.aviso_estado}
                        </span>
                      </div>
                    </td>

                    <td>
                      <time className="admin-request-date">{formatDateTime(item.created_at)}</time>
                    </td>

                    <td className="admin-requests-action-col">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary"
                        onClick={(event) => {
                          event.stopPropagation()
                          openDetail(item.id)
                        }}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="req-modal-title"
        >
          <div className="admin-modal admin-modal--wide">
            <header className="admin-modal-header">
              <div>
                <div className="admin-detail-badges">
                  <span className="admin-muted-tag">
                    {detail ? `#${detail.id}` : 'Cargando...'}
                  </span>
                  {detail ? (
                    <>
                      <span className={`admin-pill admin-pill--${detail.estado}`}>
                        {STATUS_LABELS[detail.estado] || detail.estado}
                      </span>
                      <span className="admin-notice-tag">
                        Aviso inicial: {NOTICE_LABELS[detail.aviso_estado] || detail.aviso_estado}
                      </span>
                    </>
                  ) : null}
                </div>
                <h2 id="req-modal-title">{detail ? detail.nombre : 'Cargando solicitud...'}</h2>
                {detail ? (
                  <p>
                    {detail.empresa ? `${detail.empresa} · ` : ''}
                    Recibida el {formatDateTime(detail.created_at)} · Este modal solo se cierra desde el botón X para proteger tu respuesta.
                  </p>
                ) : null}
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
                <button
                  type="button"
                  className="admin-modal-close"
                  aria-label="Cerrar solicitud"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="admin-modal-body">
              {modalFeedback ? (
                <div
                  className={`admin-banner admin-banner--${modalFeedback.type}`}
                  style={{ marginBottom: '16px' }}
                >
                  {modalFeedback.text}
                </div>
              ) : null}

              {loadingDetail && !detail ? (
                <p className="admin-empty">Cargando ficha de la solicitud...</p>
              ) : detail ? (
                <div className="admin-request-modal-grid">
                  <div className="admin-stack">
                    <div className="admin-message-box">
                      <h3>Detalle del requerimiento</h3>
                      <p>{detail.detalle}</p>
                    </div>

                    <form className="admin-subcard admin-subcard--reply" onSubmit={handleSendReply}>
                      <div className="admin-subcard-head">
                        <h3>Responder cotización por correo</h3>
                        <span>Para: {detail.email}</span>
                      </div>

                      <div className="admin-stack">
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
                      </div>

                      <div className="admin-form-footer">
                        <p className="admin-field-note">
                          Incluye la referencia original y marca la solicitud como Respondida.
                        </p>
                        <button
                          type="submit"
                          className="admin-btn admin-btn--primary"
                          disabled={sendingReply}
                        >
                          {sendingReply ? 'Enviando...' : 'Enviar respuesta'}
                        </button>
                      </div>
                    </form>

                    <div className="admin-subcard">
                      <h3>Historial de respuestas ({detail.respuestas?.length || 0})</h3>
                      {!detail.respuestas?.length ? (
                        <p className="admin-empty-inline">
                          Todavía no se han enviado respuestas para esta solicitud.
                        </p>
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

                  <aside className="admin-stack">
                    <div className="admin-subcard">
                      <h3>Datos del contacto</h3>
                      <dl className="admin-dl admin-dl--stacked">
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
                    </div>

                    <form className="admin-subcard" onSubmit={handleSaveMeta}>
                      <h3>Seguimiento interno</h3>
                      <div className="admin-stack">
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

                        <div className="admin-field">
                          <label htmlFor="req-notas">Notas privadas del equipo</label>
                          <textarea
                            id="req-notas"
                            className="admin-textarea"
                            rows={4}
                            maxLength={5000}
                            placeholder="Ej: Visita en terreno coordinada para el martes, cubicación enviada..."
                            value={editNotas}
                            onChange={(event) => setEditNotas(event.target.value)}
                          />
                        </div>
                      </div>
                      <div className="admin-form-footer">
                        <button
                          type="submit"
                          className="admin-btn admin-btn--secondary"
                          disabled={savingMeta}
                        >
                          {savingMeta ? 'Guardando...' : 'Guardar seguimiento'}
                        </button>
                      </div>
                    </form>

                    <div className="admin-subcard">
                      <h3>Gestión de datos (Ley 19.628)</h3>
                      <p className="admin-field-note" style={{ marginBottom: '12px' }}>
                        Elimina definitivamente esta solicitud y su historial si corresponde por solicitud del titular o limpieza interna.
                      </p>
                      {!confirmDelete ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger-ghost"
                          onClick={() => setConfirmDelete(true)}
                        >
                          Eliminar solicitud
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
                  </aside>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminRequestsModule
