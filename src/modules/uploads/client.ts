"use client";

import type { UploadAssetKind } from "./shared";

export type UploadedImageAsset = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: UploadAssetKind;
  width?: number;
  height?: number;
};

type UploadImageInput = {
  file: File;
  kind: UploadAssetKind;
  ownerHint?: string;
};

export async function uploadImageAsset(input: UploadImageInput) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("kind", input.kind);

  if (input.ownerHint?.trim()) {
    formData.append("ownerHint", input.ownerHint.trim());
  }

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | {
        ok: true;
        item: UploadedImageAsset;
      }
    | {
        ok: false;
        error?: string;
      };

  if (!response.ok || !payload.ok) {
    const message = "error" in payload ? payload.error : undefined;
    throw new Error(message ?? "Unable to upload image.");
  }

  return payload.item;
}
