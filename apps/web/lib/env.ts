import { z } from 'zod';

/**
 * Environment variable validation
 * Validates all required environment variables at startup
 * Fails fast with clear error messages if any are missing
 */

const EnvSchema = z.object({
  // Supabase Configuration (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Google Gemini AI (Required)
  GOOGLE_API_KEY: z.string().min(1, 'Google API key is required'),

  // SendGrid Email (Required)
  SENDGRID_API_KEY: z.string().min(1, 'SendGrid API key is required'),
  SENDGRID_FROM_EMAIL: z.string().email('Invalid SendGrid from email'),
  SENDGRID_FROM_NAME: z.string().min(1, 'SendGrid from name is required'),
  SENDGRID_REPLY_TO_EMAIL: z.string().email('Invalid SendGrid reply-to email').optional(),
  SENDGRID_WEBHOOK_SIGNING_KEY: z.string().min(1, 'SendGrid webhook signing key is required').optional(),

  // Email Webhook (Optional - for inbound email authentication)
  EMAIL_WEBHOOK_SECRET: z.string().min(1, 'Email webhook secret is required').optional(),

  // Upstash Redis (Optional - for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token is required').optional(),

  // Sentry (Optional - for error tracking)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),
  SENTRY_DSN: z.string().url('Invalid Sentry DSN').optional(),

  // Application Configuration (Optional)
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Test Configuration (Optional)
  TEST_USER_EMAIL: z.string().email('Invalid test user email').optional(),
  TEST_USER_PASSWORD: z.string().optional(),
  TEST_ADMIN_EMAIL: z.string().email('Invalid test admin email').optional(),
  TEST_ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validate environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME,
    SENDGRID_REPLY_TO_EMAIL: process.env.SENDGRID_REPLY_TO_EMAIL,
    SENDGRID_WEBHOOK_SIGNING_KEY: process.env.SENDGRID_WEBHOOK_SIGNING_KEY,
    EMAIL_WEBHOOK_SECRET: process.env.EMAIL_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
    TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
    TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD,
  };

  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errors}\n\nPlease check your .env.local file and ensure all required variables are set.`
    );
  }

  return result.data;
}

/**
 * Get validated environment variables
 * Safe to use after validateEnv() has been called
 */
let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (!validatedEnv) {
    validatedEnv = validateEnv();
  }
  return validatedEnv;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test';
}

