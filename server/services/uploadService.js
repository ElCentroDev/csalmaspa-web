import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const SAFE_FILENAME_RE = /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/

function createValidationError(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}

function hasValidMagicBytes(buffer, contentType) {
  if (!buffer || buffer.length < 12) return false
  if (contentType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (contentType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    )
  }
  if (contentType === 'image/webp') {
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

export function createUploadService(uploadsDir) {
  const resolvedRoot = path.resolve(uploadsDir)

  return {
    saveImage({ contentType, dataBase64 }) {
      const ext = MIME_TO_EXT[contentType]
      if (!ext) {
        throw createValidationError('Formato de imagen no admitido. Use JPG, PNG o WebP.')
      }

      if (typeof dataBase64 !== 'string' || !dataBase64.trim()) {
        throw createValidationError('El archivo de imagen está vacío.')
      }

      const cleaned = dataBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
      const buffer = Buffer.from(cleaned, 'base64')
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
        throw createValidationError('La imagen debe pesar menos de 4 MB.')
      }

      if (!hasValidMagicBytes(buffer, contentType)) {
        throw createValidationError('El contenido del archivo no corresponde a una imagen válida.')
      }

      fs.mkdirSync(resolvedRoot, { recursive: true })
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`
      const targetPath = path.join(resolvedRoot, filename)
      fs.writeFileSync(targetPath, buffer)

      return {
        url: `/api/uploads/${filename}`,
        filename,
      }
    },

    resolveUploadPath(filename) {
      if (typeof filename !== 'string' || !SAFE_FILENAME_RE.test(filename)) return null
      const filePath = path.resolve(resolvedRoot, filename)
      if (!filePath.startsWith(resolvedRoot + path.sep)) return null
      if (!fs.existsSync(filePath)) return null

      const ext = path.extname(filename).slice(1).toLowerCase()
      const contentType = EXT_TO_MIME[ext]
      if (!contentType) return null

      return { filePath, contentType }
    },

    removeIfUnused(url, projectsRepo) {
      if (typeof url !== 'string' || !url.startsWith('/api/uploads/')) return
      const filename = url.slice('/api/uploads/'.length)
      if (!SAFE_FILENAME_RE.test(filename)) return
      if (projectsRepo.isImageInUse(url)) return

      const filePath = path.resolve(resolvedRoot, filename)
      if (!filePath.startsWith(resolvedRoot + path.sep)) return
      try {
        fs.unlinkSync(filePath)
      } catch (err) {
        if (err?.code !== 'ENOENT') throw err
      }
    },
  }
}
