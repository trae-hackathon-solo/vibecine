"use client";

import { Handle, Position } from "reactflow";
import { Textarea } from "@heroui/react";
import { useAppStore } from "@/store/useAppStore";
import { WorkflowNodeShell } from "@/components/WorkflowNodeShell";

export const InputNode = () => {
  const { referenceImage, storyPrompt, setReferenceImage, setStoryPrompt } =
    useAppStore();

  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-amber-500"
      />
      <WorkflowNodeShell badge="IN" title="Project Input" badgeTone="amber">
        <div className="nodrag nowheel space-y-2">
          <span className="workflow-label">Reference image</span>
          <label className="nodrag nowheel flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-white/[0.12] bg-zinc-950/60 px-4 py-3 transition-colors hover:border-amber-500/40 hover:bg-zinc-950">
            <span className="text-sm text-zinc-400">
              {referenceImage
                ? referenceImage.name
                : "Drop or choose a character image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) =>
                setReferenceImage(e.target.files?.[0] ?? null)
              }
            />
            <span className="w-fit rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200">
              Browse files
            </span>
          </label>
          {referenceImage && (
            <p className="text-xs text-emerald-400/90">Image attached</p>
          )}
        </div>

        <div className="nodrag nowheel workflow-field space-y-2">
          <span className="workflow-label">Story prompt</span>
          <Textarea
            className="nodrag nowheel"
            value={storyPrompt}
            onChange={(e) => setStoryPrompt(e.target.value)}
            placeholder="Describe your story — tone, beats, and visual mood…"
            minRows={4}
            variant="bordered"
            classNames={{
              inputWrapper:
                "border-white/[0.08] bg-zinc-950/80 group-data-[focus=true]:border-amber-500/50",
              input: "text-zinc-100 placeholder:text-zinc-600",
            }}
          />
        </div>
      </WorkflowNodeShell>
    </>
  );
};
