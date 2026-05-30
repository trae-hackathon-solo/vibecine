export interface Scene {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
  videoPrompt: string;
  status: "draft" | "generating" | "completed" | "failed";
  videoUrl?: string;
  videoId?: number;
  errorMessage?: string;
}

export interface StitchResult {
  clips: { sceneId: string; title: string; videoUrl: string }[];
  totalDurationSec: number;
  message: string;
}

export interface AppState {
  referenceImage: File | null;
  storyPrompt: string;
  scenes: Scene[];
  isGeneratingStoryboard: boolean;
  isGeneratingVideos: boolean;
  statusMessage: string | null;
  stitchResult: StitchResult | null;
  setReferenceImage: (image: File | null) => void;
  setStoryPrompt: (prompt: string) => void;
  setScenes: (scenes: Scene[]) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  setStatusMessage: (message: string | null) => void;
  setStitchResult: (result: StitchResult | null) => void;
  setGeneratingStoryboard: (value: boolean) => void;
  setGeneratingVideos: (value: boolean) => void;
  generateSceneClip: (
    sceneId: string,
    options?: { fallbackToDemoOnError?: boolean }
  ) => Promise<void>;
  generateAllSceneClips: () => Promise<void>;
  resetState: () => void;
}
