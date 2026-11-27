const now = () => new Date().toISOString()

const PUBLIC_COLUMNS =
  'id, slug, titulo, categoria, ubicacion, anio, resumen, imagen_url, imagen_alt, imagenes_json, published_at'

export function slugify(value) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'proyecto'
}

function normalizeImages(list) {
  if (!Array.isArray(list)) return []
  const seen = new Set()
  const out = []
  for (const item of list) {
    const url = String(item?.url || '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({
      url,
      alt: String(item?.alt || '').trim().slice(0, 180),
    })
    if (out.length >= 12) break
  }
  return out
}

function hydrate(row) {
  if (!row) return null
  let parsed = []
  if (row.imagenes_json) {
    try {
      parsed = normalizeImages(JSON.parse(row.imagenes_json))
    } catch {
      parsed = []
    }
  }
  if (!parsed.length && row.imagen_url) {
    parsed = [{ url: row.imagen_url, alt: row.imagen_alt || '' }]
  }

  const { imagenes_json: _ignored, ...rest } = row
  return {
    ...rest,
    publicado: rest.publicado !== undefined ? Boolean(rest.publicado) : true,
    imagenes: parsed,
  }
}

export function createProjectsRepository(db) {
  const statements = {
    all: db.prepare('SELECT * FROM proyectos ORDER BY updated_at DESC'),
    findById: db.prepare('SELECT * FROM proyectos WHERE id = ?'),
    slugTaken: db.prepare('SELECT id FROM proyectos WHERE slug = ? AND id != ?'),
    published: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM proyectos WHERE publicado = 1
      ORDER BY published_at DESC LIMIT ?`),
    publishedBySlug: db.prepare('SELECT * FROM proyectos WHERE slug = ? AND publicado = 1'),
    insert: db.prepare(`INSERT INTO proyectos
      (slug, titulo, categoria, ubicacion, anio, resumen, contenido, imagen_url, imagen_alt, imagenes_json, publicado, published_at, created_at, updated_at)
      VALUES (:slug, :titulo, :categoria, :ubicacion, :anio, :resumen, :contenido, :imagen_url, :imagen_alt, :imagenes_json, :publicado, :published_at, :at, :at)`),
    update: db.prepare(`UPDATE proyectos SET slug = :slug, titulo = :titulo, categoria = :categoria, ubicacion = :ubicacion,
      anio = :anio, resumen = :resumen, contenido = :contenido, imagen_url = :imagen_url, imagen_alt = :imagen_alt,
      imagenes_json = :imagenes_json, publicado = :publicado, published_at = :published_at, updated_at = :at WHERE id = :id`),
    remove: db.prepare('DELETE FROM proyectos WHERE id = ?'),
    counts: db.prepare('SELECT publicado, COUNT(*) AS total FROM proyectos GROUP BY publicado'),
    imageInUse: db.prepare('SELECT COUNT(*) AS total FROM proyectos WHERE imagen_url = ? OR imagenes_json LIKE ?'),
  }

  const uniqueSlug = (title, id = 0) => {
    const base = slugify(title)
    let candidate = base
    let suffix = 2
    while (statements.slugTaken.get(candidate, id)) {
      candidate = `${base}-${suffix}`
      suffix += 1
    }
    return candidate
  }

  const toParams = (data) => {
    let imagenes = normalizeImages(data.imagenes)
    if (!imagenes.length && data.imagen_url) {
      imagenes = normalizeImages([{ url: data.imagen_url, alt: data.imagen_alt || '' }])
    }

    return {
      titulo: data.titulo,
      categoria: data.categoria || '',
      ubicacion: data.ubicacion || '',
      anio: data.anio || '',
      resumen: data.resumen,
      contenido: data.contenido || '',
      imagen_url: imagenes[0]?.url || '',
      imagen_alt: imagenes[0]?.alt || '',
      imagenes_json: JSON.stringify(imagenes),
      publicado: data.publicado ? 1 : 0,
    }
  }

  return {
    list() {
      return statements.all.all().map(hydrate)
    },

    findById(id) {
      return hydrate(statements.findById.get(id))
    },

    listPublished(limit = 60) {
      return statements.published.all(limit).map(hydrate)
    },

    findPublishedBySlug(slug) {
      return hydrate(statements.publishedBySlug.get(slug))
    },

    create(data) {
      const at = now()
      const params = toParams(data)
      const result = statements.insert.run({
        ...params,
        slug: uniqueSlug(data.titulo),
        published_at: params.publicado ? at : null,
        at,
      })
      return this.findById(Number(result.lastInsertRowid))
    },

    update(id, data) {
      const current = this.findById(id)
      if (!current) return null
      const at = now()
      const params = toParams(data)
      const titleChanged = current.titulo !== params.titulo
      statements.update.run({
        ...params,
        id,
        // El enlace público solo cambia si se modifica el título y el proyecto aún no se ha publicado.
        slug: titleChanged && !current.published_at ? uniqueSlug(params.titulo, id) : current.slug,
        published_at: params.publicado ? current.published_at || at : current.published_at,
        at,
      })
      return this.findById(id)
    },

    remove(id) {
      return statements.remove.run(id).changes > 0
    },

    counts() {
      const totals = { publicados: 0, borradores: 0 }
      for (const row of statements.counts.all()) {
        if (row.publicado) totals.publicados = Number(row.total)
        else totals.borradores = Number(row.total)
      }
      return totals
    },

    isImageInUse(url) {
      return Number(statements.imageInUse.get(url, `%${url}%`).total) > 0
    },
  }
}
