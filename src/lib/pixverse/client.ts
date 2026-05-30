import { randomUUID } from "crypto";

const PIXVERSE_BASE = "https://app-api.pixverse.ai/openapi/v2";

export type PixverseApiResponse<T> = {
  ErrCode: number;
  ErrMsg: string;
  Resp: T;
};

export type VideoStatus = 1 | 5 | 6 | 7 | 8;

export type VideoResult = {
  id: number;
  status: VideoStatus;
  url?: string;
  prompt?: string;
};

export class PixverseError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = "PixverseError";
  }
}

export function hasPixverseKey(): boolean {
  return Boolean(process.env.PIXVERSE_API_KEY?.trim());
}

function getApiKey(): string {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) throw new PixverseError("PIXVERSE_API_KEY is not configured");
  return key;
}

function traceHeaders(traceId?: string): Record<string, string> {
  return {
    "API-KEY": getApiKey(),
    "Ai-trace-id": traceId ?? randomUUID(),
  };
}

async function parsePixverseJson<T>(
  res: Response
): Promise<PixverseApiResponse<T>> {
  const json = (await res.json()) as PixverseApiResponse<T>;
  if (!res.ok) {
    throw new PixverseError(
      json.ErrMsg || `PixVerse HTTP ${res.status}`,
      json.ErrCode
    );
  }
  if (json.ErrCode !== 0) {
    throw new PixverseError(json.ErrMsg || "PixVerse request failed", json.ErrCode);
  }
  return json;
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ img_id: number; img_url?: string }> {
  const form = new FormData();
  form.append(
    "image",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename
  );

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
  params: TextToVideoParams,
  traceId?: string
): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/text/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(traceId),
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

export type ImageToVideoParams = TextToVideoParams & {
  img_id: number;
};

export async function createImageToVideo(
  params: ImageToVideoParams,
  traceId?: string
): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/img/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(traceId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      img_id: params.img_id,
      prompt: params.prompt,
      model: params.model ?? "v6",
      duration: params.duration ?? 5,
      quality: params.quality ?? "540p",
      motion_mode: params.motion_mode ?? "normal",
      negative_prompt: params.negative_prompt ?? "",
      seed: 0,
    }),
  });

  const json = await parsePixverseJson<{ video_id: number }>(res);
  return json.Resp.video_id;
}

export type FusionReference = {
  type: "subject" | "background";
  img_id: number;
  ref_name: string;
};

export async function createFusionVideo(
  params: {
    prompt: string;
    image_references: FusionReference[];
    model?: string;
    duration?: number;
    quality?: string;
    aspect_ratio?: string;
  },
  traceId?: string
): Promise<number> {
  const res = await fetch(`${PIXVERSE_BASE}/video/fusion/generate`, {
    method: "POST",
    headers: {
      ...traceHeaders(traceId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: params.prompt,
      image_references: params.image_references,
      model: params.model ?? "v5.5",
      duration: params.duration ?? 5,
      quality: params.quality ?? "540p",
      aspect_ratio: params.aspect_ratio ?? "16:9",
      seed: 0,
    }),
  });

  const json = await parsePixverseJson<{ video_id: number }>(res);
  return json.Resp.video_id;
}

export async function getVideoResult(
  videoId: number,
  traceId?: string
): Promise<VideoResult> {
  const res = await fetch(`${PIXVERSE_BASE}/video/result/${videoId}`, {
    method: "GET",
    headers: traceHeaders(traceId),
  });

  const json = await parsePixverseJson<VideoResult>(res);
  return json.Resp;
}

const STATUS_LABELS: Record<number, string> = {
  5: "generating",
  6: "deleted",
  7: "moderation_failed",
  8: "generation_failed",
};

export async function pollVideoUntilReady(
  videoId: number,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 45;
  const intervalMs = options?.intervalMs ?? 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getVideoResult(videoId);

    if (result.status === 1 && result.url) {
      return result.url;
    }

    if (result.status === 7) {
      throw new PixverseError("Video blocked by content moderation", 7);
    }
    if (result.status === 8) {
      throw new PixverseError("PixVerse video generation failed", 8);
    }
    if (result.status === 6) {
      throw new PixverseError("Video was deleted", 6);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  throw new PixverseError(
    `Timed out waiting for video ${videoId} (${STATUS_LABELS[5]})`
  );
}
