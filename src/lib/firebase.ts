function requirePublicEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required Firebase environment variable: ${name}`);
  }

  return trimmed;
}

export function getFirebaseProjectId(): string {
  return requirePublicEnv("VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

export function getFirebaseApiKey(): string {
  return requirePublicEnv("VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY);
}

export function getFirebaseStorageBucket(): string {
  return requirePublicEnv(
    "VITE_FIREBASE_STORAGE_BUCKET",
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  );
}

export const FIRESTORE_DATABASE_ID = "(default)";
