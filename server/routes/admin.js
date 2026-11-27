import { REQUEST_STATES } from '../repositories/requestsRepository.js'
import { parseCookies, SESSION_COOKIE_NAME } from '../repositories/sessionsRepository.js'
import { USER_ROLES, USER_STATES } from '../repositories/usersRepository.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SORT_BY = new Set(['username', 'nombre', 'email', 'rol', 'created_at'])
const VALID_SORT_DIR = new Set(['asc', 'desc'])

function parseId(raw) {
  if (!/^\d+$/.test(String(raw))) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function isAllowedImageUrl(url) {
  return !url || url.startsWith('/api/uploads/') || url.startsWith('/images/')
}

const patchRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      estado: { type: 'string', enum: REQUEST_STATES },
      notas: { type: 'string', maxLength: 5000 },
    },
  },
}

const replyRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['asunto', 'mensaje'],
    properties: {
      asunto: { type: 'string', minLength: 1, maxLength: 200, pattern: '^[^\\r\\n]+$' },
      mensaje: { type: 'string', minLength: 1, maxLength: 5000 },
    },
  },
}

const projectBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['titulo', 'resumen'],
    properties: {
      titulo: { type: 'string', minLength: 1, maxLength: 140 },
      categoria: { type: 'string', maxLength: 80 },
      ubicacion: { type: 'string', maxLength: 120 },
      anio: { type: 'string', maxLength: 16 },
      resumen: { type: 'string', minLength: 1, maxLength: 500 },
      contenido: { type: 'string', maxLength: 10000 },
      imagen_url: { type: 'string', maxLength: 300 },
      imagen_alt: { type: 'string', maxLength: 180 },
      imagenes: {
        type: 'array',
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['url'],
          properties: {
            url: { type: 'string', minLength: 1, maxLength: 300 },
            alt: { type: 'string', maxLength: 180 },
          },
        },
      },
      publicado: { type: 'boolean' },
    },
  },
}

const userBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['nombre', 'email', 'rol'],
    properties: {
      username: { type: 'string', maxLength: 60, pattern: '^[a-zA-Z0-9._-]*$' },
      nombre: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[^\\r\\n]+$' },
      email: { type: 'string', minLength: 3, maxLength: 120, format: 'email' },
      rol: { type: 'string', enum: USER_ROLES },
      estado: { type: 'string', enum: USER_STATES },
      password: { type: 'string', maxLength: 128 },
    },
  },
}

const userBulkSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['action', 'ids'],
    properties: {
      action: { type: 'string', enum: ['delete', 'set_role', 'set_state'] },
      ids: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: { type: 'integer', minimum: 1 },
      },
      rol: { type: 'string', enum: USER_ROLES },
      estado: { type: 'string', enum: USER_STATES },
    },
  },
}

const uploadBodySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['contentType', 'dataBase64'],
    properties: {
      contentType: { type: 'string', maxLength: 50 },
      dataBase64: { type: 'string', minLength: 1 },
    },
  },
}

const fileWriteSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['root', 'path', 'content'],
    properties: {
      root: { type: 'string', minLength: 1, maxLength: 20 },
      path: { type: 'string', minLength: 1, maxLength: 300 },
      content: { type: 'string' },
    },
  },
}

const fileCreateSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['root', 'path', 'type'],
    properties: {
      root: { type: 'string', minLength: 1, maxLength: 20 },
      path: { type: 'string', minLength: 1, maxLength: 300 },
      type: { type: 'string', enum: ['file', 'dir'] },
      content: { type: 'string' },
    },
  },
}

function normalizeProjectPayload(body) {
  const rawGallery = Array.isArray(body.imagenes)
    ? body.imagenes.map((item) => ({
        url: String(item?.url || '').trim(),
        alt: String(item?.alt || '').trim(),
      }))
    : []

  return {
    titulo: String(body.titulo || '').trim(),
    categoria: String(body.categoria || '').trim(),
    ubicacion: String(body.ubicacion || '').trim(),
    anio: String(body.anio || '').trim(),
    resumen: String(body.resumen || '').trim(),
    contenido: String(body.contenido || '').trim(),
    imagen_url: String(body.imagen_url || '').trim(),
    imagen_alt: String(body.imagen_alt || '').trim(),
    imagenes: rawGallery,
    publicado: Boolean(body.publicado),
  }
}

function validateProjectImages(data) {
  if (!isAllowedImageUrl(data.imagen_url)) return false
  for (const item of data.imagenes) {
    if (!isAllowedImageUrl(item.url)) return false
  }
  return true
}

function collectProjectUrls(project) {
  if (!project) return []
  const urls = new Set()
  if (project.imagen_url) urls.add(project.imagen_url)
  for (const item of project.imagenes || []) {
    if (item?.url) urls.add(item.url)
  }
  return [...urls]
}

function requirePerm(request, reply, checkFn) {
  if (checkFn(request.adminPermissions)) return true
  reply.code(403).send({
    success: false,
    error: 'No tienes permisos para realizar esta acción.',
  })
  return false
}

export default async function adminRoutes(
  fastify,
  {
    config,
    mailService,
    requestsRepo,
    projectsRepo,
    uploadService,
    activityRepo,
    usersRepo,
    sessionsRepo,
    systemInfoService,
    uptimeMonitor,
    fileExplorerService,
  },
) {
  const logActivity = (request, entry) => {
    if (!activityRepo) return
    const actor = request.adminUser
      ? `${request.adminUser.nombre} (@${request.adminUser.username})`
      : 'Panel Admin'
    activityRepo.record({ ...entry, actor })
  }

  fastify.addHook('preHandler', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    reply.header('X-Robots-Tag', 'noindex, nofollow')

    const cookies = parseCookies(request.headers.cookie)
    const token = cookies[SESSION_COOKIE_NAME]
    const session = sessionsRepo.findValidSession(token)

    if (!session) {
      return reply.code(401).send({
        success: false,
        error: 'Sesión requerida. Inicie sesión para continuar.',
      })
    }

    request.adminUser = session.user
    request.adminPermissions = session.permissions
    request.sessionTokenHash = session.tokenHash
  })

  fastify.get('/api/admin/overview', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.modules.includes('escritorio'))) return

    const canViewSystem = request.adminPermissions.canViewSystem
    const canSeeRequests = request.adminPermissions.modules.includes('solicitudes')

    return {
      smtp: {
        transport: config.mailTransport,
        configured: mailService.isSmtpConfigured,
        host: canViewSystem ? config.smtp.host : '',
        port: canViewSystem ? config.smtp.port : 0,
        contactTo: canViewSystem ? config.recipients.default : [],
        mailFrom: canViewSystem ? config.mailFrom : '',
      },
      admin: {
        allowRemote: config.admin.allowRemote,
      },
      solicitudes: requestsRepo.counts(),
      proyectos: projectsRepo.counts(),
      usuarios: usersRepo.counts(),
      recientes: canSeeRequests ? requestsRepo.latest(5) : [],
      system: canViewSystem ? systemInfoService.getSnapshot() : null,
      uptime: uptimeMonitor.getSummary(),
      actividad: activityRepo.list(15),
    }
  })

  fastify.post('/api/admin/uptime/check', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canRunUptimeCheck)) return
    const check = await uptimeMonitor.runCheck()
    return {
      check,
      uptime: uptimeMonitor.getSummary(),
    }
  })

  fastify.get('/api/admin/solicitudes', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.modules.includes('solicitudes'))) return

    const rawEstado = typeof request.query?.estado === 'string' ? request.query.estado.trim() : ''
    const rawQ = typeof request.query?.q === 'string' ? request.query.q.trim() : ''

    if (rawEstado && !REQUEST_STATES.includes(rawEstado)) {
      return reply.code(400).send({ success: false, error: 'Estado de filtro no válido.' })
    }
    if (rawQ.length > 100) {
      return reply.code(400).send({ success: false, error: 'El texto de búsqueda es demasiado largo.' })
    }

    return {
      items: requestsRepo.list({ estado: rawEstado || undefined, q: rawQ || undefined }),
      counts: requestsRepo.counts(),
    }
  })

  fastify.get('/api/admin/solicitudes/:id', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.modules.includes('solicitudes'))) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    if (request.adminPermissions.canManageRequests) {
      requestsRepo.markRead(id)
    }
    return { item: requestsRepo.findWithReplies(id) }
  })

  fastify.patch('/api/admin/solicitudes/:id', { schema: patchRequestSchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageRequests)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    requestsRepo.update(id, request.body)
    logActivity(request, {
      modulo: 'solicitudes',
      accion: 'actualizar_solicitud',
      descripcion: `Actualizó seguimiento de ${existing.nombre}${request.body.estado ? ` (${request.body.estado})` : ''}.`,
    })
    return { item: requestsRepo.findWithReplies(id) }
  })

  fastify.post('/api/admin/solicitudes/:id/reply', { schema: replyRequestSchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageRequests)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    const asunto = request.body.asunto.trim()
    const mensaje = request.body.mensaje.trim()
    if (!asunto || !mensaje) {
      return reply.code(400).send({ success: false, error: 'Debe ingresar asunto y mensaje para responder.' })
    }

    try {
      await mailService.sendReply({
        to: existing.email,
        recipientName: existing.nombre,
        subject: asunto,
        message: mensaje,
        originalData: existing,
      })

      const envioEstado = config.mailTransport === 'smtp' ? 'enviado' : 'simulado'
      requestsRepo.addReply({ solicitudId: id, asunto, mensaje, envioEstado })
      logActivity(request, {
        modulo: 'solicitudes',
        accion: 'responder_solicitud',
        descripcion: `Respondió cotización a ${existing.nombre} (${envioEstado}).`,
      })

      return {
        success: true,
        envioEstado,
        item: requestsRepo.findWithReplies(id),
      }
    } catch (error) {
      request.log.error({ err: error }, 'Error al responder solicitud por correo')
      requestsRepo.addReply({
        solicitudId: id,
        asunto,
        mensaje,
        envioEstado: 'error',
        error: error?.message || 'Error desconocido de SMTP',
      })
      logActivity(request, {
        modulo: 'solicitudes',
        accion: 'error_respuesta',
        descripcion: `Error al responder por SMTP a ${existing.nombre}.`,
      })

      return reply.code(502).send({
        success: false,
        error: 'No se pudo enviar el correo por SMTP. Revise las credenciales en el servidor.',
        item: requestsRepo.findWithReplies(id),
      })
    }
  })

  fastify.delete('/api/admin/solicitudes/:id', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canDeleteRequests)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    requestsRepo.remove(id)
    logActivity(request, {
      modulo: 'solicitudes',
      accion: 'eliminar_solicitud',
      descripcion: `Eliminó la solicitud de ${existing.nombre} (#${id}).`,
    })
    return { success: true }
  })

  fastify.get('/api/admin/proyectos', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.modules.includes('proyectos'))) return

    return {
      items: projectsRepo.list(),
      counts: projectsRepo.counts(),
    }
  })

  fastify.post('/api/admin/proyectos', { schema: projectBodySchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canEditProjects)) return

    const data = normalizeProjectPayload(request.body)
    if (!request.adminPermissions.canPublishProjects) {
      data.publicado = false
    }

    if (!data.titulo || !data.resumen) {
      return reply.code(400).send({ success: false, error: 'El título y el resumen son obligatorios.' })
    }
    if (!validateProjectImages(data)) {
      return reply.code(400).send({ success: false, error: 'Una o más rutas de imagen no son válidas.' })
    }

    const item = projectsRepo.create(data)
    logActivity(request, {
      modulo: 'proyectos',
      accion: data.publicado ? 'publicar_proyecto' : 'crear_borrador',
      descripcion: `${data.publicado ? 'Publicó' : 'Creó en borrador'} el proyecto "${item.titulo}".`,
    })
    return reply.code(201).send({ item })
  })

  fastify.put('/api/admin/proyectos/:id', { schema: projectBodySchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canEditProjects)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = projectsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })

    const data = normalizeProjectPayload(request.body)
    if (!request.adminPermissions.canPublishProjects) {
      data.publicado = Boolean(existing.publicado)
    }

    if (!data.titulo || !data.resumen) {
      return reply.code(400).send({ success: false, error: 'El título y el resumen son obligatorios.' })
    }
    if (!validateProjectImages(data)) {
      return reply.code(400).send({ success: false, error: 'Una o más rutas de imagen no son válidas.' })
    }

    const prevUrls = collectProjectUrls(existing)
    const item = projectsRepo.update(id, data)
    const currentUrls = new Set(collectProjectUrls(item))
    for (const oldUrl of prevUrls) {
      if (!currentUrls.has(oldUrl)) {
        uploadService.removeIfUnused(oldUrl, projectsRepo)
      }
    }

    logActivity(request, {
      modulo: 'proyectos',
      accion: 'actualizar_proyecto',
      descripcion: `Actualizó el proyecto "${item.titulo}" (${item.publicado ? 'Publicado' : 'Borrador'}).`,
    })
    return { item }
  })

  fastify.delete('/api/admin/proyectos/:id', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canDeleteProjects)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = projectsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })

    const prevUrls = collectProjectUrls(existing)
    projectsRepo.remove(id)
    for (const url of prevUrls) {
      uploadService.removeIfUnused(url, projectsRepo)
    }

    logActivity(request, {
      modulo: 'proyectos',
      accion: 'eliminar_proyecto',
      descripcion: `Eliminó el proyecto "${existing.titulo}".`,
    })
    return { success: true }
  })

  fastify.post(
    '/api/admin/uploads',
    { bodyLimit: 8 * 1024 * 1024, schema: uploadBodySchema },
    async (request, reply) => {
      if (!requirePerm(request, reply, (p) => p.canEditProjects)) return
      const result = uploadService.saveImage(request.body)
      return reply.code(201).send(result)
    },
  )

  fastify.get('/api/admin/users', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageUsers)) return

    const rawRol = typeof request.query?.rol === 'string' ? request.query.rol.trim() : ''
    const rawQ = typeof request.query?.q === 'string' ? request.query.q.trim() : ''
    const rawSortBy = typeof request.query?.sortBy === 'string' ? request.query.sortBy.trim() : 'username'
    const rawSortDir = typeof request.query?.sortDir === 'string' ? request.query.sortDir.trim() : 'asc'

    if (rawRol && !USER_ROLES.includes(rawRol)) {
      return reply.code(400).send({ success: false, error: 'Rol de usuario no válido.' })
    }
    if (rawQ.length > 100) {
      return reply.code(400).send({ success: false, error: 'El texto de búsqueda es demasiado largo.' })
    }

    const sortBy = VALID_SORT_BY.has(rawSortBy) ? rawSortBy : 'username'
    const sortDir = VALID_SORT_DIR.has(rawSortDir) ? rawSortDir : 'asc'

    return {
      items: usersRepo.list({ rol: rawRol || undefined, q: rawQ || undefined, sortBy, sortDir }),
      counts: usersRepo.counts(),
      roles: USER_ROLES,
    }
  })

  fastify.post('/api/admin/users', { schema: userBodySchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageUsers)) return

    const username = String(request.body.username || '').trim()
    const nombre = String(request.body.nombre || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const rol = request.body.rol
    const estado = request.body.estado || 'activo'
    const password = String(request.body.password || '')

    if (!nombre || !emailPattern.test(email)) {
      return reply.code(400).send({ success: false, error: 'Debe ingresar nombre y un correo válido.' })
    }
    if (password && password.length < 6) {
      return reply.code(400).send({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const item = usersRepo.create({ username, nombre, email, rol, estado, password })
    logActivity(request, {
      modulo: 'usuarios',
      accion: 'crear_usuario',
      descripcion: `Creó al usuario @${item.username} (${item.rol}).`,
    })
    return reply.code(201).send({ item })
  })

  fastify.put('/api/admin/users/:id', { schema: userBodySchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageUsers)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = usersRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Usuario no encontrado.' })

    const username = String(request.body.username || '').trim()
    const nombre = String(request.body.nombre || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const rol = request.body.rol
    const estado = request.body.estado || 'activo'
    const password = String(request.body.password || '')

    if (!nombre || !emailPattern.test(email)) {
      return reply.code(400).send({ success: false, error: 'Debe ingresar nombre y un correo válido.' })
    }
    if (password && password.length < 6) {
      return reply.code(400).send({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    if (
      existing.rol === 'administrador' &&
      existing.estado === 'activo' &&
      (rol !== 'administrador' || estado !== 'activo') &&
      usersRepo.countActiveAdmins(id) === 0
    ) {
      return reply.code(400).send({
        success: false,
        error: 'Debe existir al menos un usuario administrador activo.',
      })
    }

    const item = usersRepo.update(id, { username, nombre, email, rol, estado, password })

    if (estado !== 'activo' || rol === 'ninguno') {
      sessionsRepo.revokeAllForUser(id)
    } else if (password) {
      sessionsRepo.revokeAllForUser(id, {
        exceptTokenHash: id === request.adminUser.id ? request.sessionTokenHash : undefined,
      })
    }

    logActivity(request, {
      modulo: 'usuarios',
      accion: 'actualizar_usuario',
      descripcion: `Actualizó al usuario @${item.username} (${item.rol}, ${item.estado}).`,
    })
    return { item }
  })

  fastify.post('/api/admin/users/bulk', { schema: userBulkSchema }, async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageUsers)) return

    const { action, ids, rol, estado } = request.body
    const uniqueIds = [...new Set(ids)]
    const allUsers = usersRepo.list({})
    const targetSet = new Set(uniqueIds)
    const remainingActiveAdmins = allUsers.filter(
      (u) => !targetSet.has(u.id) && u.rol === 'administrador' && u.estado === 'activo',
    ).length

    const threatensLastAdmin =
      action === 'delete' ||
      (action === 'set_role' && rol !== 'administrador') ||
      (action === 'set_state' && estado !== 'activo')

    if (threatensLastAdmin && remainingActiveAdmins === 0) {
      return reply.code(400).send({
        success: false,
        error: 'Debe existir al menos un usuario administrador activo.',
      })
    }

    let affected = 0

    if (action === 'set_role') {
      if (!rol) return reply.code(400).send({ success: false, error: 'Debe seleccionar una función para aplicar.' })
      affected = usersRepo.bulkUpdateRole(uniqueIds, rol)
      if (rol === 'ninguno') {
        for (const uid of uniqueIds) sessionsRepo.revokeAllForUser(uid)
      }
      logActivity(request, {
        modulo: 'usuarios',
        accion: 'cambio_masivo_rol',
        descripcion: `Cambió la función a "${rol}" en ${affected} usuario(s).`,
      })
    } else if (action === 'set_state') {
      if (!estado) return reply.code(400).send({ success: false, error: 'Debe indicar el estado a aplicar.' })
      affected = usersRepo.bulkUpdateState(uniqueIds, estado)
      if (estado !== 'activo') {
        for (const uid of uniqueIds) sessionsRepo.revokeAllForUser(uid)
      }
      logActivity(request, {
        modulo: 'usuarios',
        accion: 'cambio_masivo_estado',
        descripcion: `Marcó como ${estado} a ${affected} usuario(s).`,
      })
    } else if (action === 'delete') {
      affected = usersRepo.bulkRemove(uniqueIds)
      logActivity(request, {
        modulo: 'usuarios',
        accion: 'eliminar_masivo_usuarios',
        descripcion: `Eliminó ${affected} usuario(s) de forma masiva.`,
      })
    }

    return {
      success: true,
      affected,
      counts: usersRepo.counts(),
    }
  })

  fastify.delete('/api/admin/users/:id', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canManageUsers)) return

    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = usersRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Usuario no encontrado.' })

    if (
      existing.rol === 'administrador' &&
      existing.estado === 'activo' &&
      usersRepo.countActiveAdmins(id) === 0
    ) {
      return reply.code(400).send({
        success: false,
        error: 'Debe existir al menos un usuario administrador activo.',
      })
    }

    usersRepo.remove(id)
    logActivity(request, {
      modulo: 'usuarios',
      accion: 'eliminar_usuario',
      descripcion: `Eliminó al usuario @${existing.username} (${existing.email}).`,
    })
    return { success: true }
  })

  fastify.get('/api/admin/files/roots', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canAccessFiles)) return
    return { roots: fileExplorerService.getRoots() }
  })

  fastify.get('/api/admin/files/tree', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canAccessFiles)) return
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    return fileExplorerService.listDirectory(root, relPath)
  })

  fastify.get('/api/admin/files/preview', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canAccessFiles)) return
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    return fileExplorerService.previewFile(root, relPath)
  })

  fastify.put(
    '/api/admin/files/content',
    { bodyLimit: 1024 * 1024, schema: fileWriteSchema },
    async (request, reply) => {
      if (!requirePerm(request, reply, (p) => p.canWriteFiles)) return
      const { root, path: relPath, content } = request.body
      const file = fileExplorerService.writeFile(root, relPath, content)
      logActivity(request, {
        modulo: 'archivos',
        accion: 'editar_archivo',
        descripcion: `Guardó cambios en ${file.path} desde el editor IDE.`,
      })
      return { success: true, file }
    },
  )

  fastify.post(
    '/api/admin/files/create',
    { bodyLimit: 1024 * 1024, schema: fileCreateSchema },
    async (request, reply) => {
      if (!requirePerm(request, reply, (p) => p.canWriteFiles)) return
      const { root, path: relPath, type, content = '' } = request.body
      const entry = fileExplorerService.createEntry(root, relPath, type, content)
      logActivity(request, {
        modulo: 'archivos',
        accion: type === 'dir' ? 'crear_carpeta' : 'crear_archivo',
        descripcion: `Creó ${type === 'dir' ? 'la carpeta' : 'el archivo'} ${entry.path} desde el IDE.`,
      })
      return reply.code(201).send({ success: true, entry })
    },
  )

  fastify.delete('/api/admin/files/entry', async (request, reply) => {
    if (!requirePerm(request, reply, (p) => p.canWriteFiles)) return
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    fileExplorerService.deleteEntry(root, relPath)
    logActivity(request, {
      modulo: 'archivos',
      accion: 'eliminar_archivo',
      descripcion: `Eliminó ${relPath} desde el editor IDE.`,
    })
    return { success: true }
  })
}
