import { NextResponse } from "next/server";
import {
  getVideoResult,
  hasPixverseKey,
  pollVideoUntilReady,
  PixverseError,
} from "@/lib/pixverse/client";
import { MOCK_VIDEO_URL } from "@/lib/mock";

export async function GET(request: Request) {
  try {
    const videoId = Number(
      new URL(request.url).searchParams.get("videoId")
    );
    const wait = new URL(request.url).searchParams.get("wait") === "true";

    if (!videoId || Number.isNaN(videoId)) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    if (!hasPixverseKey()) {
      return NextResponse.json({
        status: 1,
        videoUrl: MOCK_VIDEO_URL,
        mock: true,
      });
    }

    if (wait) {
      try {
        const videoUrl = await pollVideoUntilReady(videoId, {
          maxAttempts: 30,
          intervalMs: 4000,
        });
        return NextResponse.json({ status: 1, videoUrl, videoId });
      } catch (err) {
        const message =
          err instanceof PixverseError ? err.message : "Polling failed";
        return NextResponse.json({ error: message, videoId }, { status: 502 });
      }
    }

    const result = await getVideoResult(videoId);
    return NextResponse.json({
      status: result.status,
      videoUrl: result.status === 1 ? result.url : undefined,
      videoId,
    });
  } catch (err) {
    console.error("[video-status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}
