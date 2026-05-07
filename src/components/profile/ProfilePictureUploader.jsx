"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";

async function fileToSquareAvatarBlob(file, { size = 256, type = "image/webp", quality = 0.9 } = {}) {
  const f = file instanceof File ? file : null;
  if (!f) throw new Error("Missing file");
  if (!/^image\//i.test(f.type || "")) throw new Error("Please choose an image file.");

  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to read image"));
      i.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Center-crop to square.
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const s = Math.min(w, h);
    const sx = Math.floor((w - s) / 2);
    const sy = Math.floor((h - s) / 2);

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) throw new Error("Failed to encode image");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ProfilePictureUploader({ userId, handle, name, currentSrc, onUpdated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const chooseFile = () => inputRef.current?.click?.();

  const upload = async () => {
    if (!userId) {
      toast.error("Missing user id");
      return;
    }
    if (!file) {
      toast.error("Choose an image first");
      return;
    }
    setBusy(true);
    try {
      const blob = await fileToSquareAvatarBlob(file, { size: 256, type: "image/webp", quality: 0.9 });

      const presignRes = await fetch("/api/users/profile-picture/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contentType: blob.type,
          contentLength: blob.size,
        }),
      });
      const presignJson = await presignRes.json().catch(() => null);
      if (!presignRes.ok || !presignJson?.success) {
        throw new Error(presignJson?.message || "Failed to start upload");
      }

      const { uploadUrl, key, publicUrl, contentType } = presignJson.data || {};
      if (!uploadUrl || !key || !publicUrl) throw new Error("Upload init missing fields");

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType || blob.type,
        },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error("Upload failed");
      }

      const commitRes = await fetch("/api/users/profile-picture/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, publicUrl }),
      });
      const commitJson = await commitRes.json().catch(() => null);
      if (!commitRes.ok || !commitJson?.success) {
        throw new Error(commitJson?.message || "Failed to save profile picture");
      }

      toast.success("Profile picture updated");
      setFile(null);
      if (typeof onUpdated === "function") onUpdated(commitJson?.data?.profile_pic || publicUrl);
    } catch (e) {
      toast.error(e?.message || "Profile picture upload failed");
    } finally {
      setBusy(false);
    }
  };

  const src = previewUrl || currentSrc;

  return (
    <div className="rounded-lg border border-border bg-background p-4 text-sm text-foreground">
      <div className="font-semibold">Profile picture</div>
      <div className="mt-3 flex items-center gap-3">
        <UserAvatar src={src} handle={handle} name={name} size={48} className="h-12 w-12" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={chooseFile} disabled={busy}>
            Choose image
          </Button>
          <Button type="button" size="sm" onClick={upload} disabled={busy || !file}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Images are cropped to a square and resized for avatar use.
      </div>
    </div>
  );
}

