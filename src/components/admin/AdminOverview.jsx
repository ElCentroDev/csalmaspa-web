import { useState } from 'react'
import { adminApi, formatBytes, formatDateTime, formatDuration } from './adminApi.js'

const STATUS_LABELS = {
  nueva: 'Nueva',
  leida: 'Leída',
  respondida: 'Respondida',
  archivada: 'Archivada',
}

const MODULE_LABELS = {
  solicitudes: 'Solicitudes',
  proyectos: 'Proyectos',
  usuarios: 'Usuarios',
  monitor: 'Monitor',
  sistema: 'Sistema',
}

function AdminOverview({
  overview,
  onNavigate,
  onSelectRequest,
  onNewProject,
  onRefreshOverview,
}) {
  const [checkingUptime, setCheckingUptime] = useState(false)
  const [uptimeNotice, setUptimeNotice] = useState('')

  if (!overview) return null

  const { solicitudes, proyectos, usuarios, smtp, recientes, system, uptime, actividad } = overview
  const smtpActive = smtp.transport === 'smtp' && smtp.configured

  const handleManualCheck = async () => {
    setCheckingUptime(true)
    setUptimeNotice('')
    try {
      await adminApi.runUptimeCheck()
      setUptimeNotice('Verificación ejecutada y registrada en la bitácora de disponibilidad.')
      if (onRefreshOverview) await onRefreshOverview()
    } catch (error) {
      setUptimeNotice(error.message)
    } finally {
      setCheckingUptime(false)
    }
  }

  const totalObserved = (uptime?.onlineSeconds || 0) + (uptime?.offlineSeconds || 0)
  const onlineShare =
    totalObserved > 0 ? Math.round(((uptime?.onlineSeconds || 0) / totalObserved) * 1000) / 10 : 100
  const offlineShare = totalObserved > 0 ? Math.max(0, Number((100 - onlineShare).toFixed(1))) : 0

  return (
    <div className="admin-stack">
      <div className="admin-kpi-grid">
        <button
          type="button"
          className="admin-kpi-card admin-kpi-card--accent"
          onClick={() => onNavigate('solicitudes')}
        >
          <span className="admin-kpi-label">Solicitudes nuevas</span>
          <strong className="admin-kpi-value">{solicitudes.nueva}</strong>
          <span className="admin-kpi-foot">
            {solicitudes.total} totales · {solicitudes.leida} leídas
          </span>
        </button>

        <button
          type="button"
          className="admin-kpi-card"
          onClick={() => onNavigate('solicitudes')}
        >
          <span className="admin-kpi-label">Cotizaciones respondidas</span>
          <strong className="admin-kpi-value">{solicitudes.respondida}</strong>
          <span className="admin-kpi-foot">Respondidas vía panel</span>
        </button>

        <button
          type="button"
          className="admin-kpi-card"
          onClick={() => onNavigate('proyectos')}
        >
          <span className="admin-kpi-label">Proyectos publicados</span>
          <strong className="admin-kpi-value">{proyectos.publicados}</strong>
          <span className="admin-kpi-foot">{proyectos.borradores} en borrador</span>
        </button>

        <button
          type="button"
          className="admin-kpi-card"
          onClick={() => onNavigate('usuarios')}
        >
          <span className="admin-kpi-label">Usuarios activos</span>
          <strong className="admin-kpi-value">{usuarios?.activos ?? 0}</strong>
          <span className="admin-kpi-foot">
            {usuarios?.total ?? 0} cuentas · {usuarios?.roles?.administrador ?? 0} admin
          </span>
        </button>
      </div>

      <div className="admin-escritorio-grid">
        <section className="admin-card" aria-labelledby="uptime-card-title">
          <div className="admin-card-header">
            <div>
              <h2 id="uptime-card-title">Disponibilidad de la página (Online vs. Caídas)</h2>
              <p>
                Objetivo monitoreado: <code>{uptime?.targetUrl || 'https://csalma.cl'}</code>
              </p>
            </div>
            <div className="admin-actions-inline">
              <span
                className={`admin-pill ${
                  uptime?.currentStatus === 'online'
                    ? 'admin-pill--respondida'
                    : uptime?.currentStatus === 'offline'
                      ? 'admin-pill--error'
                      : 'admin-pill--archivada'
                }`}
              >
                {uptime?.currentStatus === 'online'
                  ? 'En línea'
                  : uptime?.currentStatus === 'offline'
                    ? 'Fuera de línea'
                    : 'Sin verificar'}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={handleManualCheck}
                disabled={checkingUptime}
              >
                {checkingUptime ? 'Verificando...' : 'Verificar ahora'}
              </button>
            </div>
          </div>

          {uptimeNotice ? <p className="admin-field-note">{uptimeNotice}</p> : null}

          <div className="admin-uptime-compare">
            <div className="admin-uptime-bar-labels">
              <span>
                Online: <strong>{formatDuration(uptime?.onlineSeconds)}</strong> ({onlineShare}%)
              </span>
              <span>
                Offline / caídas: <strong>{formatDuration(uptime?.offlineSeconds)}</strong> ({offlineShare}%)
              </span>
            </div>
            <div className="admin-uptime-bar" aria-label="Proporción de tiempo en línea frente a caídas">
              <div className="admin-uptime-bar-online" style={{ width: `${onlineShare}%` }} />
              {offlineShare > 0 ? (
                <div className="admin-uptime-bar-offline" style={{ width: `${offlineShare}%` }} />
              ) : null}
            </div>
          </div>

          <dl className="admin-meta-grid admin-meta-grid--compact">
            <div>
              <dt>Disponibilidad (30 d)</dt>
              <dd>{uptime?.uptimePercent !== null && uptime?.uptimePercent !== undefined ? `${uptime.uptimePercent}%` : '—'}</dd>
            </div>
            <div>
              <dt>Caídas detectadas</dt>
              <dd>{uptime?.outageCount ?? 0}</dd>
            </div>
            <div>
              <dt>Latencia promedio</dt>
              <dd>{uptime?.avgLatencyMs ? `${uptime.avgLatencyMs} ms` : '—'}</dd>
            </div>
            <div>
              <dt>Chequeos registrados</dt>
              <dd>{uptime?.totalChecks ?? 0}</dd>
            </div>
          </dl>

          {uptime?.recentChecks?.length ? (
            <div className="admin-uptime-strip-wrap">
              <span className="admin-field-note">Últimas {uptime.recentChecks.length} comprobaciones:</span>
              <div className="admin-uptime-strip" role="list">
                {uptime.recentChecks.map((check) => (
                  <span
                    key={check.id}
                    role="listitem"
                    className={`admin-uptime-tick ${check.status === 'online' ? 'is-online' : 'is-offline'}`}
                    title={`${formatDateTime(check.checked_at)} · ${
                      check.status === 'online' ? `Online HTTP ${check.status_code}` : `Offline (${check.error || check.status_code})`
                    } · ${check.latency_ms} ms`}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="admin-incidents-box">
            <h3>Historial de caídas recientes</h3>
            {!uptime?.incidents?.length ? (
              <p className="admin-empty-inline">Sin caídas registradas en el período monitoreado.</p>
            ) : (
              <ul className="admin-incident-list">
                {uptime.incidents.map((inc) => (
                  <li key={inc.id}>
                    <span className="admin-pill admin-pill--error">HTTP {inc.status_code || 0}</span>
                    <span>{inc.error || 'Sin respuesta'}</span>
                    <time>{formatDateTime(inc.checked_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="admin-card" aria-labelledby="vps-card-title">
          <div className="admin-card-header">
            <div>
              <h2 id="vps-card-title">Máquina VPS / Servidor</h2>
              <p>Telemetría en vivo del host donde corre la API.</p>
            </div>
            <span className="admin-muted-tag">{system?.hostname || 'localhost'}</span>
          </div>

          <div className="admin-vps-highlight">
            <div>
              <span>Días activos de la máquina</span>
              <strong>{system ? `${system.hostUptimeDays} días` : '—'}</strong>
              <small>{system ? formatDuration(system.hostUptimeSeconds) : ''}</small>
            </div>
            <div>
              <span>Proceso Node activo</span>
              <strong>{system ? formatDuration(system.processUptimeSeconds) : '—'}</strong>
              <small>{system?.nodeVersion || ''}</small>
            </div>
          </div>

          {system ? (
            <>
              <div className="admin-meter-list">
                <div className="admin-meter">
                  <div className="admin-meter-head">
                    <span>Memoria RAM</span>
                    <span>
                      {formatBytes(system.memory.usedBytes)} / {formatBytes(system.memory.totalBytes)} (
                      {system.memory.usedPercent}%)
                    </span>
                  </div>
                  <div className="admin-meter-track">
                    <div
                      className="admin-meter-fill"
                      style={{ width: `${Math.min(100, system.memory.usedPercent)}%` }}
                    />
                  </div>
                </div>

                {system.disk ? (
                  <div className="admin-meter">
                    <div className="admin-meter-head">
                      <span>Disco disponible</span>
                      <span>
                        {formatBytes(system.disk.usedBytes)} / {formatBytes(system.disk.totalBytes)} (
                        {system.disk.usedPercent}%)
                      </span>
                    </div>
                    <div className="admin-meter-track">
                      <div
                        className="admin-meter-fill"
                        style={{ width: `${Math.min(100, system.disk.usedPercent)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <dl className="admin-meta-grid admin-meta-grid--compact">
                <div>
                  <dt>Sistema operativo</dt>
                  <dd>{system.osType} ({system.arch})</dd>
                </div>
                <div>
                  <dt>CPU</dt>
                  <dd>{system.cpu.cores} núcleos</dd>
                </div>
                <div>
                  <dt>Carga promedio</dt>
                  <dd>{system.cpu.loadAvg.join(' / ')}</dd>
                </div>
                <div>
                  <dt>Base de datos SQLite</dt>
                  <dd>{formatBytes(system.database.sizeBytes)}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </section>
      </div>

      <div className="admin-overview-grid">
        <div className="admin-stack">
          <section className="admin-card" aria-labelledby="activity-feed-title">
            <div className="admin-card-header">
              <div>
                <h2 id="activity-feed-title">Actividad reciente</h2>
                <p>Bitácora automática de eventos del sitio y del panel administrativo.</p>
              </div>
            </div>

            {!actividad?.length ? (
              <p className="admin-empty">
                Aún no hay eventos registrados. Al recibir solicitudes, crear usuarios o publicar proyectos aparecerán aquí.
              </p>
            ) : (
              <ul className="admin-activity-list">
                {actividad.map((entry) => (
                  <li className="admin-activity-item" key={entry.id}>
                    <span className="admin-muted-tag">
                      {MODULE_LABELS[entry.modulo] || entry.modulo}
                    </span>
                    <div className="admin-activity-body">
                      <p>{entry.descripcion}</p>
                      <small>
                        {entry.actor} · {formatDateTime(entry.created_at)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-card" aria-labelledby="overview-recent-title">
            <div className="admin-card-header">
              <div>
                <h2 id="overview-recent-title">Últimas solicitudes recibidas</h2>
                <p>Haz clic en una solicitud para abrirla, leer su detalle o responder por correo.</p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => onNavigate('solicitudes')}
              >
                Ver bandeja
              </button>
            </div>

            {!recientes?.length ? (
              <p className="admin-empty">
                Aún no hay solicitudes registradas en la base de datos.
              </p>
            ) : (
              <div className="admin-recent-list">
                {recientes.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="admin-recent-row"
                    onClick={() => onSelectRequest(item.id)}
                  >
                    <div className="admin-recent-main">
                      <div className="admin-recent-top">
                        <strong>{item.nombre}</strong>
                        {item.empresa ? <span className="admin-muted-tag">{item.empresa}</span> : null}
                      </div>
                      <p className="admin-recent-extract">
                        {item.especialidad ? `${item.especialidad} — ` : ''}
                        {item.extracto}
                      </p>
                    </div>
                    <div className="admin-recent-side">
                      <span className={`admin-pill admin-pill--${item.estado}`}>
                        {STATUS_LABELS[item.estado] || item.estado}
                      </span>
                      <time>{formatDateTime(item.created_at)}</time>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="admin-stack">
          <section className="admin-card" aria-labelledby="overview-smtp-title">
            <div className="admin-card-header">
              <div>
                <h2 id="overview-smtp-title">Estado del correo (SMTP)</h2>
                <p>Canal usado para avisos del formulario y respuestas a clientes.</p>
              </div>
              <span className={`admin-pill ${smtpActive ? 'admin-pill--respondida' : 'admin-pill--nueva'}`}>
                {smtpActive ? 'SMTP activo' : 'Modo prueba (stream)'}
              </span>
            </div>

            <dl className="admin-dl">
              <div>
                <dt>Modo actual</dt>
                <dd>{smtp.transport}</dd>
              </div>
              <div>
                <dt>Casilla receptora</dt>
                <dd>{smtp.contactTo?.join(', ') || 'No configurada'}</dd>
              </div>
              <div>
                <dt>Servidor SMTP</dt>
                <dd>{smtp.host}:{smtp.port}</dd>
              </div>
            </dl>

            {!smtpActive && (
              <p className="admin-hint">
                En modo prueba los envíos se simulan sin salir por SMTP. Para activar Google Workspace configura{' '}
                <code>MAIL_TRANSPORT=smtp</code>, <code>MAIL_FROM</code>, <code>SMTP_USER</code> y{' '}
                <code>SMTP_PASSWORD</code> en <code>.env.local</code>.
              </p>
            )}

            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => onNavigate('sistema')}
            >
              Ver detalle de configuración
            </button>
          </section>

          <section className="admin-card" aria-labelledby="overview-actions-title">
            <div className="admin-card-header">
              <div>
                <h2 id="overview-actions-title">Accesos rápidos</h2>
                <p>Atajos frecuentes de administración y contenido.</p>
              </div>
            </div>
            <div className="admin-actions-inline">
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={onNewProject}
              >
                + Publicar proyecto
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => onNavigate('usuarios')}
              >
                + Agregar usuario
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => onNavigate('archivos')}
              >
                Explorar archivos
              </button>
              <a className="admin-btn admin-btn--ghost" href="/#proyectos-publicados">
                Ver Home público ↗
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminOverview
