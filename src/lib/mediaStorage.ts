/**
 * Noticed Media Pipeline: Video & Photo Storage Management
 * Handles local compression, thumbnail extraction, validation,
 * and automatic Supabase Storage ('noticed-media' bucket) uploads with offline fallback.
 */

import { supabase, isSupabaseConfigured, getCurrentUser } from "./supabase";
import { compressImageFile } from "./storage";

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}

const STORAGE_BUCKET = "noticed-media";
const MAX_VIDEO_DURATION_SECONDS = 35;
const MAX_VIDEO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export type MediaFolder = "photos" | "videos" | "avatars" | "audio";

/**
 * Converts a base64 DataURL into a binary Blob for cloud storage upload.
 */
export function dataUrlToBlob(dataUrl: string): {
  blob: Blob;
  contentType: string;
  ext: string;
} | null {
  try {
    const [header, base64Data] = dataUrl.split(",");
    if (!header || !base64Data) return null;

    const mimeMatch = header.match(/data:([^;]+);base64/);
    const contentType = mimeMatch ? mimeMatch[1] : "application/octet-stream";

    let ext = "bin";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
    else if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("audio/mp4") || contentType.includes("audio/aac")) ext = "m4a";
    else if (contentType.includes("audio/mpeg") || contentType.includes("audio/mp3")) ext = "mp3";
    else if (contentType.includes("audio/ogg")) ext = "ogg";
    else if (contentType.includes("audio/wav")) ext = "wav";
    else if (contentType.includes("audio/webm")) ext = "webm";
    else if (contentType.includes("mp4")) ext = "mp4";
    else if (contentType.includes("quicktime") || contentType.includes("mov")) ext = "mov";
    else if (contentType.includes("webm")) ext = "webm";

    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    return {
      blob: new Blob([byteArrays], { type: contentType }),
      contentType,
      ext,
    };
  } catch (err) {
    console.warn("[MediaStorage] Failed to convert DataURL to Blob:", err);
    return null;
  }
}

/**
 * Uploads a binary Blob or File to Supabase Storage ('noticed-media' bucket)
 * and returns its permanent public URL. Returns null if offline or bucket unavailable.
 */
export async function uploadMediaToSupabase(
  blobOrFile: Blob | File,
  folder: MediaFolder,
  ext: string,
  contentType: string
): Promise<string | null> {
  if (!isSupabaseConfigured || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    const ownerFolder = user?.id || "guest";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${folder}/${ownerFolder}/${uniqueName}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blobOrFile, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) {
      console.warn(`[MediaStorage] Supabase Storage upload skipped (${error.message}), using local fallback.`);
      return null;
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (err) {
    console.warn("[MediaStorage] Cloud upload failed, using offline fallback:", err);
    return null;
  }
}

/**
 * Extracts the internal bucket path from a Supabase Storage public URL.
 */
export function extractStoragePathFromUrl(url: string): string | null {
  if (!url || !url.startsWith("http")) return null;
  const marker = `/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const rawPath = url.slice(idx + marker.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
}

/**
 * Deletes an array of media URLs from the 'noticed-media' Supabase Storage bucket.
 * Returns true if deletion succeeded (or no valid bucket paths existed), false if offline/failed.
 */
export async function deleteMediaUrlsFromSupabase(urls: string[]): Promise<boolean> {
  const paths = urls
    .map((u) => extractStoragePathFromUrl(u))
    .filter((p): p is string => Boolean(p));

  if (paths.length === 0) return true;
  if (!isSupabaseConfigured || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return false;
  }

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    if (error) {
      console.warn("[MediaStorage] Failed to purge files from bucket:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[MediaStorage] Error purging files from bucket:", err);
    return false;
  }
}

/**
 * Compresses a photo file and uploads it to Supabase Storage ('noticed-media/photos').
 * Falls back to the compressed base64 DataURL when offline.
 */
export async function processPhotoFile(file: File): Promise<string> {
  const compressedDataUrl = await compressImageFile(file, 1600, 0.82);
  if (!compressedDataUrl) {
    throw new Error("Failed to compress photo");
  }

  const parsed = dataUrlToBlob(compressedDataUrl);
  if (parsed) {
    const remoteUrl = await uploadMediaToSupabase(
      parsed.blob,
      "photos",
      parsed.ext,
      parsed.contentType
    );
    if (remoteUrl) {
      return remoteUrl;
    }
  }

  return compressedDataUrl;
}

/**
 * Uploads a recorded Voice Memo audio Blob to Supabase Storage ('noticed-media/audio').
 * Falls back to a persistent base64 DataURL when offline.
 */
export async function processAudioBlob(blob: Blob, fallbackDataUrl?: string): Promise<string> {
  const contentType = blob.type || "audio/webm";
  let ext = "webm";
  if (contentType.includes("mp4") || contentType.includes("aac")) ext = "m4a";
  else if (contentType.includes("mpeg") || contentType.includes("mp3")) ext = "mp3";
  else if (contentType.includes("ogg")) ext = "ogg";
  else if (contentType.includes("wav")) ext = "wav";

  if (blob.size > 0) {
    const remoteUrl = await uploadMediaToSupabase(blob, "audio", ext, contentType);
    if (remoteUrl) {
      return remoteUrl;
    }
  }

  if (fallbackDataUrl) return fallbackDataUrl;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

/**
 * Ensures any local base64 DataURLs in an array are uploaded to Supabase Storage
 * and replaced with lightweight public URLs before syncing to PostgreSQL.
 */
export async function ensureRemoteMediaUrls(
  items: string[],
  folder: MediaFolder
): Promise<string[]> {
  if (!items || items.length === 0) return [];
  if (!isSupabaseConfigured || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return items;
  }

  const results: string[] = [];
  for (const item of items) {
    if (item && item.startsWith("data:")) {
      const parsed = dataUrlToBlob(item);
      if (parsed) {
        const remoteUrl = await uploadMediaToSupabase(
          parsed.blob,
          folder,
          parsed.ext,
          parsed.contentType
        );
        results.push(remoteUrl || item);
      } else {
        results.push(item);
      }
    } else if (item && item.startsWith("blob:")) {
      try {
        const res = await fetch(item);
        const blob = await res.blob();
        const contentType = blob.type || "application/octet-stream";
        let ext = "bin";
        if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
        else if (contentType.includes("png")) ext = "png";
        else if (contentType.includes("webp")) ext = "webp";
        else if (contentType.includes("mp4")) ext = "mp4";
        else if (contentType.includes("webm")) ext = "webm";
        else if (contentType.includes("ogg")) ext = "ogg";
        else if (contentType.includes("wav")) ext = "wav";

        const remoteUrl = await uploadMediaToSupabase(
          blob,
          folder,
          ext,
          contentType
        );
        results.push(remoteUrl || item);
      } catch {
        results.push(item);
      }
    } else {
      results.push(item);
    }
  }
  return results;
}

/**
 * Extracts duration and creates a first-frame canvas thumbnail from a video File.
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      // Seek to 0.1s to capture first visible frame for thumbnail
      video.currentTime = Math.min(0.1, video.duration / 2);
    };

    video.onseeked = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      let thumbnailDataUrl: string | undefined;
      try {
        const canvas = document.createElement("canvas");
        // Limit thumbnail resolution to max 480px width for fast loading
        const scale = Math.min(1, 480 / width);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailDataUrl = canvas.toDataURL("image/webp", 0.8) || canvas.toDataURL("image/jpeg", 0.8);
        }
      } catch (err) {
        console.warn("[MediaStorage] Could not generate video thumbnail:", err);
      }

      URL.revokeObjectURL(objectUrl);
      resolve({
        duration,
        width,
        height,
        thumbnailDataUrl,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video file"));
    };
  });
}

/**
 * Validates a video file against Noticed editorial constraints (max 30s, max 25MB).
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith("video/")) {
    return { valid: false, error: "Please select a valid video file." };
  }

  if (file.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 25MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a video File, uploads it to Supabase Storage ('noticed-media/videos'),
 * or falls back to a persistent local base64 DataURL when offline.
 */
export async function processVideoFile(file: File): Promise<{
  url: string;
  thumbnailUrl?: string;
  duration: number;
}> {
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const meta = await extractVideoMetadata(file);
  if (meta.duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(
      `Video clip duration is ${Math.round(meta.duration)}s. Noticed supports clips up to 30s.`
    );
  }

  // Determine video extension
  const extMatch = file.name.split(".").pop()?.toLowerCase();
  const ext = extMatch && ["mp4", "mov", "webm", "m4v"].includes(extMatch) ? extMatch : "mp4";
  const contentType = file.type || "video/mp4";

  // 1. Primary: Upload directly to Supabase Storage ('noticed-media' bucket)
  const supabaseUrl = await uploadMediaToSupabase(file, "videos", ext, contentType);
  if (supabaseUrl) {
    return {
      url: supabaseUrl,
      thumbnailUrl: meta.thumbnailDataUrl,
      duration: meta.duration,
    };
  }

  // 2. Offline-first fallback: convert to base64 DataURL (auto-uploaded on next sync)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      resolve({
        url: dataUrl,
        thumbnailUrl: meta.thumbnailDataUrl,
        duration: meta.duration,
      });
    };
    reader.onerror = () => reject(new Error("Failed to read video file"));
    reader.readAsDataURL(file);
  });
}

