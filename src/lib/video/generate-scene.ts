import {
  createFusionVideo,
  createImageToVideo,
  createTextToVideo,
  hasPixverseKey,
  pollVideoUntilReady,
  uploadImage,
  PixverseError,
} from "@/lib/pixverse/client";
import { MOCK_VIDEO_URL } from "@/lib/mock";

export type GenerateSceneInput = {
  prompt: string;
  referenceImage?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
  poll?: boolean;
};

export type GenerateSceneResult = {
  videoUrl: string;
  videoId?: number;
  mode: "pixverse_text" | "pixverse_image" | "pixverse_fusion" | "mock";
  mock?: boolean;
};

export async function generateSceneVideo(
  input: GenerateSceneInput
): Promise<GenerateSceneResult> {
  if (!hasPixverseKey()) {
    await delay(1500);
    return {
      videoUrl: MOCK_VIDEO_URL,
      mode: "mock",
      mock: true,
    };
  }

  try {
    const prompt = input.prompt.trim();
    if (!prompt) throw new PixverseError("Video prompt is required");

    let videoId: number;
    let mode: GenerateSceneResult["mode"] = "pixverse_text";

    if (input.referenceImage) {
      const { img_id } = await uploadImage(
        input.referenceImage.buffer,
        input.referenceImage.filename,
        input.referenceImage.mimeType
      );

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
      } catch {
        videoId = await createImageToVideo({
          img_id,
          prompt,
        });
        mode = "pixverse_image";
      }
    } else {
      videoId = await createTextToVideo({ prompt });
      mode = "pixverse_text";
    }

    if (input.poll === false) {
      return { videoUrl: "", videoId, mode };
    }

    const videoUrl = await pollVideoUntilReady(videoId);
    return { videoUrl, videoId, mode };
  } catch (err) {
    console.error("[generateSceneVideo]", err);
    await delay(800);
    return {
      videoUrl: MOCK_VIDEO_URL,
      mode: "mock",
      mock: true,
    };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
