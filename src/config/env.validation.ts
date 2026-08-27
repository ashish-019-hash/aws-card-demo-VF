import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  CURSOR_SECRET: Joi.string().min(32).required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number().integer().min(1).max(86400).default(900),
  REPORT_TIMESTAMP_MODE: Joi.string()
    .valid('processed-or-original', 'processed')
    .default('processed-or-original'),
  REPORT_WORKER_POLL_MS: Joi.number().integer().min(100).max(60000).default(1000),
  REPORT_LEASE_SECONDS: Joi.number().integer().min(3).max(3600).default(30),
  REPORT_MAX_ATTEMPTS: Joi.number().integer().min(1).max(100).default(3),
  REPORT_RETRY_DELAY_SECONDS: Joi.number().integer().min(0).max(3600).default(5),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'log', 'debug', 'verbose').default('log'),
}).unknown(true);
