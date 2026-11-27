export const REQUEST_STATES = ['nueva', 'leida', 'respondida', 'archivada']

const LIST_COLUMNS = `id, created_at, nombre, empresa, email, telefono, especialidad,
  substr(detalle, 1, 160) AS extracto, estado, leida_at, aviso_estado, updated_at`

const now = () => new Date().toISOString()

export function createRequestsRepository(db) {
  const statements = {
    insert: db.prepare(`INSERT INTO solicitudes
      (created_at, nombre, empresa, email, telefono, especialidad, detalle, consentimiento_at, ip_hash, updated_at)
      VALUES (:created_at, :nombre, :empresa, :email, :telefono, :especialidad, :detalle, :consentimiento_at, :ip_hash, :created_at)`),
    findById: db.prepare('SELECT * FROM solicitudes WHERE id = ?'),
    markRead: db.prepare(`UPDATE solicitudes SET estado = 'leida', leida_at = :at, updated_at = :at
      WHERE id = :id AND estado = 'nueva'`),
    setNoticeState: db.prepare('UPDATE solicitudes SET aviso_estado = ?, updated_at = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM solicitudes WHERE id = ?'),
    counts: db.prepare('SELECT estado, COUNT(*) AS total FROM solicitudes GROUP BY estado'),
    latest: db.prepare(`SELECT ${LIST_COLUMNS} FROM solicitudes ORDER BY created_at DESC LIMIT ?`),
    replies: db.prepare('SELECT * FROM respuestas WHERE solicitud_id = ? ORDER BY created_at ASC'),
    insertReply: db.prepare(`INSERT INTO respuestas (solicitud_id, created_at, asunto, mensaje, envio_estado, error)
      VALUES (:solicitud_id, :created_at, :asunto, :mensaje, :envio_estado, :error)`),
    markAnswered: db.prepare(`UPDATE solicitudes SET estado = 'respondida', leida_at = COALESCE(leida_at, :at), updated_at = :at
      WHERE id = :id`),
  }

  return {
    create(data) {
      const createdAt = now()
      const result = statements.insert.run({
        created_at: createdAt,
        nombre: data.nombre,
        empresa: data.empresa || '',
        email: data.email,
        telefono: data.telefono,
        especialidad: data.especialidad || '',
        detalle: data.detalle,
        consentimiento_at: createdAt,
        ip_hash: data.ipHash || '',
      })
      return Number(result.lastInsertRowid)
    },

    list({ estado, q } = {}) {
      const where = []
      const params = {}
      if (estado) {
        where.push('estado = :estado')
        params.estado = estado
      } else {
        // La vista "Todas" no incluye archivadas para mantener la bandeja limpia.
        where.push("estado != 'archivada'")
      }
      if (q) {
        where.push('(nombre LIKE :q OR empresa LIKE :q OR email LIKE :q OR especialidad LIKE :q OR detalle LIKE :q)')
        params.q = `%${q}%`
      }
      const sql = `SELECT ${LIST_COLUMNS} FROM solicitudes WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 500`
      return db.prepare(sql).all(params)
    },

    counts() {
      const totals = Object.fromEntries(REQUEST_STATES.map((state) => [state, 0]))
      for (const row of statements.counts.all()) totals[row.estado] = Number(row.total)
      totals.total = REQUEST_STATES.reduce((sum, state) => sum + totals[state], 0)
      return totals
    },

    latest(limit = 5) {
      return statements.latest.all(limit)
    },

    findById(id) {
      return statements.findById.get(id) || null
    },

    findWithReplies(id) {
      const request = this.findById(id)
      if (!request) return null
      return { ...request, respuestas: statements.replies.all(id) }
    },

    markRead(id) {
      statements.markRead.run({ id, at: now() })
    },

    update(id, { estado, notas }) {
      const sets = []
      const params = { id, at: now() }
      if (estado !== undefined) {
        sets.push('estado = :estado')
        params.estado = estado
      }
      if (notas !== undefined) {
        sets.push('notas = :notas')
        params.notas = notas
      }
      if (!sets.length) return this.findById(id)
      sets.push('updated_at = :at')
      db.prepare(`UPDATE solicitudes SET ${sets.join(', ')} WHERE id = :id`).run(params)
      return this.findById(id)
    },

    setNoticeState(id, state) {
      statements.setNoticeState.run(state, now(), id)
    },

    remove(id) {
      return statements.remove.run(id).changes > 0
    },

    addReply({ solicitudId, asunto, mensaje, envioEstado, error = '' }) {
      const createdAt = now()
      db.exec('BEGIN')
      try {
        statements.insertReply.run({
          solicitud_id: solicitudId,
          created_at: createdAt,
          asunto,
          mensaje,
          envio_estado: envioEstado,
          error,
        })
        if (envioEstado !== 'error') statements.markAnswered.run({ id: solicitudId, at: createdAt })
        db.exec('COMMIT')
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
  }
}
