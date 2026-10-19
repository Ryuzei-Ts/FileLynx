import os from 'node:os';

export const systemService = {
  getMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      cpuCount: os.cpus().length,
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usagePercentage: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
    };
  },
};
