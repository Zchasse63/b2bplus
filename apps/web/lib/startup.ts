/**
 * Application startup validation
 * Runs on server startup to validate all required configuration
 */

import { validateEnv } from './env';

let startupValidationDone = false;

/**
 * Validate application startup
 * Should be called once when the application starts
 */
export function validateStartup(): void {
  if (startupValidationDone) {
    return;
  }

  try {
    // Validate environment variables
    validateEnv();
    startupValidationDone = true;
    console.log('✓ Application startup validation passed');
  } catch (error) {
    console.error('✗ Application startup validation failed');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Check if startup validation has been completed
 */
export function isStartupValidated(): boolean {
  return startupValidationDone;
}

