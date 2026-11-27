const MAX_HEALTH_ROWS = 5000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function createUptimeMonitor({ db, config, activityRepo }) {
  const intervalMs = Math.max(5000, config.monitor.intervalMs || 60000)
  const timeoutMs = Math.max(1000, config.monitor.timeoutMs || 5000)
  const targetUrl = config.monitor.targetUrl

  const statements = {
    insert: db.prepare(`INSERT INTO health_checks (checked_at, target_url, status, status_code, latency_ms, error)
      VALUES (:checked_at, :target_url, :status, :status_code, :latency_ms, :error)`),
    latestOne: db.prepare('SELECT * FROM health_checks ORDER BY id DESC LIMIT 1'),
    sinceAsc: db.prepare('SELECT * FROM health_checks WHERE checked_at >= ? ORDER BY checked_at ASC, id ASC'),
    incidentsDesc: db.prepare(`SELECT * FROM health_checks
      WHERE checked_at >= ? AND status = 'offline'
      ORDER BY id DESC LIMIT 10`),
    prune: db.prepare(`DELETE FROM health_checks WHERE id NOT IN (
      SELECT id FROM health_checks ORDER BY id DESC LIMIT ?
    )`),
  }

  let initialTimer = null
  let intervalTimer = null
  let inFlight = null

  async function performCheck() {
    const previous = statements.latestOne.get()
    const started = performance.now()
    let status = 'offline'
    let statusCode = 0
    let errorMsg = ''

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      })
      statusCode = response.status
      status = response.status < 500 ? 'online' : 'offline'
      if (status === 'offline') {
        errorMsg = `Respuesta HTTP ${response.status}`
      }
    } catch (error) {
      status = 'offline'
      statusCode = 0
      errorMsg = String(error?.message || 'Error de conexión').slice(0, 240)
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - started))
    const checkedAt = new Date().toISOString()

    statements.insert.run({
      checked_at: checkedAt,
      target_url: targetUrl,
      status,
      status_code: statusCode,
      latency_ms: latencyMs,
      error: errorMsg,
    })
    statements.prune.run(MAX_HEALTH_ROWS)

    if (activityRepo && ((previous && previous.status !== status) || (!previous && status === 'offline'))) {
      activityRepo.record({
        modulo: 'monitor',
        accion: status === 'online' ? 'sitio_recuperado' : 'caida_detectada',
        descripcion:
          status === 'online'
            ? `${targetUrl} volvió a responder en línea (HTTP ${statusCode}, ${latencyMs} ms).`
            : `Caída detectada en ${targetUrl}: ${errorMsg || `HTTP ${statusCode}`}.`,
        actor: 'Monitor VPS',
      })
    }

    return statements.latestOne.get()
  }

  return {
    async runCheck() {
      if (inFlight) return inFlight
      inFlight = performCheck().finally(() => {
        inFlight = null
      })
      return inFlight
    },

    getSummary() {
      const cutoffIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()
      const checks = statements.sinceAsc.all(cutoffIso)
      const lastCheck = checks.length ? checks[checks.length - 1] : null

      if (!checks.length) {
        return {
          targetUrl,
          intervalMs,
          currentStatus: 'sin_datos',
          lastCheck: null,
          totalChecks: 0,
          onlineChecks: 0,
          offlineChecks: 0,
          uptimePercent: null,
          avgLatencyMs: 0,
          outageCount: 0,
          onlineSeconds: 0,
          offlineSeconds: 0,
          recentChecks: [],
          incidents: [],
        }
      }

      const maxGapSeconds = (intervalMs * 2) / 1000
      const fallbackSeconds = intervalMs / 1000
      let onlineChecks = 0
      let offlineChecks = 0
      let latencySum = 0
      let outageCount = 0
      let onlineSeconds = 0
      let offlineSeconds = 0

      for (let i = 0; i < checks.length; i += 1) {
        const current = checks[i]
        const prev = i > 0 ? checks[i - 1] : null

        if (current.status === 'online') {
          onlineChecks += 1
          latencySum += Number(current.latency_ms || 0)
        } else {
          offlineChecks += 1
          if (!prev || prev.status !== 'offline') {
            outageCount += 1
          }
        }

        let deltaSeconds = fallbackSeconds
        if (prev) {
          const rawDelta = (Date.parse(current.checked_at) - Date.parse(prev.checked_at)) / 1000
          if (Number.isFinite(rawDelta) && rawDelta > 0) {
            deltaSeconds = Math.min(rawDelta, maxGapSeconds)
          }
        }

        if (current.status === 'online') onlineSeconds += deltaSeconds
        else offlineSeconds += deltaSeconds
      }

      const totalChecks = checks.length
      const uptimePercent = Number(((onlineChecks / totalChecks) * 100).toFixed(2))
      const avgLatencyMs = onlineChecks > 0 ? Math.round(latencySum / onlineChecks) : 0

      return {
        targetUrl,
        intervalMs,
        currentStatus: lastCheck.status,
        lastCheck,
        totalChecks,
        onlineChecks,
        offlineChecks,
        uptimePercent,
        avgLatencyMs,
        outageCount,
        onlineSeconds: Math.round(onlineSeconds),
        offlineSeconds: Math.round(offlineSeconds),
        recentChecks: checks.slice(-40),
        incidents: statements.incidentsDesc.all(cutoffIso),
      }
    },

    start() {
      if (!config.monitor.enabled || intervalTimer) return
      initialTimer = setTimeout(() => {
        this.runCheck().catch(() => {})
      }, 1500)
      initialTimer.unref?.()

      intervalTimer = setInterval(() => {
        this.runCheck().catch(() => {})
      }, intervalMs)
      intervalTimer.unref?.()
    },

    stop() {
      if (initialTimer) {
        clearTimeout(initialTimer)
        initialTimer = null
      }
      if (intervalTimer) {
        clearInterval(intervalTimer)
        intervalTimer = null
      }
    },
  }
}
