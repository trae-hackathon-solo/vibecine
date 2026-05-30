import { NextResponse } from "next/server";
import { generateSceneVideo } from "@/lib/video/generate-scene";
import { hasPixverseKey } from "@/lib/pixverse/client";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let prompt = "";
    let poll = true;
    let referenceImage: GenerateVideoBody["referenceImage"];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      prompt = String(form.get("prompt") ?? "").trim();
      poll = form.get("poll") !== "false";

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
    });

    return NextResponse.json({
      videoUrl: result.videoUrl,
      videoId: result.videoId,
      mode: result.mode,
      mock: result.mock ?? false,
      pixverseConfigured: hasPixverseKey(),
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
  referenceImageBase64?: string;
  referenceImageName?: string;
  referenceImage?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
};
