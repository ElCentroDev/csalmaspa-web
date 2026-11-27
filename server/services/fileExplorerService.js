import fs from 'node:fs'
import path from 'node:path'

const MAX_PREVIEW_BYTES = 128 * 1024
const MAX_WRITE_BYTES = 512 * 1024

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.json',
  '.css',
  '.html',
  '.md',
  '.txt',
  '.svg',
  '.sh',
  '.yml',
  '.yaml',
  '.example',
  '.conf',
  '.xml',
])

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

const PROTECTED_DELETE_PATHS = new Set([
  '',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'index.html',
  'src',
  'server',
  'public',
])

function createExplorerError(message, statusCode = 403) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function isBlockedSegment(name) {
  if (!name) return false
  const lower = name.toLowerCase()
  if (lower === '.git' || lower === 'node_modules') return true
  if (lower === 'config.smtp.php' || lower === 'credentials.log') return true
  if (/^\.env(\..+)?$/i.test(name) && lower !== '.env.example') return true
  if (/\.(pem|key|p12|pfx|crt|jks)$/i.test(name)) return true
  if (/^id_(rsa|ed25519|ecdsa)/i.test(name)) return true
  return false
}

function parseRelSegments(rawRelPath) {
  const normalizedRel = String(rawRelPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')

  if (normalizedRel.includes('\0')) {
    throw createExplorerError('Ruta no permitida.', 403)
  }

  const segments = normalizedRel ? normalizedRel.split('/').filter(Boolean) : []
  for (const seg of segments) {
    if (seg === '.' || seg === '..' || isBlockedSegment(seg)) {
      throw createExplorerError('Acceso denegado a esta ruta o archivo protegido.', 403)
    }
  }

  return segments
}

export function createFileExplorerService({ projectRoot, dataDir, webRoot, allowWrite = false }) {
  const rootDefinitions = [
    { id: 'project', label: 'Proyecto React', rootPath: path.resolve(projectRoot) },
    { id: 'data', label: 'Datos y Archivos (data/)', rootPath: path.resolve(dataDir) },
  ]
  if (webRoot && fs.existsSync(webRoot)) {
    rootDefinitions.push({
      id: 'web',
      label: 'Publicación VPS (/var/www/csalma)',
      rootPath: path.resolve(webRoot),
    })
  }

  const rootsById = new Map(rootDefinitions.map((root) => [root.id, root]))

  function resolveSafe(rootId, rawRelPath = '') {
    const root = rootsById.get(rootId)
    if (!root) {
      throw createExplorerError('Raíz de archivos no válida.', 400)
    }

    const segments = parseRelSegments(rawRelPath)

    if (!fs.existsSync(root.rootPath)) {
      throw createExplorerError('El directorio raíz aún no existe en este entorno.', 404)
    }

    const rootReal = fs.realpathSync(root.rootPath)
    const candidate = path.resolve(root.rootPath, ...segments)
    if (candidate !== root.rootPath && !candidate.startsWith(root.rootPath + path.sep)) {
      throw createExplorerError('Acceso denegado fuera de la raíz permitida.', 403)
    }

    if (!fs.existsSync(candidate)) {
      throw createExplorerError('Archivo o carpeta no encontrado.', 404)
    }

    const targetReal = fs.realpathSync(candidate)
    if (targetReal !== rootReal && !targetReal.startsWith(rootReal + path.sep)) {
      throw createExplorerError('Acceso denegado fuera de la raíz permitida.', 403)
    }

    return {
      root,
      relPath: segments.join('/'),
      fullPath: targetReal,
    }
  }

  function assertWritableProjectRoot(rootId) {
    if (!allowWrite) {
      throw createExplorerError('La edición de archivos está desactivada en este entorno.', 403)
    }
    if (rootId !== 'project') {
      throw createExplorerError('Solo se permite editar archivos dentro del Proyecto React.', 403)
    }
  }

  return {
    getRoots() {
      return rootDefinitions.map((root) => ({
        id: root.id,
        label: root.label,
        path: root.rootPath,
        exists: fs.existsSync(root.rootPath),
        writable: Boolean(allowWrite && root.id === 'project'),
      }))
    },

    listDirectory(rootId = 'project', relPath = '') {
      const target = resolveSafe(rootId, relPath)
      const stat = fs.statSync(target.fullPath)
      if (!stat.isDirectory()) {
        throw createExplorerError('La ruta especificada no es una carpeta.', 400)
      }

      const dirents = fs.readdirSync(target.fullPath, { withFileTypes: true })
      const entries = []

      for (const dirent of dirents) {
        if (isBlockedSegment(dirent.name)) continue

        const entryFullPath = path.join(target.fullPath, dirent.name)
        let entryStat
        try {
          entryStat = fs.statSync(entryFullPath)
        } catch {
          continue
        }

        const isDir = entryStat.isDirectory()
        const ext = isDir ? '' : path.extname(dirent.name).toLowerCase()
        const entryRel = target.relPath ? `${target.relPath}/${dirent.name}` : dirent.name

        entries.push({
          name: dirent.name,
          path: entryRel,
          type: isDir ? 'dir' : 'file',
          size: isDir ? 0 : entryStat.size,
          modifiedAt: entryStat.mtime.toISOString(),
          extension: ext,
          previewable: !isDir && (TEXT_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext)),
        })
      }

      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name, 'es')
      })

      return {
        root: target.root.id,
        path: target.relPath,
        entries,
      }
    },

    previewFile(rootId = 'project', relPath = '') {
      if (!relPath) {
        throw createExplorerError('Debe indicar la ruta de un archivo.', 400)
      }

      const target = resolveSafe(rootId, relPath)
      const stat = fs.statSync(target.fullPath)
      if (!stat.isFile()) {
        throw createExplorerError('La ruta indicada no corresponde a un archivo.', 400)
      }

      const name = path.basename(target.fullPath)
      const ext = path.extname(name).toLowerCase()
      const modifiedAt = stat.mtime.toISOString()

      if (IMAGE_EXTENSIONS.has(ext)) {
        let previewUrl = ''
        if (target.root.id === 'project' && target.relPath.startsWith('public/images/')) {
          previewUrl = `/${target.relPath.slice('public/'.length)}`
        } else if (target.root.id === 'data' && target.relPath.startsWith('uploads/')) {
          previewUrl = `/api/${target.relPath}`
        } else if (target.root.id === 'web' && target.relPath.startsWith('images/')) {
          previewUrl = `/${target.relPath}`
        }

        return {
          kind: 'image',
          name,
          path: target.relPath,
          size: stat.size,
          modifiedAt,
          previewUrl,
        }
      }

      if (TEXT_EXTENSIONS.has(ext)) {
        const bytesToRead = Math.min(stat.size, MAX_PREVIEW_BYTES)
        const buffer = Buffer.alloc(bytesToRead)
        const fd = fs.openSync(target.fullPath, 'r')
        try {
          if (bytesToRead > 0) fs.readSync(fd, buffer, 0, bytesToRead, 0)
        } finally {
          fs.closeSync(fd)
        }

        return {
          kind: 'text',
          name,
          path: target.relPath,
          size: stat.size,
          modifiedAt,
          content: buffer.toString('utf8'),
          truncated: stat.size > MAX_PREVIEW_BYTES,
        }
      }

      return {
        kind: 'binary',
        name,
        path: target.relPath,
        size: stat.size,
        modifiedAt,
        message: 'Archivo binario no previsualizable en texto.',
      }
    },

    writeFile(rootId, relPath, content) {
      assertWritableProjectRoot(rootId)
      if (!relPath) {
        throw createExplorerError('Debe indicar la ruta del archivo a guardar.', 400)
      }

      const target = resolveSafe(rootId, relPath)
      if (target.relPath === 'package-lock.json') {
        throw createExplorerError('package-lock.json está protegido contra edición manual.', 403)
      }

      const stat = fs.statSync(target.fullPath)
      if (!stat.isFile()) {
        throw createExplorerError('Solo se pueden guardar archivos regulares.', 400)
      }

      const name = path.basename(target.fullPath)
      const ext = path.extname(name).toLowerCase()
      if (!TEXT_EXTENSIONS.has(ext)) {
        throw createExplorerError('Esta extensión de archivo no permite edición de texto.', 400)
      }

      if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) {
        throw createExplorerError('El contenido supera el límite de 512 KB.', 400)
      }

      fs.writeFileSync(target.fullPath, content, 'utf8')
      const updatedStat = fs.statSync(target.fullPath)

      return {
        name,
        path: target.relPath,
        size: updatedStat.size,
        modifiedAt: updatedStat.mtime.toISOString(),
      }
    },

    createEntry(rootId, relPath, type, content = '') {
      assertWritableProjectRoot(rootId)
      if (!['file', 'dir'].includes(type)) {
        throw createExplorerError('El tipo debe ser file o dir.', 400)
      }

      const segments = parseRelSegments(relPath)
      if (!segments.length) {
        throw createExplorerError('Debe indicar un nombre o ruta válida.', 400)
      }

      const leafName = segments[segments.length - 1]
      const parentRel = segments.slice(0, -1).join('/')
      const parent = resolveSafe(rootId, parentRel)
      const parentStat = fs.statSync(parent.fullPath)
      if (!parentStat.isDirectory()) {
        throw createExplorerError('La ruta padre debe ser una carpeta.', 400)
      }

      const targetPath = path.join(parent.fullPath, leafName)
      if (fs.existsSync(targetPath)) {
        throw createExplorerError('Ya existe un archivo o carpeta con ese nombre.', 409)
      }

      const cleanRelPath = segments.join('/')
      if (type === 'dir') {
        fs.mkdirSync(targetPath)
        const dirStat = fs.statSync(targetPath)
        return {
          name: leafName,
          path: cleanRelPath,
          type: 'dir',
          size: 0,
          modifiedAt: dirStat.mtime.toISOString(),
          extension: '',
          previewable: false,
        }
      }

      const ext = path.extname(leafName).toLowerCase()
      if (!TEXT_EXTENSIONS.has(ext)) {
        throw createExplorerError('Extensión no permitida para crear archivos de texto desde el IDE.', 400)
      }
      if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) {
        throw createExplorerError('El contenido supera el límite de 512 KB.', 400)
      }

      fs.writeFileSync(targetPath, content, 'utf8')
      const fileStat = fs.statSync(targetPath)
      return {
        name: leafName,
        path: cleanRelPath,
        type: 'file',
        size: fileStat.size,
        modifiedAt: fileStat.mtime.toISOString(),
        extension: ext,
        previewable: true,
      }
    },

    deleteEntry(rootId, relPath) {
      assertWritableProjectRoot(rootId)
      if (!relPath) {
        throw createExplorerError('No se puede eliminar la raíz del proyecto.', 403)
      }

      const target = resolveSafe(rootId, relPath)
      if (PROTECTED_DELETE_PATHS.has(target.relPath)) {
        throw createExplorerError('Este archivo o carpeta base del proyecto está protegido.', 403)
      }

      const stat = fs.statSync(target.fullPath)
      if (stat.isDirectory()) {
        try {
          fs.rmdirSync(target.fullPath)
        } catch (err) {
          if (err?.code === 'ENOTEMPTY' || err?.code === 'EEXIST') {
            throw createExplorerError('Solo se pueden eliminar carpetas vacías desde el editor.', 400)
          }
          throw err
        }
        return
      }

      fs.unlinkSync(target.fullPath)
    },
  }
}
