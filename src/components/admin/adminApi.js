async function requestJson(url, options = {}) {
  const headers = { ...options.headers }
  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message =
      payload?.error ||
      `No se pudo completar la operación (HTTP ${response.status}).`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const adminApi = {
  getOverview() {
    return requestJson('/api/admin/overview')
  },

  runUptimeCheck() {
    return requestJson('/api/admin/uptime/check', {
      method: 'POST',
    })
  },

  listRequests({ estado = '', q = '' } = {}) {
    const params = new URLSearchParams()
    if (estado) params.set('estado', estado)
    if (q) params.set('q', q)
    const query = params.toString()
    return requestJson(`/api/admin/solicitudes${query ? `?${query}` : ''}`)
  },

  getRequest(id) {
    return requestJson(`/api/admin/solicitudes/${id}`)
  },

  updateRequest(id, data) {
    return requestJson(`/api/admin/solicitudes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  replyToRequest(id, data) {
    return requestJson(`/api/admin/solicitudes/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteRequest(id) {
    return requestJson(`/api/admin/solicitudes/${id}`, {
      method: 'DELETE',
    })
  },

  listProjects() {
    return requestJson('/api/admin/proyectos')
  },

  createProject(data) {
    return requestJson('/api/admin/proyectos', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateProject(id, data) {
    return requestJson(`/api/admin/proyectos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deleteProject(id) {
    return requestJson(`/api/admin/proyectos/${id}`, {
      method: 'DELETE',
    })
  },

  uploadImage({ contentType, dataBase64 }) {
    return requestJson('/api/admin/uploads', {
      method: 'POST',
      body: JSON.stringify({ contentType, dataBase64 }),
    })
  },

  listUsers({ rol = '', q = '', sortBy = 'username', sortDir = 'asc' } = {}) {
    const params = new URLSearchParams()
    if (rol) params.set('rol', rol)
    if (q) params.set('q', q)
    if (sortBy) params.set('sortBy', sortBy)
    if (sortDir) params.set('sortDir', sortDir)
    const query = params.toString()
    return requestJson(`/api/admin/users${query ? `?${query}` : ''}`)
  },

  createUser(data) {
    return requestJson('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateUser(id, data) {
    return requestJson(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  bulkUsers(data) {
    return requestJson('/api/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteUser(id) {
    return requestJson(`/api/admin/users/${id}`, {
      method: 'DELETE',
    })
  },

  getFileRoots() {
    return requestJson('/api/admin/files/roots')
  },

  listFiles(root = 'project', path = '') {
    const params = new URLSearchParams({ root, path })
    return requestJson(`/api/admin/files/tree?${params.toString()}`)
  },

  previewFile(root = 'project', path = '') {
    const params = new URLSearchParams({ root, path })
    return requestJson(`/api/admin/files/preview?${params.toString()}`)
  },

  saveFileContent({ root, path, content }) {
    return requestJson('/api/admin/files/content', {
      method: 'PUT',
      body: JSON.stringify({ root, path, content }),
    })
  },

  createFileEntry({ root, path, type, content = '' }) {
    return requestJson('/api/admin/files/create', {
      method: 'POST',
      body: JSON.stringify({ root, path, type, content }),
    })
  },

  deleteFileEntry(root, path) {
    const params = new URLSearchParams({ root, path })
    return requestJson(`/api/admin/files/entry?${params.toString()}`, {
      method: 'DELETE',
    })
  },
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(totalSeconds) {
  const secs = Math.max(0, Math.round(Number(totalSeconds) || 0))
  if (secs < 60) return `${secs} s`
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const parts = []
  if (days > 0) parts.push(`${days} d`)
  if (hours > 0) parts.push(`${hours} h`)
  if (minutes > 0 || !parts.length) parts.push(`${minutes} min`)
  return parts.join(' ')
}

export function formatBytes(bytes) {
  const num = Number(bytes)
  if (!Number.isFinite(num) || num <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let idx = 0
  let val = num
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx += 1
  }
  const decimals = idx === 0 ? 0 : val >= 100 ? 0 : val >= 10 ? 1 : 2
  return `${val.toFixed(decimals)} ${units[idx]}`
}

export function buildWhatsAppUrl(phone, nombre, especialidad) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const topic = especialidad ? ` sobre ${especialidad}` : ''
  const text = encodeURIComponent(
    `Hola ${nombre || ''}, te contactamos de Construcciones CSALMA SPA por tu solicitud${topic}.`,
  )
  return `https://wa.me/${digits}?text=${text}`
}

export function exportRequestsCsv(items) {
  const headers = [
    'ID',
    'Fecha',
    'Estado',
    'Nombre',
    'Empresa',
    'Email',
    'Teléfono',
    'Especialidad',
    'Aviso correo',
    'Detalle / Extracto',
  ]

  const escapeCell = (value) => {
    const raw = String(value ?? '').replace(/\r?\n/g, ' ')
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
    return `"${safe.replace(/"/g, '""')}"`
  }

  const rows = items.map((item) => [
    item.id,
    formatDateTime(item.created_at),
    item.estado,
    item.nombre,
    item.empresa || '',
    item.email,
    item.telefono,
    item.especialidad || '',
    item.aviso_estado || '',
    item.detalle || item.extracto || '',
  ])

  const csvContent =
    '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `solicitudes-csalma-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
