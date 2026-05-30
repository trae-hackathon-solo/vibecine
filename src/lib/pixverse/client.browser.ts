"use client";

import { getPixverseApiKey } from "@/lib/pixverse/api-key";
import {
  PIXVERSE_BASE,
  parsePixverseJson,
  PixverseError,
  VideoResult,
} from "@/lib/pixverse/types";

function traceId(): string {
  return crypto.randomUUID();
}

function traceHeaders(id?: string): Record<string, string> {
  const key = getPixverseApiKey();
  if (!key) {
    throw new PixverseError(
      "Missing API key — set NEXT_PUBLIC_PIXVERSE_API_KEY in .env.local or paste key in header"
    );
  }
  return {
    "API-KEY": key,
    "Ai-trace-id": id ?? traceId(),
  };
}

export async function uploadImageFile(
  file: File
): Promise<{ img_id: number; img_url?: string }> {
  const form = new FormData();
  form.append("image", file, file.name);

  const res = await fetch(`${PIXVERSE_BASE}/image/upload`, {
    method: "POST",
    headers: traceHeaders(),
    body: form,
  });

  const json = await parsePixverseJson<{ img_id: number; img_url?: string }>(res);
  return json.Resp;
}

export type TextToVideoParams = {
  prompt: string;
  model?: string;
  duration?: number;
  quality?: string;
  aspect_ratio?: string;
  negative_prompt?: string;
  motion_mode?: string;
};

export async function createTextToVideo(
  params: TextToVideoParams
): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/text/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      model: params.model ?? "v5.5",
      duration: params.duration ?? 5,
      quality: params.quality ?? "540p",
      aspect_ratio: params.aspect_ratio ?? "16:9",
      motion_mode: params.motion_mode ?? "normal",
      negative_prompt: params.negative_prompt ?? "",
      seed: 0,
    }),
  });

  const json = await parsePixverseJson<{ video_id: number }>(res);
  return json.Resp.video_id;
}

export async function createImageToVideo(
  params: TextToVideoParams & { img_id: number }
): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/img/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      img_id: params.img_id,
      prompt: params.prompt,
      model: params.model ?? "v6",
      duration: params.duration ?? 5,
      quality: params.quality ?? "540p",
      aspect_ratio: params.aspect_ratio ?? "16:9",
      motion_mode: params.motion_mode ?? "normal",
      negative_prompt: params.negative_prompt ?? "",
      seed: 0,
    }),
  });

  const json = await parsePixverseJson<{ video_id: number }>(res);
  return json.Resp.video_id;
}

export async function createFusionVideo(params: {
  prompt: string;
  image_references: {
    type: "subject" | "background";
    img_id: number;
    ref_name: string;
  }[];
}): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/fusion/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      image_references: params.image_references,
      model: "v5.5",
      duration: 5,
      quality: "540p",
      aspect_ratio: "16:9",
      seed: 0,
    }),
  });

  const json = await parsePixverseJson<{ video_id: number }>(res);
  return json.Resp.video_id;
}

export async function getVideoResult(videoId: number): Promise<VideoResult> {
  const res = await fetch(`${PIXVERSE_BASE}/video/result/${videoId}`, {
    method: "GET",
    headers: traceHeaders(),
  });

  const json = await parsePixverseJson<VideoResult>(res);
  return json.Resp;
}

export async function pollVideoUntilReady(
  videoId: number,
  onProgress?: (status: number) => void
): Promise<string> {
  const maxAttempts = 60;
  const intervalMs = 4000;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await getVideoResult(videoId);
    onProgress?.(result.status);

    if (result.status === 1 && result.url) return result.url;
    if (result.status === 7) {
      throw new PixverseError("Blocked by content moderation", 7);
    }
    if (result.status === 8) {
      throw new PixverseError("PixVerse generation failed", 8);
    }
    if (result.status === 6) {
      throw new PixverseError("Video was deleted", 6);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new PixverseError(`Timed out waiting for video ${videoId}`);
}
