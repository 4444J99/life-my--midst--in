import * as Sentry from '@sentry/node';

export function initializeSentry() {
  if (process.env['SENTRY_DSN'] && process.env['NODE_ENV'] !== 'test') {
    Sentry.init({
      dsn: process.env['SENTRY_DSN'],
      environment: process.env['SENTRY_ENVIRONMENT'] || 'development',
      tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    });
  }
}

export { Sentry };
