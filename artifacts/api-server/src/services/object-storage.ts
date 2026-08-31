import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { Client, type RequestError } from "@replit/object-storage";

export interface UploadResult {
  publicId: string;
  url: string;
  type: "image" | "video";
}

export const MEDIA_FOLDERS = [
  "posts",
  "stories",
  "portfolios",
  "avatars",
  "banners",
  "messages",
  "general",
] as const;

const MEDIA_FOLDER_SET = new Set<string>(MEDIA_FOLDERS);
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
};
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
};
const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const MEDIA_KEY_PATTERN = new RegExp(
  `^(${MEDIA_FOLDERS.join("|")})/(${UUID_PATTERN})/(${UUID_PATTERN})\\.(jpg|png|webp|gif|mp4|webm|mov|avi)$`,
  "i",
);

let client: Client | undefined;

export class ObjectStorageError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "ObjectStorageError";
  }
}

function resultError(error: RequestError | Error | string): string {
  if (typeof error === "string") return error;
  return error.message || "Object Storage request failed";
}

function throwResultError(result: { ok: false; error: RequestError | Error | string }): never {
  const statusCode =
    typeof result.error === "object" &&
    result.error !== null &&
    "statusCode" in result.error &&
    typeof result.error.statusCode === "number"
      ? result.error.statusCode
      : undefined;
  throw new ObjectStorageError(resultError(result.error), statusCode);
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim() &&
    process.env.PRIVATE_OBJECT_DIR?.trim(),
  );
}

function getClient(): Client {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID?.trim();
  if (!bucketId) {
    throw new ObjectStorageError("Object Storage is not configured", 503);
  }
  client ??= new Client({ bucketId });
  return client;
}

export function extFromMime(mimetype: string): string {
  const extension = MIME_EXTENSIONS[mimetype.toLowerCase()];
  if (!extension) {
    throw new ObjectStorageError(`Unsupported media type: ${mimetype}`, 400);
  }
  return extension;
}

export function contentTypeFromKey(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export function isManagedMediaKey(key: string): boolean {
  return MEDIA_KEY_PATTERN.test(key);
}

export async function uploadMedia(
  file: Buffer,
  folder: string,
  userId: string,
  mimetype: string,
): Promise<UploadResult> {
  if (!MEDIA_FOLDER_SET.has(folder)) {
    throw new ObjectStorageError("Unsupported media folder", 400);
  }

  const extension = extFromMime(mimetype);
  const key = `${folder}/${userId}/${randomUUID()}.${extension}`;
  if (!isManagedMediaKey(key)) {
    throw new ObjectStorageError("Could not create a valid media key");
  }

  const result = await getClient().uploadFromBytes(key, file);
  if (!result.ok) throwResultError(result);

  return {
    publicId: key,
    url: `/api/media/${key}`,
    type: mimetype.toLowerCase().startsWith("video/") ? "video" : "image",
  };
}

export async function deleteMedia(key: string): Promise<void> {
  if (!isManagedMediaKey(key)) {
    throw new ObjectStorageError("Invalid media key", 400);
  }

  const result = await getClient().delete(key);
  if (!result.ok) throwResultError(result);
}

export function getMediaStream(key: string): Readable {
  if (!isManagedMediaKey(key)) {
    throw new ObjectStorageError("Invalid media key", 400);
  }
  return getClient().downloadAsStream(key);
}

export async function downloadMedia(key: string): Promise<Buffer> {
  if (!isManagedMediaKey(key)) {
    throw new ObjectStorageError("Invalid media key", 400);
  }

  const result = await getClient().downloadAsBytes(key);
  if (!result.ok) throwResultError(result);
  return result.value[0];
}