"use client";

import { useEffect, useId, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImageAsset } from "@/modules/uploads/client";
import type { UploadAssetKind } from "@/modules/uploads/shared";

type SingleImageUploadFieldProps = {
  label: string;
  value?: string;
  kind: UploadAssetKind;
  onChange: (nextValue: string) => void;
  helperText?: string;
  ownerHint?: string;
  previewClassName?: string;
};

type MultipleImageUploadFieldProps = {
  label: string;
  values: string[];
  kind: UploadAssetKind;
  onChange: (nextValues: string[]) => void;
  helperText?: string;
  ownerHint?: string;
  maxFiles?: number;
  previewClassName?: string;
};

export function SingleImageUploadField({
  label,
  value,
  kind,
  onChange,
  helperText,
  ownerHint,
  previewClassName,
}: SingleImageUploadFieldProps) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displaySrc = previewUrl ?? value;

  const handleSelect = async (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    setIsUploading(true);

    try {
      const asset = await uploadImageAsset({
        file,
        kind,
        ownerHint,
      });
      onChange(asset.url);
      setPreviewUrl(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {label}
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        {displaySrc ? (
          <div className="space-y-3">
            <div
              className={cn(
                "overflow-hidden rounded-[18px] bg-card",
                previewClassName ?? "aspect-[4/3]",
              )}
            >
              <img src={displaySrc} alt={label} className="h-full w-full object-cover" />
            </div>
            <label
              htmlFor={inputId}
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)]"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Replace image"}
            </label>
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] bg-card px-4 py-8 text-center shadow-[var(--shadow-soft)]"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            ) : (
              <ImagePlus className="h-5 w-5 text-accent" />
            )}
            <div className="text-sm font-semibold text-foreground">
              {isUploading ? "Uploading image..." : "Choose image from device"}
            </div>
            <div className="text-xs text-muted-foreground">
              JPG, PNG, WEBP, or GIF up to 6 MB. Auto-optimized to WebP.
            </div>
          </label>
        )}

        {helperText ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{helperText}</p>
        ) : null}
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Stored as optimized WebP for faster storefront and dashboard loading.
        </p>

        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            void handleSelect(event.target.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </div>
    </div>
  );
}

export function MultipleImageUploadField({
  label,
  values,
  kind,
  onChange,
  helperText,
  ownerHint,
  maxFiles = 4,
  previewClassName,
}: MultipleImageUploadFieldProps) {
  const inputId = useId();
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      localPreviews.forEach((previewUrl) => {
        if (previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
      });
    };
  }, [localPreviews]);

  const handleSelect = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).slice(0, Math.max(maxFiles - values.length, 0));

    if (!files.length) {
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));
    setLocalPreviews(previews);
    setIsUploading(true);

    try {
      const uploadedAssets = await Promise.all(
        files.map((file) =>
          uploadImageAsset({
            file,
            kind,
            ownerHint,
          }),
        ),
      );

      onChange([...values, ...uploadedAssets.map((asset) => asset.url)].slice(0, maxFiles));
      setLocalPreviews([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload images.");
    } finally {
      previews.forEach((previewUrl) => {
        if (previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
      });
      setLocalPreviews([]);
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={inputId}
          className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {label}
        </label>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {values.length}/{maxFiles}
        </span>
      </div>

      <div className="space-y-3 rounded-[22px] border border-dashed border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {values.map((imageUrl, index) => (
            <div key={imageUrl} className="space-y-2">
              <div
                className={cn(
                  "overflow-hidden rounded-[18px] bg-card",
                  previewClassName ?? "aspect-square",
                )}
              >
                <img
                  src={imageUrl}
                  alt={`${label} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ))}

          {localPreviews.map((previewUrl) => (
            <div key={previewUrl} className="space-y-2">
              <div
                className={cn(
                  "relative overflow-hidden rounded-[18px] bg-card",
                  previewClassName ?? "aspect-square",
                )}
              >
                <img
                  src={previewUrl}
                  alt="Uploading preview"
                  className="h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 grid place-items-center bg-black/20">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              </div>
            </div>
          ))}

          {values.length + localPreviews.length < maxFiles ? (
            <label
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] bg-card px-3 py-6 text-center shadow-[var(--shadow-soft)]",
                previewClassName ?? "aspect-square",
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : (
                <ImagePlus className="h-5 w-5 text-accent" />
              )}
              <div className="text-xs font-semibold text-foreground">
                {isUploading ? "Uploading..." : "Add image"}
              </div>
            </label>
          ) : null}
        </div>

        {helperText ? (
          <p className="text-xs leading-5 text-muted-foreground">{helperText}</p>
        ) : null}
        <p className="text-[11px] leading-5 text-muted-foreground">
          Uploaded files are automatically compressed and stored as WebP.
        </p>

        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(event) => {
            void handleSelect(event.target.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
      </div>
    </div>
  );
}
