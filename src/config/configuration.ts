export type ReportTimestampMode = 'processed-or-original' | 'processed';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  corsOrigins: string[];
  cursorSecret: string;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  reportTimestampMode: ReportTimestampMode;
  reportWorkerPollMs: number;
  reportLeaseSeconds: number;
  reportMaxAttempts: number;
  reportRetryDelaySeconds: number;
  logLevel: string;
}

export function configuration(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: process.env.DATABASE_URL ?? '',
    databaseSsl: process.env.DATABASE_SSL === 'true',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((value) => value.trim()),
    cursorSecret: process.env.CURSOR_SECRET ?? '',
    jwtSecret: process.env.JWT_SECRET ?? '',
    jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 900),
    reportTimestampMode: (process.env.REPORT_TIMESTAMP_MODE ??
      'processed-or-original') as ReportTimestampMode,
    reportWorkerPollMs: Number(process.env.REPORT_WORKER_POLL_MS ?? 1000),
    reportLeaseSeconds: Number(process.env.REPORT_LEASE_SECONDS ?? 30),
    reportMaxAttempts: Number(process.env.REPORT_MAX_ATTEMPTS ?? 3),
    reportRetryDelaySeconds: Number(process.env.REPORT_RETRY_DELAY_SECONDS ?? 5),
    logLevel: process.env.LOG_LEVEL ?? 'log',
  };
}
