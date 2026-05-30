"use client";

import { hasPixverseApiKey } from "@/lib/pixverse/api-key";
import {
  createFusionVideo,
  createImageToVideo,
  createTextToVideo,
  pollVideoUntilReady,
  uploadImageFile,
} from "@/lib/pixverse/client.browser";
import { PixverseError } from "@/lib/pixverse/types";
import { MOCK_VIDEO_URL } from "@/lib/mock";

export type GenerateSceneClientInput = {
  prompt: string;
  referenceImage?: File | null;
  useMockFallback?: boolean;
};

export type GenerateSceneClientResult = {
  videoUrl: string;
  videoId?: number;
  mode: "pixverse_text" | "pixverse_image" | "pixverse_fusion" | "mock";
  mock?: boolean;
};

/** Calls PixVerse directly from the browser — no Next.js proxy. */
export async function generateSceneVideoClient(
  input: GenerateSceneClientInput
): Promise<GenerateSceneClientResult> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new PixverseError("Video prompt is required");

  if (!hasPixverseApiKey()) {
    if (input.useMockFallback) {
      return { videoUrl: MOCK_VIDEO_URL, mode: "mock", mock: true };
    }
    throw new PixverseError(
      "Add NEXT_PUBLIC_PIXVERSE_API_KEY to .env.local (same value as PIXVERSE_API_KEY)"
    );
  }

  let videoId: number;
  let mode: GenerateSceneClientResult["mode"] = "pixverse_text";

  if (input.referenceImage?.size) {
    const { img_id } = await uploadImageFile(input.referenceImage);
    const fusionPrompt = prompt.includes("@character")
      ? prompt
      : `@character ${prompt}`;

    try {
      videoId = await createFusionVideo({
        prompt: fusionPrompt,
        image_references: [
          { type: "subject", img_id, ref_name: "character" },
        ],
      });
      mode = "pixverse_fusion";
    } catch (fusionErr) {
      console.warn("[PixVerse] fusion failed, trying image-to-video:", fusionErr);
      videoId = await createImageToVideo({ img_id, prompt });
      mode = "pixverse_image";
    }
  } else {
    videoId = await createTextToVideo({ prompt });
  }

  const videoUrl = await pollVideoUntilReady(videoId);
  return { videoUrl, videoId, mode };
}
