import { toBoolean } from '@/utils/helpers';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  FATHOM_ID: z.string().optional(),
  AUTH_OIDC_ISSUER: z.string().url(),
  AUTH_OIDC_CLIENT_ID: z.string(),
  SESSION_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

const parsedEnv = getEnv();

export const env = {
  ...parsedEnv,
  AUTH_OIDC_CLIENT_SECRET: process.env.AUTH_OIDC_CLIENT_SECRET,
  OTEL_ENABLED: process.env.OTEL_ENABLED,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_LOG_LEVEL: process.env.OTEL_LOG_LEVEL,

  isDev: parsedEnv.NODE_ENV === 'development',
  isProd: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test',
  isDebug: toBoolean(process.env.DEBUG),
  isCypress: toBoolean(process.env.CYPRESS),
  isOtelEnabled:
    toBoolean(process.env.OTEL_ENABLED) && process.env.OTEL_EXPORTER_OTLP_ENDPOINT !== '',
};
