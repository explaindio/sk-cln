const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data || '');
};

export const logger = {
  info: (message: string, data?: any) => log('INFO', message, data),
  error: (message: string, data?: any) => log('ERROR', message, data),
  warn: (message: string, data?: any) => log('WARN', message, data),
  debug: (message: string, data?: any) => log('DEBUG', message, data),
};