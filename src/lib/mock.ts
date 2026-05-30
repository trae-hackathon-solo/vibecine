import { Scene } from "@/types";

export const MOCK_VIDEO_URL =
  "https://www.w3schools.com/html/mov_bbb.mp4";

export function buildFallbackStoryboard(storyPrompt: string): Scene[] {
  const excerpt = storyPrompt.trim().slice(0, 120);
  const beats = [
    {
      title: "Opening",
      description: `Establish the world and mood for: ${excerpt}`,
      imagePrompt: `Wide cinematic establishing shot, ${excerpt}`,
      videoPrompt: `Slow cinematic establishing shot, ${excerpt}, gentle camera drift, film grain`,
    },
    {
      title: "Rising action",
      description: "Tension builds as the story moves forward.",
      imagePrompt: `Medium shot, character in motion, ${excerpt}`,
      videoPrompt: `Tracking medium shot, dynamic movement, ${excerpt}, motivated lighting`,
    },
    {
      title: "Climax",
      description: "The decisive emotional peak of the narrative.",
      imagePrompt: `Dramatic close-up, high contrast, ${excerpt}`,
      videoPrompt: `Intense close-up, shallow depth of field, ${excerpt}, dramatic push-in`,
    },
    {
      title: "Resolution",
      description: "A closing beat that lands the story.",
      imagePrompt: `Calm wide shot, soft light, ${excerpt}`,
      videoPrompt: `Pull-back wide shot, reflective mood, ${excerpt}, slow fade motion`,
    },
  ];

  return beats.map((beat, i) => ({
    id: `scene-${i + 1}`,
    ...beat,
    status: "draft" as const,
  }));
}
