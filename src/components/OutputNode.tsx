"use client";

import { useState } from "react";
import { Handle, Position } from "reactflow";
import { Button, Spinner } from "@heroui/react";
import { useAppStore } from "@/store/useAppStore";
import { WorkflowNodeShell } from "@/components/WorkflowNodeShell";

export const OutputNode = () => {
  const { scenes, setStatusMessage } = useAppStore();
  const [previewIndex, setPreviewIndex] = useState(0);

  const completedScenes = scenes.filter((s) => s.status === "completed");
  const total = scenes.length;
  const progress = total ? (completedScenes.length / total) * 100 : 0;
  const isReady = completedScenes.length === total && total > 0;
  const isGenerating = scenes.some((s) => s.status === "generating");

  const clips = completedScenes.map((s) => ({
    sceneId: s.id,
    title: s.title,
    videoUrl: s.videoUrl!,
  }));

  const currentClip = clips[previewIndex];

  const handleStitch = () => {
    setPreviewIndex(0);
    setStatusMessage(`Playing ${clips.length} clips (~${clips.length * 5}s)`);
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <WorkflowNodeShell badge="OUT" title="Final output" badgeTone="emerald">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Scenes ready</span>
            <span className="font-mono text-xs tabular-nums text-zinc-200">
              {completedScenes.length} / {total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentClip && (
          <div className="nodrag nowheel space-y-2">
            <p className="text-xs text-zinc-500">
              {previewIndex + 1}/{clips.length}: {currentClip.title}
            </p>
            <video
              key={currentClip.videoUrl}
              src={currentClip.videoUrl}
              controls
              className="aspect-video w-full rounded-xl bg-black"
              onEnded={() => {
                if (previewIndex < clips.length - 1) {
                  setPreviewIndex((i) => i + 1);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                className="nodrag"
                isDisabled={previewIndex === 0}
                onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="flat"
                className="nodrag"
                isDisabled={previewIndex >= clips.length - 1}
                onPress={() =>
                  setPreviewIndex((i) => Math.min(clips.length - 1, i + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Button
          color="primary"
          variant="solid"
          disabled={!isReady}
          onPress={handleStitch}
          className="nodrag w-full font-medium"
          size="lg"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" color="current" />
              Generating clips…
            </span>
          ) : isReady ? (
            "Play full story"
          ) : (
            "Waiting for scenes"
          )}
        </Button>
      </WorkflowNodeShell>
    </>
  );
};
