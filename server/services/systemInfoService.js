import fs from 'node:fs'
import os from 'node:os'

export function createSystemInfoService({ dataDir, databaseFile }) {
  return {
    getSnapshot() {
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = Math.max(0, totalMem - freeMem)
      const usedMemPct = totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(1)) : 0

      const cpus = os.cpus() || []
      const hostUptimeSeconds = Math.floor(os.uptime())
      const hostUptimeDays = Number((hostUptimeSeconds / 86400).toFixed(2))
      const processUptimeSeconds = Math.floor(process.uptime())

      let disk = null
      try {
        const probePath = fs.existsSync(dataDir) ? dataDir : process.cwd()
        const stats = fs.statfsSync(probePath)
        const blockSize = Number(stats.bsize || 0)
        const totalDisk = blockSize * Number(stats.blocks || 0)
        const freeDisk = blockSize * Number(stats.bavail ?? stats.bfree ?? 0)
        const usedDisk = Math.max(0, totalDisk - freeDisk)
        const usedDiskPct = totalDisk > 0 ? Number(((usedDisk / totalDisk) * 100).toFixed(1)) : 0
        disk = {
          totalBytes: totalDisk,
          freeBytes: freeDisk,
          usedBytes: usedDisk,
          usedPercent: usedDiskPct,
        }
      } catch {
        disk = null
      }

      let dbSizeBytes = 0
      if (databaseFile && databaseFile !== ':memory:' && fs.existsSync(databaseFile)) {
        try {
          dbSizeBytes = fs.statSync(databaseFile).size
        } catch {
          dbSizeBytes = 0
        }
      }

      return {
        hostname: os.hostname(),
        platform: process.platform,
        osType: os.type(),
        osRelease: os.release(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostUptimeSeconds,
        hostUptimeDays,
        processUptimeSeconds,
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model || 'Desconocido',
          loadAvg: os.loadavg().map((value) => Number(value.toFixed(2))),
        },
        memory: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          usedPercent: usedMemPct,
        },
        disk,
        database: {
          file: databaseFile,
          sizeBytes: dbSizeBytes,
        },
      }
    },
  }
}
