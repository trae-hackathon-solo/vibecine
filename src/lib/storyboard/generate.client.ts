"use client";

import { Scene } from "@/types";
import { buildFallbackStoryboard } from "@/lib/mock";

export function generateStoryboardClient(storyPrompt: string): {
  scenes: Scene[];
  source: "fallback";
} {
  return {
    scenes: buildFallbackStoryboard(storyPrompt),
    source: "fallback",
  };
}
