export interface EnvContract {
  DATABASE_URL: string;
  REDIS_URL: string;
  PORT: string;
  WEB_PORT: string;
  NODE_ENV: "development" | "production" | "test";
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
}
