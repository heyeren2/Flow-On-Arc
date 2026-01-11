/**
 * Logger utility for development/production environments
 * Only logs in development mode to prevent information leakage in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log error messages (only in development)
   */
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
  },

  /**
   * Log general messages (only in development)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
};
