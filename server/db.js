import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    nombre TEXT NOT NULL,
    empresa TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    especialidad TEXT NOT NULL DEFAULT '',
    detalle TEXT NOT NULL,
    consentimiento_at TEXT NOT NULL,
    ip_hash TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'nueva',
    leida_at TEXT,
    notas TEXT NOT NULL DEFAULT '',
    aviso_estado TEXT NOT NULL DEFAULT 'pendiente',
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes (estado, created_at)',
  `CREATE TABLE IF NOT EXISTS respuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solicitud_id INTEGER NOT NULL REFERENCES solicitudes (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    asunto TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    envio_estado TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT ''
  )`,
  'CREATE INDEX IF NOT EXISTS idx_respuestas_solicitud ON respuestas (solicitud_id, created_at)',
  `CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    ubicacion TEXT NOT NULL DEFAULT '',
    anio TEXT NOT NULL DEFAULT '',
    resumen TEXT NOT NULL,
    contenido TEXT NOT NULL DEFAULT '',
    imagen_url TEXT NOT NULL DEFAULT '',
    imagen_alt TEXT NOT NULL DEFAULT '',
    imagenes_json TEXT NOT NULL DEFAULT '[]',
    publicado INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_proyectos_publicados ON proyectos (publicado, published_at)',
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL DEFAULT '',
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    rol TEXT NOT NULL DEFAULT 'editor',
    estado TEXT NOT NULL DEFAULT 'activo',
    password_hash TEXT NOT NULL DEFAULT '',
    ultimo_acceso TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS actividad_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    modulo TEXT NOT NULL,
    accion TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'Panel Admin'
  )`,
  'CREATE INDEX IF NOT EXISTS idx_actividad_created ON actividad_log (created_at DESC)',
  `CREATE TABLE IF NOT EXISTS health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checked_at TEXT NOT NULL,
    target_url TEXT NOT NULL,
    status TEXT NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT ''
  )`,
  'CREATE INDEX IF NOT EXISTS idx_health_checked ON health_checks (checked_at DESC)',
]

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA foreign_keys = ON')
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  for (const statement of MIGRATIONS) db.exec(statement)
  ensureColumn(db, 'proyectos', 'imagenes_json', "TEXT NOT NULL DEFAULT '[]'")
  ensureColumn(db, 'usuarios', 'username', "TEXT NOT NULL DEFAULT ''")
  return db
}
