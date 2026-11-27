import { REQUEST_STATES } from '../repositories/requestsRepository.js'
import { USER_ROLES, USER_STATES } from '../repositories/usersRepository.js'

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
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
    systemInfoService,
    uptimeMonitor,
    fileExplorerService,
  },
) {
  const logActivity = (entry) => {
    if (activityRepo) activityRepo.record(entry)
  }

  fastify.addHook('preHandler', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    reply.header('X-Robots-Tag', 'noindex, nofollow')

    if (!config.admin.allowRemote && !LOOPBACK_IPS.has(request.ip)) {
      return reply.code(403).send({
        success: false,
        error: 'Acceso administrativo restringido al entorno local mientras se habilita el inicio de sesión.',
      })
    }
  })

  fastify.get('/api/admin/overview', async () => {
    return {
      smtp: {
        transport: config.mailTransport,
        configured: mailService.isSmtpConfigured,
        host: config.smtp.host,
        port: config.smtp.port,
        contactTo: config.recipients.default,
        mailFrom: config.mailFrom,
      },
      admin: {
        allowRemote: config.admin.allowRemote,
      },
      solicitudes: requestsRepo.counts(),
      proyectos: projectsRepo.counts(),
      usuarios: usersRepo.counts(),
      recientes: requestsRepo.latest(5),
      system: systemInfoService.getSnapshot(),
      uptime: uptimeMonitor.getSummary(),
      actividad: activityRepo.list(15),
    }
  })

  fastify.post('/api/admin/uptime/check', async () => {
    const check = await uptimeMonitor.runCheck()
    return {
      check,
      uptime: uptimeMonitor.getSummary(),
    }
  })

  fastify.get('/api/admin/solicitudes', async (request, reply) => {
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
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    requestsRepo.markRead(id)
    return { item: requestsRepo.findWithReplies(id) }
  })

  fastify.patch('/api/admin/solicitudes/:id', { schema: patchRequestSchema }, async (request, reply) => {
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    requestsRepo.update(id, request.body)
    logActivity({
      modulo: 'solicitudes',
      accion: 'actualizar_solicitud',
      descripcion: `Actualizó seguimiento de ${existing.nombre}${request.body.estado ? ` (${request.body.estado})` : ''}.`,
    })
    return { item: requestsRepo.findWithReplies(id) }
  })

  fastify.post('/api/admin/solicitudes/:id/reply', { schema: replyRequestSchema }, async (request, reply) => {
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
      logActivity({
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
      logActivity({
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
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = requestsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Solicitud no encontrada.' })

    requestsRepo.remove(id)
    logActivity({
      modulo: 'solicitudes',
      accion: 'eliminar_solicitud',
      descripcion: `Eliminó la solicitud de ${existing.nombre} (#${id}).`,
    })
    return { success: true }
  })

  fastify.get('/api/admin/proyectos', async () => {
    return {
      items: projectsRepo.list(),
      counts: projectsRepo.counts(),
    }
  })

  fastify.post('/api/admin/proyectos', { schema: projectBodySchema }, async (request, reply) => {
    const data = normalizeProjectPayload(request.body)
    if (!data.titulo || !data.resumen) {
      return reply.code(400).send({ success: false, error: 'El título y el resumen son obligatorios.' })
    }
    if (!validateProjectImages(data)) {
      return reply.code(400).send({ success: false, error: 'Una o más rutas de imagen no son válidas.' })
    }

    const item = projectsRepo.create(data)
    logActivity({
      modulo: 'proyectos',
      accion: data.publicado ? 'publicar_proyecto' : 'crear_borrador',
      descripcion: `${data.publicado ? 'Publicó' : 'Creó en borrador'} el proyecto "${item.titulo}".`,
    })
    return reply.code(201).send({ item })
  })

  fastify.put('/api/admin/proyectos/:id', { schema: projectBodySchema }, async (request, reply) => {
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = projectsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })

    const data = normalizeProjectPayload(request.body)
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

    logActivity({
      modulo: 'proyectos',
      accion: 'actualizar_proyecto',
      descripcion: `Actualizó el proyecto "${item.titulo}" (${item.publicado ? 'Publicado' : 'Borrador'}).`,
    })
    return { item }
  })

  fastify.delete('/api/admin/proyectos/:id', async (request, reply) => {
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = projectsRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })

    const prevUrls = collectProjectUrls(existing)
    projectsRepo.remove(id)
    for (const url of prevUrls) {
      uploadService.removeIfUnused(url, projectsRepo)
    }

    logActivity({
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
      const result = uploadService.saveImage(request.body)
      return reply.code(201).send(result)
    },
  )

  fastify.get('/api/admin/users', async (request, reply) => {
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
    const username = String(request.body.username || '').trim()
    const nombre = String(request.body.nombre || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const rol = request.body.rol
    const estado = request.body.estado || 'activo'
    const password = String(request.body.password || '')

    if (!nombre || !emailPattern.test(email)) {
      return reply.code(400).send({ success: false, error: 'Debe ingresar nombre y un correo válido.' })
    }
    if (password && password.length < 8) {
      return reply.code(400).send({ success: false, error: 'La contraseña debe tener al menos 8 caracteres.' })
    }

    const item = usersRepo.create({ username, nombre, email, rol, estado, password })
    logActivity({
      modulo: 'usuarios',
      accion: 'crear_usuario',
      descripcion: `Creó al usuario @${item.username} (${item.rol}).`,
    })
    return reply.code(201).send({ item })
  })

  fastify.put('/api/admin/users/:id', { schema: userBodySchema }, async (request, reply) => {
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const username = String(request.body.username || '').trim()
    const nombre = String(request.body.nombre || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const rol = request.body.rol
    const estado = request.body.estado || 'activo'
    const password = String(request.body.password || '')

    if (!nombre || !emailPattern.test(email)) {
      return reply.code(400).send({ success: false, error: 'Debe ingresar nombre y un correo válido.' })
    }
    if (password && password.length < 8) {
      return reply.code(400).send({ success: false, error: 'La contraseña debe tener al menos 8 caracteres.' })
    }

    const item = usersRepo.update(id, { username, nombre, email, rol, estado, password })
    if (!item) return reply.code(404).send({ success: false, error: 'Usuario no encontrado.' })

    logActivity({
      modulo: 'usuarios',
      accion: 'actualizar_usuario',
      descripcion: `Actualizó al usuario @${item.username} (${item.rol}, ${item.estado}).`,
    })
    return { item }
  })

  fastify.post('/api/admin/users/bulk', { schema: userBulkSchema }, async (request, reply) => {
    const { action, ids, rol, estado } = request.body
    const uniqueIds = [...new Set(ids)]
    let affected = 0

    if (action === 'set_role') {
      if (!rol) return reply.code(400).send({ success: false, error: 'Debe seleccionar una función para aplicar.' })
      affected = usersRepo.bulkUpdateRole(uniqueIds, rol)
      logActivity({
        modulo: 'usuarios',
        accion: 'cambio_masivo_rol',
        descripcion: `Cambió la función a "${rol}" en ${affected} usuario(s).`,
      })
    } else if (action === 'set_state') {
      if (!estado) return reply.code(400).send({ success: false, error: 'Debe indicar el estado a aplicar.' })
      affected = usersRepo.bulkUpdateState(uniqueIds, estado)
      logActivity({
        modulo: 'usuarios',
        accion: 'cambio_masivo_estado',
        descripcion: `Marcó como ${estado} a ${affected} usuario(s).`,
      })
    } else if (action === 'delete') {
      affected = usersRepo.bulkRemove(uniqueIds)
      logActivity({
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
    const id = parseId(request.params.id)
    if (!id) return reply.code(400).send({ success: false, error: 'Identificador inválido.' })

    const existing = usersRepo.findById(id)
    if (!existing) return reply.code(404).send({ success: false, error: 'Usuario no encontrado.' })

    usersRepo.remove(id)
    logActivity({
      modulo: 'usuarios',
      accion: 'eliminar_usuario',
      descripcion: `Eliminó al usuario @${existing.username} (${existing.email}).`,
    })
    return { success: true }
  })

  fastify.get('/api/admin/files/roots', async () => {
    return { roots: fileExplorerService.getRoots() }
  })

  fastify.get('/api/admin/files/tree', async (request) => {
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    return fileExplorerService.listDirectory(root, relPath)
  })

  fastify.get('/api/admin/files/preview', async (request) => {
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    return fileExplorerService.previewFile(root, relPath)
  })

  fastify.put(
    '/api/admin/files/content',
    { bodyLimit: 1024 * 1024, schema: fileWriteSchema },
    async (request) => {
      const { root, path: relPath, content } = request.body
      const file = fileExplorerService.writeFile(root, relPath, content)
      logActivity({
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
      const { root, path: relPath, type, content = '' } = request.body
      const entry = fileExplorerService.createEntry(root, relPath, type, content)
      logActivity({
        modulo: 'archivos',
        accion: type === 'dir' ? 'crear_carpeta' : 'crear_archivo',
        descripcion: `Creó ${type === 'dir' ? 'la carpeta' : 'el archivo'} ${entry.path} desde el IDE.`,
      })
      return reply.code(201).send({ success: true, entry })
    },
  )

  fastify.delete('/api/admin/files/entry', async (request) => {
    const root = typeof request.query?.root === 'string' ? request.query.root : 'project'
    const relPath = typeof request.query?.path === 'string' ? request.query.path : ''
    fileExplorerService.deleteEntry(root, relPath)
    logActivity({
      modulo: 'archivos',
      accion: 'eliminar_archivo',
      descripcion: `Eliminó ${relPath} desde el editor IDE.`,
    })
    return { success: true }
  })
}
