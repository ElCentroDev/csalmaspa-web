import { useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from './adminApi.js'

function AdminLoginScreen({ apiError = '', onSuccess }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!identifier.trim() || !password) {
      setErrorMessage('Ingresa tu usuario o correo y tu contraseña.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    try {
      const data = await adminApi.login({
        identifier: identifier.trim(),
        password,
      })
      onSuccess(data)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login-shell">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <img
            src="/images/logo.webp"
            alt="CSALMA"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <span className="admin-brand-name">CSA<span>LMA</span></span>
            <span className="admin-brand-role">Panel de Administración</span>
          </div>
        </div>

        <div className="admin-login-intro">
          <h1>Iniciar sesión</h1>
          <p>Accede con tu usuario o correo corporativo autorizado.</p>
        </div>

        {apiError && !errorMessage ? (
          <div className="admin-banner admin-banner--error" role="alert">
            No se pudo conectar con la API ({apiError}). Verifica que el servidor backend esté activo.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="admin-banner admin-banner--error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="admin-field">
            <label htmlFor="login-identifier">Usuario o correo electrónico</label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              className="admin-input"
              autoComplete="username"
              required
              autoFocus
              maxLength={120}
              placeholder="Ej: admin o usuario@csalma.cl"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="admin-password-row">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="admin-input"
                autoComplete="current-password"
                required
                maxLength={128}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn--primary admin-login-submit"
            disabled={submitting}
          >
            {submitting ? 'Verificando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="admin-login-foot">
          <Link className="admin-login-back" to="/">
            ← Volver al sitio público
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginScreen
