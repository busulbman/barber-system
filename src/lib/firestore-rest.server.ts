import { FIRESTORE_DATABASE_ID, getFirebaseApiKey, getFirebaseProjectId } from "./firebase";
import { allowFirebaseApiKeyDevFallback, getServerEnv } from "./env.server";

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const CLOUD_STORAGE_SCOPE = "https://www.googleapis.com/auth/devstorage.full_control";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const BOOKINGS_COLLECTION = "bookings";
const BOOKING_SLOTS_COLLECTION = "bookingSlots";

type FirestoreValue =
  | { stringValue: string }
  | { timestampValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

type FirestoreRunQueryRow = {
  document?: FirestoreDocument;
};

type FirestoreAccessPolicy = "allow-dev-fallback" | "require-service-account";

type ServiceAccountRuntime = {
  authMode: "service-account";
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type ApiKeyFallbackRuntime = {
  authMode: "api-key-dev-fallback";
  projectId: string;
  apiKey: string;
};

type FirestoreRuntime = ServiceAccountRuntime | ApiKeyFallbackRuntime;

type FirestoreRequestOptions = {
  accessPolicy?: FirestoreAccessPolicy;
  operation: string;
  query?: URLSearchParams;
};

type FirestoreDocumentOptions = {
  accessPolicy?: FirestoreAccessPolicy;
  operation: string;
  documentId?: string;
};

type FirestoreUpdateOptions = {
  accessPolicy?: FirestoreAccessPolicy;
  operation: string;
  fieldPaths?: string[];
};

type BookingSlotLockPayload = {
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  barber: string;
  slotTime: string;
  service: string;
  createdAt: string;
};

export type FirestoreDocumentRecord = {
  id: string;
  data: Record<string, unknown>;
};

export type FirestoreAuthMode = "service-account" | "api-key-dev-fallback" | "unconfigured";

export class FirestoreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreConfigurationError";
  }
}

export class FirestoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreConflictError";
  }
}

export class FirestoreNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirestoreNotFoundError";
  }
}

let tokenCache:
  | {
      cacheKey: string;
      accessToken: string;
      expiresAt: number;
    }
  | undefined;

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncode(new TextEncoder().encode(value));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createSignedJwt(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncodeString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function getServiceAccountRuntime(): ServiceAccountRuntime | null {
  const projectId = getServerEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getServerEnv("FIREBASE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = getServerEnv("FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    authMode: "service-account",
    projectId,
    clientEmail,
    privateKey,
  };
}

function getMissingServiceAccountVars(): string[] {
  const requiredVars = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_SERVICE_ACCOUNT_EMAIL",
    "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY",
  ];

  return requiredVars.filter((name) => !getServerEnv(name));
}

function resolveFirestoreRuntime({
  accessPolicy = "allow-dev-fallback",
  operation,
}: Omit<FirestoreRequestOptions, "query">): FirestoreRuntime {
  const serviceAccount = getServiceAccountRuntime();
  if (serviceAccount) {
    return serviceAccount;
  }

  if (accessPolicy === "allow-dev-fallback" && allowFirebaseApiKeyDevFallback()) {
    return {
      authMode: "api-key-dev-fallback",
      projectId: getFirebaseProjectId(),
      apiKey: getFirebaseApiKey(),
    };
  }

  const missingVars = getMissingServiceAccountVars().join(", ");
  const fallbackHint =
    accessPolicy === "allow-dev-fallback"
      ? " For local development only, set ALLOW_FIREBASE_API_KEY_DEV_FALLBACK=true."
      : "";

  throw new FirestoreConfigurationError(
    `Firestore ${operation} requires ${missingVars || "service account credentials"}.${fallbackHint}`,
  );
}

export function getFirestoreAuthMode(): FirestoreAuthMode {
  if (getServiceAccountRuntime()) {
    return "service-account";
  }

  if (allowFirebaseApiKeyDevFallback()) {
    return "api-key-dev-fallback";
  }

  return "unconfigured";
}

async function getServiceAccountAccessToken(runtime: ServiceAccountRuntime): Promise<string> {
  return getGoogleServiceAccountAccessToken([FIRESTORE_SCOPE], runtime);
}

export async function getGoogleServiceAccountAccessToken(
  scopes: string[] = [FIRESTORE_SCOPE],
  runtimeOverride?: ServiceAccountRuntime,
): Promise<string> {
  const runtime = runtimeOverride || getServiceAccountRuntime();
  if (!runtime) {
    const missingVars = getMissingServiceAccountVars().join(", ");
    throw new FirestoreConfigurationError(
      `Google API access requires ${missingVars || "service account credentials"}.`,
    );
  }

  const normalizedScopes = [...new Set(scopes)].sort();
  const cacheKey = `${runtime.projectId}:${runtime.clientEmail}:${normalizedScopes.join(",")}`;
  if (
    tokenCache &&
    tokenCache.cacheKey === cacheKey &&
    tokenCache.expiresAt > Date.now() + 60_000
  ) {
    return tokenCache.accessToken;
  }

  const assertion = await createSignedJwt(
    runtime.clientEmail,
    runtime.privateKey,
    normalizedScopes,
  );
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    cacheKey,
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

export const GOOGLE_API_SCOPES = {
  firestore: FIRESTORE_SCOPE,
  cloudStorage: CLOUD_STORAGE_SCOPE,
} as const;

function getDocumentsBaseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${FIRESTORE_DATABASE_ID}/documents`;
}

async function buildFirestoreRequest(
  path: string,
  init: RequestInit,
  { accessPolicy = "allow-dev-fallback", operation, query }: FirestoreRequestOptions,
): Promise<Response> {
  const runtime = resolveFirestoreRuntime({ accessPolicy, operation });
  const url = new URL(`${getDocumentsBaseUrl(runtime.projectId)}${path}`);

  if (query) {
    query.forEach((value, key) => url.searchParams.append(key, value));
  }

  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set("content-type", "application/json");
  }

  if (runtime.authMode === "service-account") {
    headers.set("authorization", `Bearer ${await getServiceAccountAccessToken(runtime)}`);
  } else {
    url.searchParams.set("key", runtime.apiKey);
  }

  return fetch(url, { ...init, headers });
}

async function parseFirestoreError(response: Response): Promise<Error> {
  const body = await response.text();
  const message = `Firestore request failed: ${response.status} ${body}`;

  if (response.status === 404) {
    return new FirestoreNotFoundError(message);
  }

  if (response.status === 409) {
    return new FirestoreConflictError(message);
  }

  return new Error(message);
}

function decodeFirestoreValue(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map((item) => decodeFirestoreValue(item));
  }
  if ("mapValue" in value) {
    const entries = Object.entries(value.mapValue.fields ?? {});
    return Object.fromEntries(entries.map(([key, item]) => [key, decodeFirestoreValue(item)]));
  }
  return undefined;
}

function decodeFirestoreDocument(document: FirestoreDocument): FirestoreDocumentRecord {
  const id = document.name.split("/").pop() ?? "";
  const data = Object.fromEntries(
    Object.entries(document.fields ?? {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
  );
  return { id, data };
}

function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeFirestoreValue(item)) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            encodeFirestoreValue(item),
          ]),
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function encodeFirestoreFields(data: Record<string, unknown>): {
  fields: Record<string, FirestoreValue>;
} {
  return {
    fields: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]),
    ),
  };
}

async function runCollectionQuery(
  collectionId: string,
  structuredQuery: Record<string, unknown>,
  accessPolicy: FirestoreAccessPolicy,
  operation: string,
): Promise<FirestoreDocumentRecord[]> {
  const response = await buildFirestoreRequest(
    ":runQuery",
    {
      method: "POST",
      body: JSON.stringify({ structuredQuery }),
    },
    {
      accessPolicy,
      operation,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  const rows = (await response.json()) as FirestoreRunQueryRow[];
  return rows
    .map((row) => row.document)
    .filter((document): document is FirestoreDocument => Boolean(document))
    .map((document) => decodeFirestoreDocument(document));
}

export async function listCollectionDocuments(
  collectionId: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<FirestoreDocumentRecord[]> {
  return runCollectionQuery(
    collectionId,
    {
      from: [{ collectionId }],
    },
    accessPolicy,
    `${collectionId} list query`,
  );
}

export async function getCollectionDocument(
  collectionId: string,
  id: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<FirestoreDocumentRecord> {
  const response = await buildFirestoreRequest(
    `/${collectionId}/${encodeURIComponent(id)}`,
    { method: "GET" },
    {
      accessPolicy,
      operation: `${collectionId} get`,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  return decodeFirestoreDocument((await response.json()) as FirestoreDocument);
}

export async function createCollectionDocument(
  collectionId: string,
  data: Record<string, unknown>,
  {
    accessPolicy = "allow-dev-fallback",
    operation = `${collectionId} create`,
    documentId,
  }: FirestoreDocumentOptions,
): Promise<FirestoreDocumentRecord> {
  const query = documentId ? new URLSearchParams({ documentId }) : undefined;
  const response = await buildFirestoreRequest(
    `/${collectionId}`,
    {
      method: "POST",
      body: JSON.stringify(encodeFirestoreFields(data)),
    },
    {
      accessPolicy,
      operation,
      query,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  return decodeFirestoreDocument((await response.json()) as FirestoreDocument);
}

export async function updateCollectionDocument(
  collectionId: string,
  id: string,
  data: Record<string, unknown>,
  {
    accessPolicy = "allow-dev-fallback",
    operation = `${collectionId} update`,
    fieldPaths,
  }: FirestoreUpdateOptions,
): Promise<FirestoreDocumentRecord> {
  const query = new URLSearchParams();
  for (const fieldPath of fieldPaths ?? Object.keys(data)) {
    query.append("updateMask.fieldPaths", fieldPath);
  }

  const response = await buildFirestoreRequest(
    `/${collectionId}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(encodeFirestoreFields(data)),
    },
    {
      accessPolicy,
      operation,
      query,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  return decodeFirestoreDocument((await response.json()) as FirestoreDocument);
}

export async function deleteCollectionDocument(
  collectionId: string,
  id: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<void> {
  const response = await buildFirestoreRequest(
    `/${collectionId}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    {
      accessPolicy,
      operation: `${collectionId} delete`,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }
}

export async function queryBookingDocuments(
  date?: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<FirestoreDocumentRecord[]> {
  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: BOOKINGS_COLLECTION }],
  };

  if (date) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: "date" },
        op: "EQUAL",
        value: { stringValue: date },
      },
    };
  }

  return runCollectionQuery(
    BOOKINGS_COLLECTION,
    structuredQuery,
    accessPolicy,
    date ? "booking date query" : "booking list query",
  );
}

export async function getBookingDocument(
  id: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<FirestoreDocumentRecord> {
  const response = await buildFirestoreRequest(
    `/${BOOKINGS_COLLECTION}/${encodeURIComponent(id)}`,
    { method: "GET" },
    {
      accessPolicy,
      operation: "booking get",
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  return decodeFirestoreDocument((await response.json()) as FirestoreDocument);
}

export async function createBookingDocument(
  data: Record<string, unknown>,
  {
    accessPolicy = "allow-dev-fallback",
    operation = "booking create",
    documentId,
  }: FirestoreDocumentOptions,
): Promise<FirestoreDocumentRecord> {
  const query = documentId ? new URLSearchParams({ documentId }) : undefined;
  const response = await buildFirestoreRequest(
    `/${BOOKINGS_COLLECTION}`,
    {
      method: "POST",
      body: JSON.stringify(
        encodeFirestoreFields({
          ...data,
          status: "Bekliyor",
          createdAt: new Date().toISOString(),
        }),
      ),
    },
    {
      accessPolicy,
      operation,
      query,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }

  return decodeFirestoreDocument((await response.json()) as FirestoreDocument);
}

export async function updateBookingStatusDocument(
  id: string,
  status: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<void> {
  const query = new URLSearchParams();
  query.append("updateMask.fieldPaths", "status");

  const response = await buildFirestoreRequest(
    `/${BOOKINGS_COLLECTION}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(encodeFirestoreFields({ status })),
    },
    {
      accessPolicy,
      operation: "booking status update",
      query,
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }
}

export async function deleteBookingDocument(
  id: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<void> {
  const response = await buildFirestoreRequest(
    `/${BOOKINGS_COLLECTION}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
    {
      accessPolicy,
      operation: "booking delete",
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }
}

export async function createBookingSlotLock(
  slotId: string,
  payload: BookingSlotLockPayload,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<void> {
  const response = await buildFirestoreRequest(
    `/${BOOKING_SLOTS_COLLECTION}`,
    {
      method: "POST",
      body: JSON.stringify(
        encodeFirestoreFields({
          ...payload,
          lockId: slotId,
        }),
      ),
    },
    {
      accessPolicy,
      operation: "booking slot lock create",
      query: new URLSearchParams({ documentId: slotId }),
    },
  );

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }
}

export async function deleteBookingSlotLock(
  slotId: string,
  accessPolicy: FirestoreAccessPolicy = "allow-dev-fallback",
): Promise<void> {
  const response = await buildFirestoreRequest(
    `/${BOOKING_SLOTS_COLLECTION}/${encodeURIComponent(slotId)}`,
    {
      method: "DELETE",
    },
    {
      accessPolicy,
      operation: "booking slot lock delete",
    },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw await parseFirestoreError(response);
  }
}
