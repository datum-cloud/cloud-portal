import { z } from 'zod'

import dotenv from 'dotenv'

const schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test'] as const),
  SESSION_SECRET: z.string().optional(),
  APP_URL: z.string().optional(),
  API_URL: z.string().optional(),
  // Auth providers
  // Github
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  // Google
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {
      [key: string]: string | undefined
    }
  }
}

export function initEnvs() {
  const result = dotenv.config()
  if (result.error !== undefined) {
    throw new Error("Could not get configuration file: " + result.error.message);
  }

  for (const key in result.parsed) {
    if (Object.prototype.hasOwnProperty.call(result.parsed, key)) {
      process.env[key] = result.parsed[key]
    }
  }

  const parsed = schema.safeParse(process.env)
  if (parsed.success === false) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables.')
  }
}

/**
 * Exports shared environment variables.
 * Do *NOT* add any environment variables that do not wish to be included in the client.
 */
export function getSharedEnvs() {
  return {
    APP_URL: process.env.APP_URL,
    API_URL: process.env.API_URL,
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof schema> {
      [key: string]: string | undefined
    }
  }
}
