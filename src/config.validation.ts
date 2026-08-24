type Environment = Record<string, string | undefined>;

function readString(env: Environment, key: string, defaultValue?: string): string {
  const value = env[key]?.trim() || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function readNumber(
  env: Environment,
  key: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const raw = env[key] ?? String(defaultValue);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  const env = raw as Environment;
  const nodeEnv = readString(env, 'NODE_ENV', 'development');
  const accessSecret = readString(env, 'JWT_ACCESS_SECRET');
  const refreshSecret = readString(env, 'JWT_REFRESH_SECRET');

  if (nodeEnv === 'production' && (accessSecret.length < 32 || refreshSecret.length < 32)) {
    throw new Error('JWT secrets must contain at least 32 characters in production');
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  return {
    ...raw,
    NODE_ENV: nodeEnv,
    PORT: readNumber(env, 'PORT', 3000, 1, 65535),
    DATABASE_URL: readString(env, 'DATABASE_URL'),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    ACCESS_TOKEN_TTL_SECONDS: readNumber(env, 'ACCESS_TOKEN_TTL_SECONDS', 900, 60, 86400),
    REFRESH_TOKEN_TTL_SECONDS: readNumber(env, 'REFRESH_TOKEN_TTL_SECONDS', 604800, 300, 31536000),
    BCRYPT_ROUNDS: readNumber(env, 'BCRYPT_ROUNDS', 12, 10, 15),
    ROOT_NAME: readString(env, 'ROOT_NAME', 'System Root'),
    ROOT_EMAIL: readString(env, 'ROOT_EMAIL', 'root@example.com').toLowerCase(),
    ROOT_PASSWORD: readString(env, 'ROOT_PASSWORD'),
    CORS_ORIGIN: readString(env, 'CORS_ORIGIN', 'http://localhost:5173'),
  };
}
