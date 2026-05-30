import { NextResponse } from "next/server";
import { generateSceneVideo } from "@/lib/video/generate-scene";
import { hasPixverseKey } from "@/lib/pixverse/client";
import { isPixverseCliEnabled } from "@/lib/pixverse/cli";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let prompt = "";
    let poll = true;
    let model: string | undefined;
    let quality: string | undefined;
    let aspectRatio: string | undefined;
    let duration: number | undefined;
    let audio: boolean | undefined;
    let referenceImage: GenerateVideoBody["referenceImage"];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      prompt = String(form.get("prompt") ?? "").trim();
      poll = form.get("poll") !== "false";
      model = String(form.get("model") ?? "").trim() || undefined;
      quality = String(form.get("quality") ?? "").trim() || undefined;
      aspectRatio = String(form.get("aspectRatio") ?? "").trim() || undefined;
      const durationRaw = String(form.get("duration") ?? "").trim();
      duration = durationRaw ? Number(durationRaw) : undefined;
      if (Number.isNaN(duration)) duration = undefined;
      const audioRaw = String(form.get("audio") ?? "").trim();
      if (audioRaw) audio = audioRaw === "true" || audioRaw === "1" || audioRaw === "yes";

      const file = form.get("referenceImage");
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        referenceImage = {
          buffer,
          filename: file.name || "reference.jpg",
          mimeType: file.type || "image/jpeg",
        };
      }
    } else {
      const body = (await request.json()) as GenerateVideoBody;
      prompt = body.prompt?.trim() ?? "";
      poll = body.poll !== false;
      model = body.model?.trim() || undefined;
      quality = body.quality?.trim() || undefined;
      aspectRatio = body.aspectRatio?.trim() || undefined;
      duration = typeof body.duration === "number" ? body.duration : undefined;
      audio = typeof body.audio === "boolean" ? body.audio : undefined;

      if (body.referenceImageBase64) {
        const match = body.referenceImageBase64.match(
          /^data:([^;]+);base64,(.+)$/
        );
        const mime = match?.[1] ?? "image/jpeg";
        const b64 = match?.[2] ?? body.referenceImageBase64;
        referenceImage = {
          buffer: Buffer.from(b64, "base64"),
          filename: body.referenceImageName ?? "reference.jpg",
          mimeType: mime,
        };
      }
    }

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const result = await generateSceneVideo({
      prompt,
      referenceImage,
      poll,
      model,
      quality,
      aspectRatio,
      duration,
      audio,
    });

    return NextResponse.json({
      videoUrl: result.videoUrl,
      videoId: result.videoId,
      mode: result.mode,
      mock: result.mock ?? false,
      cliEnabled: isPixverseCliEnabled(),
      pixverseConfigured: isPixverseCliEnabled() || hasPixverseKey(),
    });
  } catch (err) {
    console.error("[generate-video]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate video" },
      { status: 500 }
    );
  }
}

type GenerateVideoBody = {
  prompt?: string;
  poll?: boolean;
  model?: string;
  quality?: string;
  aspectRatio?: string;
  duration?: number;
  audio?: boolean;
  referenceImageBase64?: string;
  referenceImageName?: string;
  referenceImage?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
};
