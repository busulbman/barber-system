export function getServerEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;

  const normalized = name.includes("PRIVATE_KEY") ? value.replace(/\\n/g, "\n") : value;
  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireServerEnv(name: string): string {
  const value = getServerEnv(name);
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

export function isProductionServer(): boolean {
  return process.env.NODE_ENV === "production";
}

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getBooleanServerEnv(name: string): boolean {
  return parseBooleanEnv(getServerEnv(name));
}

export function allowFirebaseApiKeyDevFallback(): boolean {
  return !isProductionServer() && getBooleanServerEnv("ALLOW_FIREBASE_API_KEY_DEV_FALLBACK");
}
