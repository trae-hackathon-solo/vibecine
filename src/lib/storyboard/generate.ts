import { Scene } from "@/types";
import { buildFallbackStoryboard } from "@/lib/mock";

type StoryboardSceneInput = {
  title: string;
  description: string;
  imagePrompt: string;
  videoPrompt: string;
};

function normalizeScenes(raw: StoryboardSceneInput[]): Scene[] {
  return raw.slice(0, 6).map((scene, i) => ({
    id: `scene-${i + 1}`,
    title: scene.title,
    description: scene.description,
    imagePrompt: scene.imagePrompt,
    videoPrompt: scene.videoPrompt,
    status: "draft" as const,
  }));
}

async function generateWithOpenAI(storyPrompt: string): Promise<Scene[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a film storyboard writer. Return JSON: { "scenes": [ { "title", "description", "imagePrompt", "videoPrompt" } ] } with 4-5 shots. Each videoPrompt must be cinematic, under 400 chars, suitable for PixVerse AI video.`,
        },
        {
          role: "user",
          content: `Story idea:\n${storyPrompt}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content) as { scenes?: StoryboardSceneInput[] };
    if (!parsed.scenes?.length) return null;
    return normalizeScenes(parsed.scenes);
  } catch {
    return null;
  }
}

/** TRAE storyboard: OpenAI when configured, else prompt-aware fallback (not static mock). */
export async function generateStoryboard(storyPrompt: string): Promise<{
  scenes: Scene[];
  source: "openai" | "fallback";
}> {
  const aiScenes = await generateWithOpenAI(storyPrompt);
  if (aiScenes) {
    return { scenes: aiScenes, source: "openai" };
  }

  return {
    scenes: buildFallbackStoryboard(storyPrompt),
    source: "fallback",
  };
}
