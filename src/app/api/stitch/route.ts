import { NextResponse } from "next/server";

/** Returns ordered clip URLs for client playback / download (no server-side ffmpeg in MVP). */
export async function POST(request: Request) {
  try {
    const { clips } = (await request.json()) as {
      clips?: { sceneId: string; title: string; videoUrl: string }[];
    };

    if (!clips?.length) {
      return NextResponse.json({ error: "clips array is required" }, { status: 400 });
    }

    const valid = clips.filter((c) => c.videoUrl?.trim());
    if (!valid.length) {
      return NextResponse.json(
        { error: "No valid video URLs to stitch" },
        { status: 400 }
      );
    }

    const totalDurationSec = valid.length * 5;

    return NextResponse.json({
      clips: valid,
      totalDurationSec,
      message:
        "Clips are ready for sequential playback. Server-side ffmpeg merge can be added later.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to prepare stitch" }, { status: 500 });
  }
}
