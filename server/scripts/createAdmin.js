import { config } from '../config.js'
import { openDatabase } from '../db.js'
import { createSessionsRepository } from '../repositories/sessionsRepository.js'
import { createUsersRepository } from '../repositories/usersRepository.js'

const [, , usernameArg, emailArg, passwordArg] = process.argv

if (!usernameArg || !emailArg || !passwordArg) {
  console.error('Uso: npm run create-admin -- <usuario> <correo> <contraseña>')
  process.exit(1)
}

if (passwordArg.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres.')
  process.exit(1)
}

const db = openDatabase(config.storage.databaseFile)
const usersRepo = createUsersRepository(db)
const sessionsRepo = createSessionsRepository(db, {
  ttlHours: config.auth.sessionTtlHours,
  defaultAdminPassword: config.auth.initialAdminPassword,
})

try {
  const existing = usersRepo.findAuthByIdentifier(usernameArg) || usersRepo.findAuthByIdentifier(emailArg)
  if (existing) {
    const updated = usersRepo.update(existing.id, {
      username: usernameArg,
      nombre: existing.nombre || 'Administrador CSALMA',
      email: emailArg,
      rol: 'administrador',
      estado: 'activo',
      password: passwordArg,
    })
    sessionsRepo.revokeAllForUser(updated.id)
    console.log(`Administrador actualizado: @${updated.username} (${updated.email})`)
  } else {
    const created = usersRepo.create({
      username: usernameArg,
      nombre: 'Administrador CSALMA',
      email: emailArg,
      rol: 'administrador',
      estado: 'activo',
      password: passwordArg,
    })
    console.log(`Administrador creado: @${created.username} (${created.email})`)
  }
} finally {
  db.close()
}
