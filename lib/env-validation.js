/**
 * Environment variable validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_CHANNEL_ID',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'JWT_SECRET',
];

const optionalEnvVars = [
  'TRAKTEER_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
];

export function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional variables
  for (const varName of optionalEnvVars) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Throw error if required vars missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(v => `  - ${v}`).join('\n') +
      `\n\nPlease set these variables in your .env.local file or deployment environment.` +
      `\nSee .env.example for reference.`
    );
  }

  // Log warnings for optional vars
  if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `Optional environment variables not set:\n` +
      warnings.map(v => `  - ${v}`).join('\n')
    );
  }

  // Validate JWT_SECRET strength (at least 32 characters)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(
      `WARNING: JWT_SECRET is too short (${process.env.JWT_SECRET.length} chars). ` +
      `Recommended: at least 32 characters. Generate with: openssl rand -base64 32`
    );
  }

  return true;
}

// Run validation immediately when module is imported
if (typeof process !== 'undefined' && process.env) {
  try {
    validateEnv();
    console.log('✓ Environment variables validated');
  } catch (error) {
    console.error('✗ Environment validation failed:');
    console.error(error.message);
    process.exit(1);
  }
}
