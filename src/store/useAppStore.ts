import { create } from "zustand";
import { AppState, StitchResult } from "@/types";
import { MOCK_VIDEO_URL } from "@/lib/mock";

export const useAppStore = create<AppState>((set, get) => ({
  referenceImage: null,
  storyPrompt: "",
  scenes: [],
  isGeneratingStoryboard: false,
  isGeneratingVideos: false,
  statusMessage: null,
  stitchResult: null,
  setReferenceImage: (image) => set({ referenceImage: image }),
  setStoryPrompt: (prompt) => set({ storyPrompt: prompt }),
  setScenes: (scenes) => set({ scenes }),
  updateScene: (id, updates) =>
    set((state) => ({
      scenes: state.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    })),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setStitchResult: (stitchResult: StitchResult | null) => set({ stitchResult }),
  setGeneratingStoryboard: (isGeneratingStoryboard) =>
    set({ isGeneratingStoryboard }),
  setGeneratingVideos: (isGeneratingVideos) => set({ isGeneratingVideos }),
  generateSceneClip: async (sceneId, options) => {
    const state = get();
    const scene = state.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const prompt = scene.videoPrompt.trim();
    if (!prompt) {
      set({ statusMessage: "Video prompt is required" });
      get().updateScene(sceneId, { status: "failed", errorMessage: "Video prompt is required" });
      return;
    }

    get().updateScene(sceneId, {
      status: "generating",
      errorMessage: undefined,
      videoUrl: undefined,
    });

    try {
      const totalShots = Math.max(1, get().scenes.length);
      const duration = Math.max(10, Math.ceil(30 / totalShots));

      const form = new FormData();
      form.append("prompt", prompt);
      form.append("poll", "true");
      form.append("model", "v6");
      form.append("quality", "720p");
      form.append("aspectRatio", "16:9");
      form.append("duration", String(duration));
      form.append("audio", "true");
      if (state.referenceImage) {
        form.append("referenceImage", state.referenceImage, state.referenceImage.name);
      }

      const res = await fetch("/api/generate-video", {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as
        | {
            videoUrl?: string;
            videoId?: number;
            mode?: string;
            mock?: boolean;
            cliEnabled?: boolean;
            pixverseConfigured?: boolean;
            error?: string;
          }
        | { error: string };

      if (!res.ok) {
        const message = "error" in json ? json.error : "Failed to generate video";
        throw new Error(message);
      }

      const videoUrl = "videoUrl" in json ? (json.videoUrl ?? "") : "";
      const videoId = "videoId" in json ? json.videoId : undefined;

      if (!videoUrl) {
        throw new Error("PixVerse did not return a video URL");
      }

      get().updateScene(sceneId, {
        status: "completed",
        videoUrl,
        videoId,
        errorMessage: undefined,
      });

      if ("mock" in json && json.mock) {
        set({
          statusMessage:
            "PixVerse is not configured or the request failed. Using mock video for demo.",
        });
      } else {
        const mode = "mode" in json ? json.mode : undefined;
        set({ statusMessage: mode ? `${scene.title}: ${mode}` : null });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate video";
      if (options?.fallbackToDemoOnError) {
        get().updateScene(sceneId, {
          status: "completed",
          videoUrl: MOCK_VIDEO_URL,
          errorMessage: `Fallback demo: ${message}`,
        });
        set({ statusMessage: `${scene.title}: fallback demo` });
      } else {
        get().updateScene(sceneId, { status: "failed", errorMessage: message });
        set({ statusMessage: message });
      }
    }
  },
  generateAllSceneClips: async () => {
    const state = get();
    if (!state.scenes.length) {
      set({ statusMessage: "Generate a storyboard first" });
      return;
    }

    set({ isGeneratingVideos: true, statusMessage: null });
    try {
      const scenesNow = get().scenes;
      const results = await Promise.allSettled(
        scenesNow.map((s) => get().generateSceneClip(s.id, { fallbackToDemoOnError: true }))
      );

      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) {
        set({ statusMessage: `Generated with ${failed} fallback demo clip(s)` });
      } else {
        set({ statusMessage: "All clips generated" });
      }
    } finally {
      set({ isGeneratingVideos: false });
    }
  },
  resetState: () =>
    set({
      referenceImage: null,
      storyPrompt: "",
      scenes: [],
      isGeneratingStoryboard: false,
      isGeneratingVideos: false,
      statusMessage: null,
      stitchResult: null,
    }),
}));
