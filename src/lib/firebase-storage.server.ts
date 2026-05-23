import { getFirebaseStorageBucket } from "./firebase";
import {
  FirestoreConfigurationError,
  GOOGLE_API_SCOPES,
  getFirestoreAuthMode,
  getGoogleServiceAccountAccessToken,
} from "./firestore-rest.server";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BARBER_PHOTO_UPLOAD_BYTES = 3 * 1024 * 1024;

type UploadBarberPhotoInput = {
  barberId: string;
  contentType: string;
  dataUrl: string;
};

function sanitizeBarberId(barberId: string): string {
  return barberId.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || crypto.randomUUID();
}

function parseImageDataUrl(dataUrl: string): { contentType: string; bytes: Uint8Array } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Fotoğraf verisi geçersiz.");
  }

  const [, contentType, base64] = match;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  if (!ACCEPTED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.");
  }

  if (bytes.byteLength > MAX_BARBER_PHOTO_UPLOAD_BYTES) {
    throw new Error("Sıkıştırılmış görsel 3 MB sınırını aşıyor.");
  }

  return { contentType, bytes };
}

function getFileExtension(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function buildFirebaseDownloadUrl(bucket: string, objectPath: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${encodeURIComponent(token)}`;
}

async function uploadObjectToStorage(
  bucket: string,
  objectPath: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<string> {
  const downloadToken = crypto.randomUUID();
  const boundary = `barber-photo-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: objectPath,
    contentType,
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
    },
  });

  const body = concatBytes([
    toBytes(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    ),
    toBytes(`--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    toBytes(`\r\n--${boundary}--`),
  ]);

  const accessToken = await getGoogleServiceAccountAccessToken([GOOGLE_API_SCOPES.cloudStorage]);
  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=multipart`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body: new Blob([toArrayBuffer(body)]),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Fotoğraf yükleme başarısız oldu: ${response.status} ${responseText}`);
  }

  return buildFirebaseDownloadUrl(bucket, objectPath, downloadToken);
}

export async function uploadBarberPhoto({
  barberId,
  contentType,
  dataUrl,
}: UploadBarberPhotoInput): Promise<{
  photoUrl: string;
  storageMode: "service-account" | "dev-inline-fallback";
}> {
  const parsed = parseImageDataUrl(dataUrl);
  if (parsed.contentType !== contentType) {
    throw new Error("Dosya tipi doğrulanamadı.");
  }

  const authMode = getFirestoreAuthMode();
  if (authMode === "service-account") {
    const bucket = getFirebaseStorageBucket();
    const safeBarberId = sanitizeBarberId(barberId);
    const objectPath = `barbers/${safeBarberId}/profile-${Date.now()}.${getFileExtension(contentType)}`;
    const photoUrl = await uploadObjectToStorage(bucket, objectPath, contentType, parsed.bytes);

    return {
      photoUrl,
      storageMode: "service-account",
    };
  }

  if (authMode === "api-key-dev-fallback") {
    return {
      photoUrl: dataUrl,
      storageMode: "dev-inline-fallback",
    };
  }

  throw new FirestoreConfigurationError(
    "Berber fotoğraf yükleme için Firebase service account ve storage bucket gerekli.",
  );
}
