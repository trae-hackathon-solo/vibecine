import { create } from "zustand";
import { AppState, StitchResult } from "@/types";

export const useAppStore = create<AppState>((set) => ({
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
