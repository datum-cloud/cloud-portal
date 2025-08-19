/**
 * Environment, runtime, and Node.js utilities
 * Environment variable validation, Node.js environment checks, and singleton pattern
 */
import { toBoolean } from '@/utils/helpers/text.helper';
import dotenv from 'dotenv';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test'] as const),
  SESSION_SECRET: z.string().optional(),
  APP_URL: z.string().optional(),
  API_URL: z.string().optional(),
  VERSION: z.string().optional(),

  // Cloud Valid providers
  CLOUDVALID_API_URL: z.string().optional(),
  CLOUDVALID_API_KEY: z.string().optional(),
  CLOUDVALID_TEMPLATE_ID: z.string().optional(),

  // Zitadel
  AUTH_OIDC_ISSUER: z.string().optional(),
  AUTH_OIDC_CLIENT_ID: z.string().optional(),

  FATHOM_ID: z.string().optional(),

  // Help Scout
  HELPSCOUT_BEACON_ID: z.string().optional(),
  HELPSCOUT_SECRET_KEY: z.string().optional(),

  TELEMETRY_URL: z.string().optional(),
  PROMETHEUS_URL: z.string().optional(),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {
      [key: string]: string | undefined;
    }
  }
}

/**
 * Initializes environment variables from .env file and validates them
 * @throws Error if environment variables are invalid or .env file cannot be read
 */
export function initEnvs() {
  const result = dotenv.config();
  if (result.error !== undefined) {
    throw new Error('Could not get configuration file: ' + result.error.message);
  }

  for (const key in result.parsed) {
    if (Object.prototype.hasOwnProperty.call(result.parsed, key)) {
      process.env[key] = result.parsed[key];
    }
  }

  const parsed = schema.safeParse(process.env);
  if (parsed.success === false) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables.');
  }
}

/**
 * Exports shared environment variables that are safe to include in the client
 * Do *NOT* add any environment variables that should not be exposed to the client
 * @returns Object containing client-safe environment variables
 */
export function getSharedEnvs() {
  return {
    APP_URL: process.env.APP_URL,
    API_URL: process.env.API_URL,
    VERSION: process.env.VERSION,
    FATHOM_ID: process.env.FATHOM_ID,
    HELPSCOUT_BEACON_ID: process.env.HELPSCOUT_BEACON_ID,
    HELPSCOUT_SECRET_KEY: process.env.HELPSCOUT_SECRET_KEY,
    TELEMETRY_URL: process.env.TELEMETRY_URL,
    PROMETHEUS_URL: process.env.PROMETHEUS_URL,

    // Sentry configuration
    SENTRY_ENV: process.env.SENTRY_ENV,
    SENTRY_DSN: process.env.SENTRY_DSN,

    isDebug: toBoolean(process.env.DEBUG),
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    isSentryEnabled: !!process.env.SENTRY_DSN,
  };
}

/**
 * Checks if the current environment is production
 * @returns Boolean indicating if NODE_ENV is 'production'
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Checks if the current environment is development
 * @returns Boolean indicating if NODE_ENV is 'development'
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Checks if the current environment is test
 * @returns Boolean indicating if NODE_ENV is 'test'
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Singleton Server-Side Pattern
 * Creates and caches a singleton instance to prevent recreation across server requests
 * @param name - Unique name for the singleton instance
 * @param value - Factory function that creates the singleton value
 * @returns The singleton instance
 */
export function singleton<Value>(name: string, value: () => Value): Value {
  const globalStore = global as unknown as {
    __singletons?: Record<string, Value>;
  };

  globalStore.__singletons ??= {};
  globalStore.__singletons[name] ??= value();

  return globalStore.__singletons[name];
}
