type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, label: string, message: string, data?: Record<string, unknown>) {
  const entry = { level, label, message, data, ts: new Date().toISOString() };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (label: string, msg: string, data?: Record<string, unknown>) => log('info', label, msg, data),
  warn: (label: string, msg: string, data?: Record<string, unknown>) => log('warn', label, msg, data),
  error: (label: string, msg: string, data?: Record<string, unknown>) => log('error', label, msg, data),
  debug: (label: string, msg: string, data?: Record<string, unknown>) => log('debug', label, msg, data),
};
