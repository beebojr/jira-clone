"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUploadUrl } from "@/lib/actions/upload";
import { updateTaskImages } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  taskId: string;
}

export function ImageUpload({ taskId }: ImageUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, GIF, WebP).");
      return;
    }

    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const { uploadUrl, key } = await getUploadUrl(taskId, file.name, file.type);

      // Detect mock mode (local development without S3)
      const isMockMode = uploadUrl.includes('mock-s3.local');

      if (isMockMode) {
        // In mock mode, skip actual S3 upload and store image URLs directly
        const mockOriginalUrl = `https://mock-s3.local/${key}`;
        const mockThumbnailUrl = `https://mock-s3.local/thumb-${key}`;

        await updateTaskImages(taskId, mockOriginalUrl, mockThumbnailUrl);
        
        toast.success("Image stored successfully (mock mode)");
        setDone(true);
        
        // Refresh immediately in mock mode
        setTimeout(() => {
          router.refresh();
          setDone(false);
        }, 1000);
      } else {
        // Real S3 upload
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!response.ok) throw new Error(`Upload failed (${response.status})`);

        setDone(true);
        toast.success("Image uploaded! Thumbnail is being generated…");

        // Give Lambda time to resize and update DB, then refresh
        setTimeout(() => {
          router.refresh();
          setDone(false);
        }, 5000);
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Failed to upload image";
      const message = rawMessage.includes("FORBIDDEN")
        ? "You are not allowed to upload files for this task"
        : rawMessage;
      setError(message);
      toast.error(message);
      setDone(false);
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected after failure
      e.target.value = "";
    }
  }

  return (
    <div
      className="bg-surface-1 rounded-xl border border-border-default overflow-hidden"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      {done ? (
        /* ── Success State ──────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <p className="text-sm font-medium text-success">Upload Complete</p>
          <p className="text-xs text-text-tertiary mt-1 max-w-[180px]">
            Generating thumbnail… page will refresh shortly.
          </p>
        </div>
      ) : (
        /* ── Upload Zone ────────────────────────────────────────── */
        <label
          className={`flex flex-col items-center justify-center py-6 px-4 text-center cursor-pointer group
            transition-colors hover:bg-surface-2 border-2 border-dashed rounded-xl
            ${uploading ? "border-brand/30 bg-brand/5" : error ? "border-danger/30 bg-danger/5" : "border-border-default hover:border-brand/40"}`}
          style={{ transitionDuration: "var(--transition-base)" }}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors
              ${uploading ? "bg-brand/15" : error ? "bg-danger/10" : "bg-surface-2 group-hover:bg-brand/10"}`}
            style={{ transitionDuration: "var(--transition-fast)" }}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-brand animate-spin" />
            ) : error ? (
              <AlertTriangle className="w-5 h-5 text-danger" />
            ) : (
              <ImageIcon className="w-5 h-5 text-text-tertiary group-hover:text-brand transition-colors" style={{ transitionDuration: "var(--transition-fast)" }} />
            )}
          </div>

          <p className="text-sm font-medium text-text-primary mb-0.5">
            {uploading
              ? "Uploading…"
              : error
              ? "Upload failed — try again"
              : "Attach an image"}
          </p>
          <p className="text-xs text-text-tertiary">
            {uploading ? "Please wait" : "JPG, PNG, GIF, WebP up to 5 MB"}
          </p>

          <input
            id={`file-${taskId}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
            aria-label="Upload task image"
          />

          {!uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`mt-4 border-border-default transition-colors pointer-events-none
                ${error
                  ? "bg-danger/10 text-danger border-danger/30"
                  : "bg-surface-2 text-text-secondary group-hover:border-brand/50 group-hover:text-brand group-hover:bg-brand/5"
                }`}
              style={{ transitionDuration: "var(--transition-fast)" }}
              tabIndex={-1}
              aria-hidden="true"
            >
              {error ? "Retry Upload" : "Select File"}
            </Button>
          )}
        </label>
      )}
    </div>
  );
}
