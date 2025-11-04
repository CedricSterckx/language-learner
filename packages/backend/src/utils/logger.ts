import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const LOG_FILE = join(process.cwd(), 'logs', 'app.log');

// Ensure logs directory exists
function ensureLogDir() {
  const logDir = dirname(LOG_FILE);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

ensureLogDir();

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: any;
}

function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${entry.level}] ${entry.message}${dataStr}\n`;
}

function writeLog(entry: LogEntry) {
  const logLine = formatLogEntry(entry);
  
  // Write to console with colors
  const colorMap = {
    INFO: '\x1b[36m', // Cyan
    WARN: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';
  console.log(`${colorMap[entry.level]}${logLine.trim()}${reset}`);
  
  // Write to file
  try {
    appendFileSync(LOG_FILE, logLine, 'utf-8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

export const logger = {
  info(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data,
    });
  },

  warn(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      data,
    });
  },

  error(message: string, data?: any) {
    writeLog({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      data,
    });
  },
};

// Request logging middleware
export interface RequestLogData {
  method: string;
  url: string;
  path: string;
  userAgent?: string;
  ip?: string;
  userId?: number;
  status?: number;
  duration?: number;
  error?: string;
}

export function logRequest(data: RequestLogData) {
  const { method, path, status, duration, userId, ip, error } = data;
  
  const message = `${method} ${path} - ${status || 'PENDING'}${
    duration ? ` (${duration}ms)` : ''
  }${userId ? ` [User: ${userId}]` : ''}${ip ? ` [IP: ${ip}]` : ''}`;
  
  if (error) {
    logger.error(message, { error });
  } else if (status && status >= 500) {
    logger.error(message);
  } else if (status && status >= 400) {
    logger.warn(message);
  } else {
    logger.info(message);
  }
}

