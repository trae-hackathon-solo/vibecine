"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { Input, Textarea, Chip, Button } from "@heroui/react";
import { useAppStore } from "@/store/useAppStore";
import { Scene } from "@/types";
import { WorkflowNodeShell } from "@/components/WorkflowNodeShell";

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
  const updateScene = useAppStore((s) => s.updateScene);
  const generateSceneClip = useAppStore((s) => s.generateSceneClip);

  if (!scene) return null;

  const status = statusConfig[scene.status];
  const shotIndex = scene.id.split("-")[1] ?? "?";

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
          <div className="pt-24 nodrag nowheel overflow-hidden rounded-xl border border-white/[0.08]">
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
          className="nodrag mt-3 w-full"
          onPress={() => generateSceneClip(scene.id)}
          isDisabled={scene.status === "generating"}
        >
          Submit to PixVerse
        </Button>
      </WorkflowNodeShell>
    </>
  );
};
