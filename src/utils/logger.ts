export const logger = {
  info: (msg: string, ...meta: unknown[]) => console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, ...meta),
  warn: (msg: string, ...meta: unknown[]) => console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, ...meta),
  error: (msg: string, ...meta: unknown[]) => console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, ...meta),
};
