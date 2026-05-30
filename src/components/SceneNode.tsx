"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { Input, Textarea, Chip, Button } from "@heroui/react";
import { useAppStore } from "@/store/useAppStore";
import { Scene } from "@/types";
import { WorkflowNodeShell } from "@/components/WorkflowNodeShell";
import { generateSceneVideoClient } from "@/lib/video/generate-scene.browser";
import { hasPixverseApiKey } from "@/lib/pixverse/api-key";
import { PixverseError } from "@/lib/pixverse/types";

const statusConfig: Record<
  Scene["status"],
  { label: string; color: "default" | "warning" | "success" | "danger" }
> = {
  draft: { label: "Draft", color: "default" },
  generating: { label: "Generating", color: "warning" },
  completed: { label: "Ready", color: "success" },
  failed: { label: "Failed", color: "danger" },
};

export const SceneNode = ({ data }: NodeProps<{ sceneId: string }>) => {
  const scene = useAppStore((s) =>
    s.scenes.find((sc) => sc.id === data.sceneId)
  );
  const referenceImage = useAppStore((s) => s.referenceImage);
  const { updateScene, setStatusMessage } = useAppStore();

  if (!scene) return null;

  const status = statusConfig[scene.status];
  const shotIndex = scene.id.split("-")[1] ?? "?";

  const regenerateOne = async () => {
    if (!hasPixverseApiKey()) {
      setStatusMessage("PixVerse API key required");
      return;
    }

    updateScene(scene.id, { status: "generating", errorMessage: undefined });
    setStatusMessage(`PixVerse: ${scene.title}…`);

    try {
      const result = await generateSceneVideoClient({
        prompt: scene.videoPrompt,
        referenceImage,
      });
      updateScene(scene.id, {
        status: "completed",
        videoUrl: result.videoUrl,
        videoId: result.videoId,
        errorMessage: undefined,
      });
      setStatusMessage(`${scene.title}: ${result.mode}`);
    } catch (err) {
      const msg =
        err instanceof PixverseError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed";
      updateScene(scene.id, { status: "failed", errorMessage: msg });
      setStatusMessage(msg);
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-amber-500" />
      <Handle type="source" position={Position.Right} className="!bg-amber-500" />
      <WorkflowNodeShell
        badge={shotIndex}
        title={scene.title}
        badgeTone="sky"
        headerRight={
          <Chip size="sm" variant="flat" color={status.color}>
            {status.label}
          </Chip>
        }
      >
        <div className="nodrag nowheel workflow-field space-y-2">
          <span className="workflow-label">Title</span>
          <Input
            size="sm"
            value={scene.title}
            variant="bordered"
            onChange={(e) => updateScene(scene.id, { title: e.target.value })}
            classNames={{
              inputWrapper:
                "border-white/[0.08] bg-zinc-950/80 group-data-[focus=true]:border-amber-500/50",
              input: "text-zinc-100",
            }}
          />
        </div>

        <div className="nodrag nowheel workflow-field space-y-2">
          <span className="workflow-label">Description</span>
          <Textarea
            size="sm"
            minRows={2}
            value={scene.description}
            variant="bordered"
            onChange={(e) =>
              updateScene(scene.id, { description: e.target.value })
            }
            classNames={{
              inputWrapper:
                "border-white/[0.08] bg-zinc-950/80 group-data-[focus=true]:border-amber-500/50",
              input: "text-zinc-100",
            }}
          />
        </div>

        <div className="nodrag nowheel workflow-field space-y-2">
          <span className="workflow-label">Video prompt</span>
          <Textarea
            size="sm"
            minRows={2}
            value={scene.videoPrompt}
            variant="bordered"
            onChange={(e) =>
              updateScene(scene.id, { videoPrompt: e.target.value })
            }
            classNames={{
              inputWrapper:
                "border-white/[0.08] bg-zinc-950/80 group-data-[focus=true]:border-amber-500/50",
              input: "text-zinc-100",
            }}
          />
        </div>

        {scene.errorMessage && (
          <p className="nodrag text-xs text-red-400">{scene.errorMessage}</p>
        )}

        {scene.videoUrl && (
          <div className="nodrag nowheel overflow-hidden rounded-xl border border-white/[0.08]">
            <video
              src={scene.videoUrl}
              controls
              className="aspect-video w-full bg-black"
            />
          </div>
        )}

        <Button
          size="sm"
          variant="flat"
          className="nodrag w-full"
          onPress={regenerateOne}
          isDisabled={scene.status === "generating"}
        >
          Regenerate clip
        </Button>
      </WorkflowNodeShell>
    </>
  );
};
