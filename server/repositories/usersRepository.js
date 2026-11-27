import crypto from 'node:crypto'

export const USER_ROLES = ['administrador', 'editor', 'autor', 'colaborador', 'lector', 'ninguno']
export const USER_STATES = ['activo', 'inactivo']

const SORT_COLUMNS = {
  username: "CASE WHEN username != '' THEN LOWER(username) ELSE LOWER(email) END",
  nombre: 'LOWER(nombre)',
  email: 'LOWER(email)',
  rol: 'LOWER(rol)',
  created_at: 'created_at',
}

const now = () => new Date().toISOString()

export function normalizeUsername(rawUsername, email) {
  const source = String(rawUsername || '').trim() || String(email || '').split('@')[0]
  const clean = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 60)
  return clean || `usuario${crypto.randomInt(100, 999)}`
}

export function hashPassword(password) {
  if (!password) return ''
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${derived}`
}

function sanitize(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username || (row.email ? row.email.split('@')[0] : ''),
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    estado: row.estado,
    has_password: Boolean(row.password_hash),
    ultimo_acceso: row.ultimo_acceso,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function createConflictError(message) {
  const err = new Error(message)
  err.statusCode = 409
  return err
}

function isUniqueError(error) {
  const msg = String(error?.message || '')
  return error?.code === 'ERR_SQLITE_ERROR' && msg.toUpperCase().includes('UNIQUE')
}

export function createUsersRepository(db) {
  const statements = {
    findById: db.prepare('SELECT * FROM usuarios WHERE id = ?'),
    usernameTaken: db.prepare('SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?) AND id != ?'),
    insert: db.prepare(`INSERT INTO usuarios
      (username, nombre, email, rol, estado, password_hash, created_at, updated_at)
      VALUES (:username, :nombre, :email, :rol, :estado, :password_hash, :at, :at)`),
    updateWithPass: db.prepare(`UPDATE usuarios
      SET username = :username, nombre = :nombre, email = :email, rol = :rol, estado = :estado,
          password_hash = :password_hash, updated_at = :at
      WHERE id = :id`),
    updateNoPass: db.prepare(`UPDATE usuarios
      SET username = :username, nombre = :nombre, email = :email, rol = :rol, estado = :estado,
          updated_at = :at
      WHERE id = :id`),
    remove: db.prepare('DELETE FROM usuarios WHERE id = ?'),
    byRole: db.prepare('SELECT rol, COUNT(*) AS total FROM usuarios GROUP BY rol'),
    byState: db.prepare('SELECT estado, COUNT(*) AS total FROM usuarios GROUP BY estado'),
  }

  return {
    list({ rol, q, sortBy = 'username', sortDir = 'asc' } = {}) {
      const where = []
      const params = {}
      if (rol) {
        where.push('rol = :rol')
        params.rol = rol
      }
      if (q) {
        where.push('(username LIKE :q OR nombre LIKE :q OR email LIKE :q)')
        params.q = `%${q}%`
      }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const orderExpr = SORT_COLUMNS[sortBy] || SORT_COLUMNS.username
      const dir = sortDir === 'desc' ? 'DESC' : 'ASC'
      const rows = db
        .prepare(`SELECT * FROM usuarios ${clause} ORDER BY ${orderExpr} ${dir}, id DESC LIMIT 500`)
        .all(params)
      return rows.map(sanitize)
    },

    counts() {
      const counts = {
        total: 0,
        activos: 0,
        inactivos: 0,
        roles: Object.fromEntries(USER_ROLES.map((role) => [role, 0])),
      }
      for (const row of statements.byRole.all()) {
        counts.roles[row.rol] = Number(row.total)
        counts.total += Number(row.total)
      }
      for (const row of statements.byState.all()) {
        if (row.estado === 'activo') counts.activos = Number(row.total)
        else counts.inactivos = Number(row.total)
      }
      return counts
    },

    findById(id) {
      return sanitize(statements.findById.get(id))
    },

    create({ username, nombre, email, rol, estado = 'activo', password = '' }) {
      const cleanEmail = String(email || '').trim().toLowerCase()
      const cleanUsername = normalizeUsername(username, cleanEmail)
      if (statements.usernameTaken.get(cleanUsername, 0)) {
        throw createConflictError('Ese nombre de usuario ya está en uso.')
      }

      const at = now()
      try {
        const result = statements.insert.run({
          username: cleanUsername,
          nombre: String(nombre || '').trim(),
          email: cleanEmail,
          rol,
          estado,
          password_hash: password ? hashPassword(password) : '',
          at,
        })
        return this.findById(Number(result.lastInsertRowid))
      } catch (error) {
        if (isUniqueError(error)) {
          throw createConflictError('Ya existe un usuario registrado con ese correo electrónico.')
        }
        throw error
      }
    },

    update(id, { username, nombre, email, rol, estado = 'activo', password = '' }) {
      const existing = statements.findById.get(id)
      if (!existing) return null

      const cleanEmail = String(email || '').trim().toLowerCase()
      const cleanUsername = normalizeUsername(username || existing.username, cleanEmail)
      if (statements.usernameTaken.get(cleanUsername, id)) {
        throw createConflictError('Ese nombre de usuario ya pertenece a otra cuenta.')
      }

      const at = now()
      try {
        if (password) {
          statements.updateWithPass.run({
            id,
            username: cleanUsername,
            nombre: String(nombre || '').trim(),
            email: cleanEmail,
            rol,
            estado,
            password_hash: hashPassword(password),
            at,
          })
        } else {
          statements.updateNoPass.run({
            id,
            username: cleanUsername,
            nombre: String(nombre || '').trim(),
            email: cleanEmail,
            rol,
            estado,
            at,
          })
        }
        return this.findById(id)
      } catch (error) {
        if (isUniqueError(error)) {
          throw createConflictError('Ya existe otro usuario registrado con ese correo electrónico.')
        }
        throw error
      }
    },

    remove(id) {
      return statements.remove.run(id).changes > 0
    },

    bulkUpdateRole(ids, rol) {
      if (!ids?.length) return 0
      const placeholders = ids.map(() => '?').join(', ')
      return db
        .prepare(`UPDATE usuarios SET rol = ?, updated_at = ? WHERE id IN (${placeholders})`)
        .run(rol, now(), ...ids).changes
    },

    bulkUpdateState(ids, estado) {
      if (!ids?.length) return 0
      const placeholders = ids.map(() => '?').join(', ')
      return db
        .prepare(`UPDATE usuarios SET estado = ?, updated_at = ? WHERE id IN (${placeholders})`)
        .run(estado, now(), ...ids).changes
    },

    bulkRemove(ids) {
      if (!ids?.length) return 0
      const placeholders = ids.map(() => '?').join(', ')
      return db.prepare(`DELETE FROM usuarios WHERE id IN (${placeholders})`).run(...ids).changes
    },
  }
}
