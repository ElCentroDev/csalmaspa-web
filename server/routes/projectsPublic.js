import fs from 'node:fs/promises'

const SLUG_PATTERN = /^[a-z0-9-]+$/

export default async function projectsPublicRoutes(fastify, { projectsRepo, uploadService }) {
  fastify.get('/api/proyectos', async () => {
    return { items: projectsRepo.listPublished(60) }
  })

  fastify.get('/api/proyectos/:slug', async (request, reply) => {
    const { slug } = request.params
    if (!slug || slug.length > 100 || !SLUG_PATTERN.test(slug)) {
      return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })
    }

    const item = projectsRepo.findPublishedBySlug(slug)
    if (!item) {
      return reply.code(404).send({ success: false, error: 'Proyecto no encontrado.' })
    }

    return { item }
  })

  fastify.get('/api/uploads/:filename', async (request, reply) => {
    const resolved = uploadService.resolveUploadPath(request.params.filename)
    if (!resolved) {
      return reply.code(404).send({ success: false, error: 'Archivo no encontrado.' })
    }

    const buffer = await fs.readFile(resolved.filePath)
    reply.header('Content-Type', resolved.contentType)
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
    return reply.send(buffer)
  })
}
