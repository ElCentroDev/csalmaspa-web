import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, formatDateTime } from './adminApi.js'

const ROLE_LABELS = {
  administrador: 'Administrador',
  editor: 'Editor',
  autor: 'Autor',
  colaborador: 'Colaborador',
  lector: 'Lector',
  ninguno: 'Ninguno',
}

const ROLE_SUMMARIES = {
  administrador: 'Control total del panel, usuarios, SMTP, editor de archivos y contenido.',
  editor: 'Publica y edita proyectos y gestiona la bandeja de solicitudes.',
  autor: 'Crea y publica proyectos con galería de fotografías.',
  colaborador: 'Prepara borradores y consulta solicitudes sin publicar cambios.',
  lector: 'Solo lectura de métricas, Escritorio y registros.',
  ninguno: 'Cuenta registrada sin permisos administrativos asignados.',
}

const ROLE_KEYS = Object.keys(ROLE_LABELS)
const PAGE_SIZE = 15

const EMPTY_FORM = {
  username: '',
  nombre: '',
  email: '',
  rol: 'editor',
  estado: 'activo',
  password: '',
}

function getInitials(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function AdminUsersModule({ onDataChanged }) {
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ total: 0, activos: 0, inactivos: 0, roles: {} })
  const [roleFilter, setRoleFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('username')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [bulkRole, setBulkRole] = useState('')
  const [applyingBulk, setApplyingBulk] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const reloadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.listUsers({ rol: roleFilter, q: searchQuery, sortBy, sortDir })
      setItems(data.items || [])
      if (data.counts) setCounts(data.counts)
      setSelectedIds([])
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [roleFilter, searchQuery, sortBy, sortDir])

  useEffect(() => {
    let active = true
    adminApi
      .listUsers({ rol: roleFilter, q: searchQuery, sortBy, sortDir })
      .then((data) => {
        if (!active) return
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
        setSelectedIds([])
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
  }, [roleFilter, searchQuery, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return items.slice(start, start + PAGE_SIZE)
  }, [items, currentPage])

  const allPageSelected =
    pagedItems.length > 0 && pagedItems.every((user) => selectedIds.includes(user.id))

  const openNewUserForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
    setFeedback(null)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleEdit = (user) => {
    setEditingId(user.id)
    setForm({
      username: user.username || '',
      nombre: user.nombre || '',
      email: user.email || '',
      rol: user.rol || 'editor',
      estado: user.estado || 'activo',
      password: '',
    })
    setFormOpen(true)
    setFeedback(null)
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      if (editingId) {
        await adminApi.updateUser(editingId, form)
        setFeedback({ type: 'success', text: 'Usuario actualizado correctamente.' })
      } else {
        await adminApi.createUser(form)
        setFeedback({ type: 'success', text: 'Nuevo usuario agregado.' })
      }
      closeForm()
      await reloadUsers()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRow = async (id) => {
    setFeedback(null)
    try {
      await adminApi.deleteUser(id)
      if (editingId === id) closeForm()
      setConfirmDeleteId(null)
      setFeedback({ type: 'success', text: 'Usuario eliminado.' })
      await reloadUsers()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    }
  }

  const toggleSort = (column) => {
    setPage(1)
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  const toggleSelectAllPage = () => {
    const pageIds = pagedItems.map((u) => u.id)
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])])
    }
  }

  const toggleRowSelection = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleApplyBulkAction = async () => {
    if (!bulkAction || !selectedIds.length) return
    setApplyingBulk(true)
    setFeedback(null)
    try {
      if (bulkAction === 'delete') {
        await adminApi.bulkUsers({ action: 'delete', ids: selectedIds })
        setFeedback({ type: 'success', text: `Se eliminaron ${selectedIds.length} usuario(s).` })
      } else if (bulkAction === 'activo' || bulkAction === 'inactivo') {
        await adminApi.bulkUsers({ action: 'set_state', ids: selectedIds, estado: bulkAction })
        setFeedback({ type: 'success', text: 'Estado actualizado para los usuarios seleccionados.' })
      }
      setBulkAction('')
      await reloadUsers()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setApplyingBulk(false)
    }
  }

  const handleApplyBulkRole = async () => {
    if (!bulkRole || !selectedIds.length) return
    setApplyingBulk(true)
    setFeedback(null)
    try {
      await adminApi.bulkUsers({ action: 'set_role', ids: selectedIds, rol: bulkRole })
      setFeedback({
        type: 'success',
        text: `Función cambiada a "${ROLE_LABELS[bulkRole] || bulkRole}" en ${selectedIds.length} usuario(s).`,
      })
      setBulkRole('')
      await reloadUsers()
      if (onDataChanged) onDataChanged()
    } catch (error) {
      setFeedback({ type: 'error', text: error.message })
    } finally {
      setApplyingBulk(false)
    }
  }

  const renderSortArrow = (column) => {
    if (sortBy !== column) return '↕'
    return sortDir === 'asc' ? '▲' : '▼'
  }

  return (
    <div className="admin-wp-users">
      <div className="admin-wp-header">
        <h2>Usuarios</h2>
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={formOpen && !editingId ? closeForm : openNewUserForm}
        >
          {formOpen && !editingId ? 'Cerrar formulario' : 'Agregar usuario'}
        </button>
      </div>

      {feedback ? (
        <div className={`admin-banner admin-banner--${feedback.type}`}>{feedback.text}</div>
      ) : null}

      {formOpen ? (
        <form className="admin-card admin-wp-form-drawer" onSubmit={handleSubmit}>
          <div className="admin-card-header">
            <div>
              <h2>{editingId ? 'Editar usuario' : 'Agregar nuevo usuario'}</h2>
              <p>Configura el identificador, correo, función de WordPress y contraseña cifrada.</p>
            </div>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={closeForm}>
              Cancelar
            </button>
          </div>

          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="wp-user-username">Nombre de usuario</label>
              <input
                id="wp-user-username"
                name="username"
                type="text"
                className="admin-input"
                maxLength={60}
                pattern="[a-zA-Z0-9._-]*"
                placeholder="Se autogenera del correo si se deja vacío"
                value={form.username}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="wp-user-nombre">Nombre completo *</label>
              <input
                id="wp-user-nombre"
                name="nombre"
                type="text"
                className="admin-input"
                required
                maxLength={100}
                placeholder="Ej: Rodrigo Salma"
                value={form.nombre}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="wp-user-email">Correo electrónico *</label>
              <input
                id="wp-user-email"
                name="email"
                type="email"
                className="admin-input"
                required
                maxLength={120}
                placeholder="usuario@csalma.cl"
                value={form.email}
                onChange={handleFieldChange}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="wp-user-rol">Función *</label>
              <select
                id="wp-user-rol"
                name="rol"
                className="admin-input"
                value={form.rol}
                onChange={handleFieldChange}
              >
                {ROLE_KEYS.map((roleKey) => (
                  <option key={roleKey} value={roleKey}>
                    {ROLE_LABELS[roleKey]}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label htmlFor="wp-user-estado">Estado</label>
              <select
                id="wp-user-estado"
                name="estado"
                className="admin-input"
                value={form.estado}
                onChange={handleFieldChange}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>

            <div className="admin-field">
              <label htmlFor="wp-user-password">
                {editingId ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 8 caracteres)'}
              </label>
              <input
                id="wp-user-password"
                name="password"
                type="password"
                className="admin-input"
                minLength={8}
                maxLength={128}
                placeholder={editingId ? 'Vacío para mantener actual' : 'Se cifra con scrypt'}
                value={form.password}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <p className="admin-hint">
            <strong>{ROLE_LABELS[form.rol] || form.rol}:</strong>{' '}
            {ROLE_SUMMARIES[form.rol] || ''}
          </p>

          <div className="admin-form-footer">
            <span className="admin-field-note">El inicio de sesión usará estos usuarios cuando se habilite.</span>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar usuario'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-wp-subsubsub-row">
        <ul className="admin-wp-subsubsub" aria-label="Filtros por función">
          <li>
            <button
              type="button"
              className={!roleFilter ? 'is-current' : ''}
              onClick={() => {
                setRoleFilter('')
                setPage(1)
              }}
            >
              Todos <span>({counts.total})</span>
            </button>
          </li>
          {ROLE_KEYS.map((roleKey) => {
            const count = counts.roles?.[roleKey] ?? 0
            if (count === 0 && !['administrador', 'editor', 'ninguno'].includes(roleKey)) return null
            return (
              <li key={roleKey}>
                <button
                  type="button"
                  className={roleFilter === roleKey ? 'is-current' : ''}
                  onClick={() => {
                    setRoleFilter(roleKey)
                    setPage(1)
                  }}
                >
                  {roleKey === 'ninguno' ? 'Sin roles' : ROLE_LABELS[roleKey]}{' '}
                  <span>({count})</span>
                </button>
              </li>
            )
          })}
        </ul>

        <form
          className="admin-wp-search-box"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSearchQuery(searchInput.trim())
          }}
        >
          <input
            type="search"
            className="admin-input"
            placeholder="Usuario, nombre o correo..."
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value
              setSearchInput(value)
              if (!value.trim() && searchQuery) {
                setPage(1)
                setSearchQuery('')
              }
            }}
            aria-label="Buscar usuarios"
          />
          <button type="submit" className="admin-btn admin-btn--ghost">
            Buscar usuarios
          </button>
        </form>
      </div>

      <div className="admin-wp-tablenav">
        <div className="admin-wp-bulk-controls">
          <div className="admin-wp-bulk-group">
            <select
              aria-label="Acciones masivas"
              className="admin-input"
              value={bulkAction}
              onChange={(event) => setBulkAction(event.target.value)}
            >
              <option value="">Acciones masivas</option>
              <option value="activo">Marcar como activo</option>
              <option value="inactivo">Marcar como inactivo</option>
              <option value="delete">Eliminar</option>
            </select>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={!bulkAction || !selectedIds.length || applyingBulk}
              onClick={handleApplyBulkAction}
            >
              Aplicar
            </button>
          </div>

          <div className="admin-wp-bulk-group">
            <select
              aria-label="Cambiar función a"
              className="admin-input"
              value={bulkRole}
              onChange={(event) => setBulkRole(event.target.value)}
            >
              <option value="">Cambiar función a...</option>
              {ROLE_KEYS.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {ROLE_LABELS[roleKey]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={!bulkRole || !selectedIds.length || applyingBulk}
              onClick={handleApplyBulkRole}
            >
              Cambiar
            </button>
          </div>
        </div>

        <div className="admin-wp-pagination">
          <span className="admin-wp-total">{items.length} elementos</span>
          <div className="admin-wp-page-btns">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={currentPage <= 1}
              onClick={() => setPage(1)}
              aria-label="Primera página"
            >
              «
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className="admin-wp-page-indicator">
              {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              ›
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
              aria-label="Última página"
            >
              »
            </button>
          </div>
        </div>
      </div>

      <div className="admin-wp-table-wrap">
        <table className="admin-wp-table">
          <thead>
            <tr>
              <th className="admin-wp-check-col">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos"
                  checked={allPageSelected}
                  onChange={toggleSelectAllPage}
                />
              </th>
              <th>
                <button type="button" className="admin-wp-sort-btn" onClick={() => toggleSort('username')}>
                  Nombre de usuario <span>{renderSortArrow('username')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="admin-wp-sort-btn" onClick={() => toggleSort('nombre')}>
                  Nombre <span>{renderSortArrow('nombre')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="admin-wp-sort-btn" onClick={() => toggleSort('email')}>
                  Correo electrónico <span>{renderSortArrow('email')}</span>
                </button>
              </th>
              <th>
                <button type="button" className="admin-wp-sort-btn" onClick={() => toggleSort('rol')}>
                  Función <span>{renderSortArrow('rol')}</span>
                </button>
              </th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="admin-wp-empty-cell">
                  Cargando usuarios...
                </td>
              </tr>
            ) : !pagedItems.length ? (
              <tr>
                <td colSpan={6} className="admin-wp-empty-cell">
                  No se encontraron usuarios. Haz clic en «Agregar usuario» para crear el primero.
                </td>
              </tr>
            ) : (
              pagedItems.map((user) => (
                <tr key={user.id} className={selectedIds.includes(user.id) ? 'is-selected' : ''}>
                  <td className="admin-wp-check-col">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar a ${user.username}`}
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleRowSelection(user.id)}
                    />
                  </td>
                  <td>
                    <div className="admin-wp-user-cell">
                      <div className="admin-wp-avatar" aria-hidden="true">
                        {getInitials(user.nombre)}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="admin-wp-username-link"
                          onClick={() => handleEdit(user)}
                        >
                          {user.username}
                        </button>
                        <div className="admin-wp-row-actions">
                          <button type="button" onClick={() => handleEdit(user)}>
                            Editar
                          </button>
                          <span>|</span>
                          {confirmDeleteId === user.id ? (
                            <>
                              <button
                                type="button"
                                className="is-danger"
                                onClick={() => handleDeleteRow(user.id)}
                              >
                                Sí, eliminar
                              </button>
                              <span>|</span>
                              <button type="button" onClick={() => setConfirmDeleteId(null)}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => setConfirmDeleteId(user.id)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{user.nombre}</td>
                  <td>
                    <a className="admin-wp-email-link" href={`mailto:${user.email}`}>
                      {user.email}
                    </a>
                  </td>
                  <td>{ROLE_LABELS[user.rol] || user.rol}</td>
                  <td>
                    <div className="admin-wp-state-cell">
                      <span
                        className={`admin-pill ${
                          user.estado === 'activo' ? 'admin-pill--respondida' : 'admin-pill--archivada'
                        }`}
                      >
                        {user.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="admin-wp-pass-note" title={`Creado: ${formatDateTime(user.created_at)}`}>
                        {user.has_password ? 'Con clave' : 'Sin clave'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminUsersModule
