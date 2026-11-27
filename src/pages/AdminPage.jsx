import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminFilesModule from '../components/admin/AdminFilesModule.jsx'
import AdminOverview from '../components/admin/AdminOverview.jsx'
import AdminProjectsModule from '../components/admin/AdminProjectsModule.jsx'
import AdminRequestsModule from '../components/admin/AdminRequestsModule.jsx'
import AdminSmtpPanel from '../components/admin/AdminSmtpPanel.jsx'
import AdminUsersModule from '../components/admin/AdminUsersModule.jsx'
import { adminApi } from '../components/admin/adminApi.js'
import '../styles/admin.css'

function NavIcon({ name }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  if (name === 'escritorio') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    )
  }
  if (name === 'solicitudes') {
    return (
      <svg {...common}>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    )
  }
  if (name === 'proyectos') {
    return (
      <svg {...common}>
        <path d="M2 20h20" />
        <path d="M5 20V8l7-4 7 4v12" />
        <path d="M9 20v-5h6v5" />
      </svg>
    )
  }
  if (name === 'usuarios') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
  if (name === 'archivos') {
    return (
      <svg {...common}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

const MENU_GROUPS = [
  {
    title: 'Principal',
    items: [
      { id: 'escritorio', label: 'Escritorio' },
      { id: 'solicitudes', label: 'Solicitudes' },
      { id: 'proyectos', label: 'Proyectos' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { id: 'usuarios', label: 'Usuarios' },
      { id: 'archivos', label: 'Gestor de archivos' },
      { id: 'sistema', label: 'Correo y SMTP' },
    ],
  },
]

const MODULE_TITLES = {
  escritorio: {
    title: 'Escritorio',
    subtitle: 'Actividad reciente, estado de la máquina VPS, disponibilidad del sitio y métricas comerciales.',
  },
  solicitudes: {
    title: 'Bandeja de solicitudes',
    subtitle: 'Lee requerimientos del formulario, registra notas y responde directamente por SMTP.',
  },
  proyectos: {
    title: 'Gestor de Proyectos',
    subtitle: 'Crea publicaciones de obras con fotografía para mostrarlas en la sección Proyectos del Home.',
  },
  usuarios: {
    title: 'Usuarios y Roles',
    subtitle: 'Administra cuentas del equipo y asigna permisos por rol al estilo WordPress.',
  },
  archivos: {
    title: 'Gestor de archivos',
    subtitle: 'Explora la estructura de carpetas y previsualiza archivos del proyecto React o de la máquina VPS.',
  },
  sistema: {
    title: 'Correo empresarial y sistema',
    subtitle: 'Revisa el estado de conexión SMTP y las pautas de seguridad.',
  },
}

function AdminPage() {
  const [activeModule, setActiveModule] = useState('escritorio')
  const [overview, setOverview] = useState(null)
  const [apiError, setApiError] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState(null)

  const refreshOverview = useCallback(async () => {
    try {
      const data = await adminApi.getOverview()
      setOverview(data)
      setApiError('')
    } catch (error) {
      setApiError(error.message)
    }
  }, [])

  useEffect(() => {
    let active = true
    adminApi
      .getOverview()
      .then((data) => {
        if (!active) return
        setOverview(data)
        setApiError('')
      })
      .catch((error) => {
        if (active) setApiError(error.message)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Panel de Administración — CSALMA'

    let metaRobots = document.querySelector('meta[name="robots"]')
    const createdMeta = !metaRobots
    const previousRobots = metaRobots?.getAttribute('content') ?? null
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.setAttribute('name', 'robots')
      document.head.appendChild(metaRobots)
    }
    metaRobots.setAttribute('content', 'noindex, nofollow')

    return () => {
      document.title = previousTitle
      if (createdMeta) {
        metaRobots.remove()
      } else if (previousRobots !== null) {
        metaRobots.setAttribute('content', previousRobots)
      }
    }
  }, [])

  const handleOpenRequestFromOverview = (id) => {
    setSelectedRequestId(id)
    setActiveModule('solicitudes')
  }

  const headerInfo = MODULE_TITLES[activeModule] || MODULE_TITLES.escritorio
  const unreadCount = overview?.solicitudes?.nueva || 0
  const publishedCount = overview?.proyectos?.publicados || 0
  const usersCount = overview?.usuarios?.total || 0

  const getBadgeCount = (id) => {
    if (id === 'solicitudes' && unreadCount > 0) return unreadCount
    if (id === 'proyectos' && publishedCount > 0) return publishedCount
    if (id === 'usuarios' && usersCount > 0) return usersCount
    return 0
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Menú de administración">
        <div className="admin-brand">
          <img
            src="/images/logo.webp"
            alt="CSALMA"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <span className="admin-brand-name">CSA<span>LMA</span></span>
            <span className="admin-brand-role">Administración</span>
          </div>
        </div>

        <nav className="admin-nav">
          {MENU_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <p className="admin-nav-heading">{group.title}</p>
              {group.items.map((mod) => {
                const badge = getBadgeCount(mod.id)
                return (
                  <button
                    key={mod.id}
                    type="button"
                    className={`admin-nav-btn${activeModule === mod.id ? ' is-active' : ''}`}
                    onClick={() => setActiveModule(mod.id)}
                  >
                    <span className="admin-nav-label">
                      <NavIcon name={mod.id} />
                      <span>{mod.label}</span>
                    </span>
                    {badge > 0 ? <span className="admin-nav-badge">{badge}</span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <p className="admin-security-note">
            Acceso sin login (entorno local). Los usuarios creados ya guardan contraseña cifrada para activar acceso privado.
          </p>
          <Link className="admin-back-link" to="/">
            ← Volver al sitio público
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-eyebrow">Panel CSALMA SPA</p>
            <h1>{headerInfo.title}</h1>
            <p className="admin-topbar-sub">{headerInfo.subtitle}</p>
          </div>
          <div className="admin-topbar-actions">
            {overview?.uptime ? (
              <span
                className={`admin-pill ${
                  overview.uptime.currentStatus === 'online'
                    ? 'admin-pill--respondida'
                    : overview.uptime.currentStatus === 'offline'
                      ? 'admin-pill--error'
                      : 'admin-pill--archivada'
                }`}
              >
                {overview.uptime.currentStatus === 'online'
                  ? 'Sitio online'
                  : overview.uptime.currentStatus === 'offline'
                    ? 'Sitio con caída'
                    : 'Monitor iniciando'}
              </span>
            ) : null}
            {overview ? (
              <span
                className={`admin-pill ${
                  overview.smtp.transport === 'smtp' && overview.smtp.configured
                    ? 'admin-pill--respondida'
                    : 'admin-pill--nueva'
                }`}
              >
                {overview.smtp.transport === 'smtp' && overview.smtp.configured
                  ? 'SMTP activo'
                  : 'Correo simulado'}
              </span>
            ) : null}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={refreshOverview}
            >
              Sincronizar
            </button>
          </div>
        </header>

        {apiError ? (
          <div className="admin-banner admin-banner--error" role="alert">
            <strong>No hay conexión con la API de administración:</strong> {apiError}. Asegúrate de tener corriendo{' '}
            <code>npm run dev:server</code> en paralelo.
          </div>
        ) : null}

        <div className="admin-workspace">
          {activeModule === 'escritorio' ? (
            <AdminOverview
              overview={overview}
              onNavigate={setActiveModule}
              onSelectRequest={handleOpenRequestFromOverview}
              onNewProject={() => setActiveModule('proyectos')}
              onRefreshOverview={refreshOverview}
            />
          ) : null}

          {activeModule === 'solicitudes' ? (
            <AdminRequestsModule
              initialSelectedId={selectedRequestId}
              onClearInitialSelection={() => setSelectedRequestId(null)}
              onDataChanged={refreshOverview}
            />
          ) : null}

          {activeModule === 'proyectos' ? (
            <AdminProjectsModule onDataChanged={refreshOverview} />
          ) : null}

          {activeModule === 'usuarios' ? (
            <AdminUsersModule onDataChanged={refreshOverview} />
          ) : null}

          {activeModule === 'archivos' ? <AdminFilesModule /> : null}

          {activeModule === 'sistema' ? <AdminSmtpPanel overview={overview} /> : null}
        </div>
      </main>
    </div>
  )
}

export default AdminPage
