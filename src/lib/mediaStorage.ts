/**
 * Noticed Media Pipeline: Video & Photo Storage Management
 * Handles local blob generation, thumbnail extraction, validation,
 * and Cloudflare R2 direct upload pipeline.
 */

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}

const MAX_VIDEO_DURATION_SECONDS = 35;
const MAX_VIDEO_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

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
 * Converts a video File into a persistent local base64 DataURL or uploads to Cloudflare R2
 * if an upload endpoint is configured.
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

  // Check if Cloudflare R2 endpoint is available
  const r2Endpoint = import.meta.env.VITE_R2_UPLOAD_ENDPOINT;
  if (r2Endpoint) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(r2Endpoint, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          return {
            url: json.url,
            thumbnailUrl: meta.thumbnailDataUrl,
            duration: meta.duration,
          };
        }
      }
    } catch (err) {
      console.warn("[MediaStorage] R2 upload failed, falling back to local storage:", err);
    }
  }

  // Offline-first fallback: convert to base64 DataURL
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
