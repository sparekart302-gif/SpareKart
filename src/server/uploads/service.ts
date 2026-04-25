import "server-only";

import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { getCurrentSessionUser } from "@/server/auth/service";
import { connectToMongo } from "@/server/mongodb/connection";
import { MongoApiError } from "@/server/mongodb/errors";
import { getAppUrl } from "@/server/config/env";
import type { UploadAssetKind } from "@/modules/uploads/shared";

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 1800;
const MAX_IMAGE_HEIGHT = 1800;
const WEBP_QUALITY = 82;
const WEBP_EFFORT = 4;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const UPLOAD_BUCKET_NAME = "sparekart_uploads";

type StoredUploadAsset = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: UploadAssetKind;
  originalName?: string;
  originalMimeType?: string;
  ownerHint?: string;
  uploadedByUserId?: string;
  uploadedAt?: string;
  width?: number;
  height?: number;
};

function getBucket(connection: Awaited<ReturnType<typeof connectToMongo>>) {
  const database = connection.connection.db;

  if (!database) {
    throw new MongoApiError("MongoDB database connection is not ready.", {
      status: 500,
      code: "MONGODB_NOT_READY",
    });
  }

  return new mongoose.mongo.GridFSBucket(database, {
    bucketName: UPLOAD_BUCKET_NAME,
  });
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveFileExtension(file: File) {
  return "webp";
}

function assertSupportedImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new MongoApiError("Only JPG, PNG, WEBP, and GIF images are supported.", {
      status: 415,
      code: "UNSUPPORTED_IMAGE_TYPE",
      details: {
        mimeType: file.type,
      },
    });
  }

  if (file.size <= 0) {
    throw new MongoApiError("The selected image is empty.", {
      status: 400,
      code: "EMPTY_IMAGE",
    });
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new MongoApiError("Image size must be 6 MB or less.", {
      status: 413,
      code: "IMAGE_TOO_LARGE",
      details: {
        maxBytes: MAX_IMAGE_SIZE_BYTES,
      },
    });
  }
}

async function optimizeImageToWebp(file: File) {
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(inputBuffer, {
    animated: true,
    failOn: "none",
  });

  const outputBuffer = await pipeline
    .rotate()
    .resize({
      width: MAX_IMAGE_WIDTH,
      height: MAX_IMAGE_HEIGHT,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: WEBP_QUALITY,
      effort: WEBP_EFFORT,
    })
    .toBuffer();

  const metadata = await sharp(outputBuffer, { animated: true }).metadata();

  return {
    buffer: outputBuffer,
    mimeType: "image/webp",
    size: outputBuffer.length,
    width: metadata.width,
    height: metadata.height,
  };
}

function buildAssetResponse(input: {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: UploadAssetKind;
  width?: number;
  height?: number;
}) {
  return {
    id: input.id,
    url: `/api/uploads/${input.id}`,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    kind: input.kind,
    width: input.width,
    height: input.height,
  };
}

export async function saveUploadedImage(input: {
  file: File;
  kind: UploadAssetKind;
  ownerHint?: string;
}) {
  assertSupportedImage(input.file);

  const connection = await connectToMongo();
  const bucket = getBucket(connection);
  const fileId = new mongoose.Types.ObjectId();
  const uploadedAt = new Date().toISOString();
  const currentUser = await getCurrentSessionUser();
  const extension = resolveFileExtension(input.file);
  const safeOriginalName = sanitizeFileName(input.file.name) || `${input.kind}.${extension}`;
  const fileName = `${input.kind}-${fileId.toHexString()}.${extension}`;
  const optimizedImage = await optimizeImageToWebp(input.file);

  await new Promise<void>((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(fileId, fileName, {
      metadata: {
        kind: input.kind,
        mimeType: optimizedImage.mimeType,
        originalName: safeOriginalName,
        originalMimeType: input.file.type,
        originalSize: input.file.size,
        width: optimizedImage.width,
        height: optimizedImage.height,
        ownerHint: input.ownerHint?.trim() || undefined,
        uploadedByUserId: currentUser?.id,
        uploadedByEmail: currentUser?.email,
        uploadedAt,
      },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve());
    Readable.from(optimizedImage.buffer).pipe(uploadStream);
  });

  return buildAssetResponse({
    id: fileId.toHexString(),
    fileName,
    mimeType: optimizedImage.mimeType,
    size: optimizedImage.size,
    kind: input.kind,
    width: optimizedImage.width,
    height: optimizedImage.height,
  });
}

export async function getUploadedImage(assetId: string): Promise<StoredUploadAsset & {
  buffer: Buffer;
}> {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw new MongoApiError("Invalid upload id.", {
      status: 400,
      code: "INVALID_UPLOAD_ID",
    });
  }

  const connection = await connectToMongo();
  const database = connection.connection.db;

  if (!database) {
    throw new MongoApiError("MongoDB database connection is not ready.", {
      status: 500,
      code: "MONGODB_NOT_READY",
    });
  }

  const objectId = new mongoose.Types.ObjectId(assetId);
  const bucket = getBucket(connection);
  const fileRecord = await database.collection(`${UPLOAD_BUCKET_NAME}.files`).findOne<{
    _id: mongoose.Types.ObjectId;
    filename: string;
    length: number;
    contentType?: string;
    metadata?: {
      kind?: UploadAssetKind;
      mimeType?: string;
      originalName?: string;
      originalMimeType?: string;
      originalSize?: number;
      width?: number;
      height?: number;
      ownerHint?: string;
      uploadedByUserId?: string;
      uploadedAt?: string;
    };
  }>({
    _id: objectId,
  });

  if (!fileRecord) {
    throw new MongoApiError("Image not found.", {
      status: 404,
      code: "UPLOAD_NOT_FOUND",
    });
  }

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(objectId);
    downloadStream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve());
  });

  return {
    id: objectId.toHexString(),
    url: getAppUrl(`/api/uploads/${objectId.toHexString()}`),
    fileName: fileRecord.filename,
    mimeType: fileRecord.metadata?.mimeType ?? fileRecord.contentType ?? "application/octet-stream",
    size: fileRecord.length,
    kind: fileRecord.metadata?.kind ?? "product",
    originalName: fileRecord.metadata?.originalName,
    originalMimeType: fileRecord.metadata?.originalMimeType,
    ownerHint: fileRecord.metadata?.ownerHint,
    uploadedByUserId: fileRecord.metadata?.uploadedByUserId,
    uploadedAt: fileRecord.metadata?.uploadedAt,
    width: fileRecord.metadata?.width,
    height: fileRecord.metadata?.height,
    buffer: Buffer.concat(chunks),
  };
}
