const MAX_LOG_ROWS = 500

export function createActivityRepository(db) {
  const statements = {
    insert: db.prepare(`INSERT INTO actividad_log (created_at, modulo, accion, descripcion, actor)
      VALUES (:created_at, :modulo, :accion, :descripcion, :actor)`),
    list: db.prepare('SELECT id, created_at, modulo, accion, descripcion, actor FROM actividad_log ORDER BY id DESC LIMIT ?'),
    prune: db.prepare(`DELETE FROM actividad_log WHERE id NOT IN (
      SELECT id FROM actividad_log ORDER BY id DESC LIMIT ?
    )`),
  }

  return {
    record({ modulo, accion, descripcion, actor = 'Panel Admin' }) {
      statements.insert.run({
        created_at: new Date().toISOString(),
        modulo,
        accion,
        descripcion,
        actor,
      })
      statements.prune.run(MAX_LOG_ROWS)
    },

    list(limit = 20) {
      return statements.list.all(limit)
    },
  }
}
