import {
  createFusionVideo,
  createImageToVideo,
  createTextToVideo,
  hasPixverseKey,
  pollVideoUntilReady,
  uploadImage,
  PixverseError,
} from "@/lib/pixverse/client";
import { createVideoWithCli, isPixverseCliEnabled } from "@/lib/pixverse/cli";
import { MOCK_VIDEO_URL } from "@/lib/mock";

export type GenerateSceneInput = {
  prompt: string;
  referenceImage?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
  model?: string;
  quality?: string;
  duration?: number;
  aspectRatio?: string;
  audio?: boolean;
  poll?: boolean;
};

export type GenerateSceneResult = {
  videoUrl: string;
  videoId?: number;
  mode:
    | "pixverse_text"
    | "pixverse_image"
    | "pixverse_fusion"
    | "pixverse_cli"
    | "mock";
  mock?: boolean;
};

export async function generateSceneVideo(
  input: GenerateSceneInput
): Promise<GenerateSceneResult> {
  const preferCli = isPixverseCliEnabled();

  if (!preferCli && !hasPixverseKey()) {
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

    if (preferCli) {
      const result = await createVideoWithCli({
        prompt,
        referenceImage: input.referenceImage,
        wait: input.poll !== false,
        model: input.model,
        quality: input.quality,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
        audio: input.audio,
      });

      if (input.poll === false) {
        return { videoUrl: "", videoId: result.videoId, mode: "pixverse_cli" };
      }

      return { videoUrl: result.videoUrl, videoId: result.videoId, mode: "pixverse_cli" };
    }

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
          model: input.model,
          quality: input.quality,
          duration: input.duration,
          aspect_ratio: input.aspectRatio,
        });
        mode = "pixverse_fusion";
      } catch {
        videoId = await createImageToVideo({
          img_id,
          prompt,
          model: input.model,
          quality: input.quality,
          duration: input.duration,
          aspect_ratio: input.aspectRatio,
        });
        mode = "pixverse_image";
      }
    } else {
      videoId = await createTextToVideo({
        prompt,
        model: input.model,
        quality: input.quality,
        duration: input.duration,
        aspect_ratio: input.aspectRatio,
      });
      mode = "pixverse_text";
    }

    if (input.poll === false) {
      return { videoUrl: "", videoId, mode };
    }

    const videoUrl = await pollVideoUntilReady(videoId);
    return { videoUrl, videoId, mode };
  } catch (err) {
    console.error("[generateSceneVideo]", err);
    if (preferCli || hasPixverseKey()) {
      throw err instanceof Error ? err : new Error("PixVerse generation failed");
    }
    await delay(800);
    return { videoUrl: MOCK_VIDEO_URL, mode: "mock", mock: true };
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
