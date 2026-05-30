import { NextResponse } from "next/server";
import { generateStoryboard } from "@/lib/storyboard/generate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storyPrompt =
      typeof body.storyPrompt === "string" ? body.storyPrompt.trim() : "";

    if (!storyPrompt) {
      return NextResponse.json(
        { error: "storyPrompt is required" },
        { status: 400 }
      );
    }

    const { scenes, source } = await generateStoryboard(storyPrompt);

    return NextResponse.json({ scenes, source });
  } catch (err) {
    console.error("[generate-storyboard]", err);
    return NextResponse.json(
      { error: "Failed to generate storyboard" },
      { status: 500 }
    );
  }
}
