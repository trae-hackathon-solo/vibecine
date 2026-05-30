"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { InputNode } from "@/components/InputNode";
import { SceneNode } from "@/components/SceneNode";
import { OutputNode } from "@/components/OutputNode";
import { PixverseKeyInput } from "@/components/PixverseKeyInput";
import { Button, Chip } from "@heroui/react";
import { useAppStore } from "@/store/useAppStore";
import { Scene } from "@/types";
import { generateStoryboardClient } from "@/lib/storyboard/generate.client";
import { generateSceneVideoClient } from "@/lib/video/generate-scene.browser";
import { hasPixverseApiKey } from "@/lib/pixverse/api-key";
import { PixverseError } from "@/lib/pixverse/types";

const nodeTypes = {
  projectInput: InputNode,
  scene: SceneNode,
  finalOutput: OutputNode,
};

const initialNodes: Node[] = [
  {
    id: "project-input",
    type: "projectInput",
    position: { x: 48, y: 220 },
    data: {},
    draggable: true,
  },
  {
    id: "final-output",
    type: "finalOutput",
    position: { x: 920, y: 220 },
    data: {},
    draggable: true,
  },
];

const initialEdges: Edge[] = [];

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: "#52525b",
  },
};

function buildSceneGraph(scenes: Scene[]) {
  const sceneNodes: Node[] = scenes.map((scene, i) => ({
    id: scene.id,
    type: "scene",
    position: { x: 340 + i * 240, y: 160 + (i % 2) * 40 },
    data: { sceneId: scene.id },
    draggable: true,
  }));

  const edges: Edge[] = [];
  if (scenes.length > 0) {
    edges.push({
      id: "e-input-scene1",
      source: "project-input",
      target: scenes[0].id,
      ...defaultEdgeOptions,
    });
    for (let i = 0; i < scenes.length - 1; i++) {
      edges.push({
        id: `e-${scenes[i].id}-${scenes[i + 1].id}`,
        source: scenes[i].id,
        target: scenes[i + 1].id,
        ...defaultEdgeOptions,
      });
    }
    edges.push({
      id: "e-scene-output",
      source: scenes[scenes.length - 1].id,
      target: "final-output",
      ...defaultEdgeOptions,
    });
  }

  return { nodes: [...initialNodes, ...sceneNodes], edges };
}

function Workflow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const {
    storyPrompt,
    referenceImage,
    scenes,
    setScenes,
    isGeneratingStoryboard,
    isGeneratingVideos,
    statusMessage,
    setStatusMessage,
    setGeneratingStoryboard,
    setGeneratingVideos,
  } = useAppStore();

  const sceneIdsKey = useMemo(
    () => scenes.map((s) => s.id).join("|"),
    [scenes]
  );
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;

  /** Only rebuild graph when shot list changes — keep dragged positions. */
  useEffect(() => {
    const { nodes: built, edges: builtEdges } = buildSceneGraph(scenesRef.current);
    setNodes((current) =>
      built.map((node) => {
        const existing = current.find((n) => n.id === node.id);
        return existing
          ? { ...node, position: existing.position, draggable: true }
          : node;
      })
    );
    setEdges(builtEdges);
  }, [sceneIdsKey, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, ...defaultEdgeOptions }, eds)
      ),
    [setEdges]
  );

  const generateStoryboard = async () => {
    if (!storyPrompt.trim()) {
      setStatusMessage("Enter a story prompt first.");
      return;
    }

    setGeneratingStoryboard(true);
    setStatusMessage("Building storyboard…");

    try {
      const { scenes: nextScenes } = generateStoryboardClient(storyPrompt);
      setScenes(nextScenes);
      setStatusMessage(`Storyboard ready — ${nextScenes.length} shots`);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Storyboard failed"
      );
    } finally {
      setGeneratingStoryboard(false);
    }
  };

  const generateVideos = async () => {
    if (!scenes.length) {
      setStatusMessage("Generate a storyboard first.");
      return;
    }

    if (!hasPixverseApiKey()) {
      setStatusMessage(
        "Set NEXT_PUBLIC_PIXVERSE_API_KEY or paste key in header"
      );
      return;
    }

    setGeneratingVideos(true);
    setStatusMessage("Calling PixVerse API directly…");

    for (const scene of scenes) {
      useAppStore.getState().updateScene(scene.id, {
        status: "generating",
        errorMessage: undefined,
      });

      try {
        const result = await generateSceneVideoClient({
          prompt: scene.videoPrompt,
          referenceImage,
        });

        useAppStore.getState().updateScene(scene.id, {
          status: "completed",
          videoUrl: result.videoUrl,
          videoId: result.videoId,
          errorMessage: undefined,
        });

        setStatusMessage(`${scene.title}: done (${result.mode})`);
      } catch (err) {
        const msg =
          err instanceof PixverseError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Generation failed";

        const isCors =
          msg.includes("Failed to fetch") || msg.includes("NetworkError");

        useAppStore.getState().updateScene(scene.id, {
          status: "failed",
          errorMessage: isCors
            ? "CORS/network blocked — check browser console"
            : msg,
        });
        setStatusMessage(`${scene.title}: ${msg}`);
      }
    }

    setGeneratingVideos(false);
  };

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-canvas">
      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/80 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/30">
            <span className="font-mono text-sm font-bold text-amber-400">
              V
            </span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-50">
              VibeCine
            </h1>
            <p className="text-xs text-zinc-500">Direct PixVerse · drag nodes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PixverseKeyInput />
          {statusMessage && (
            <Chip size="sm" variant="flat" className="max-w-md">
              {statusMessage}
            </Chip>
          )}
          <Button
            variant="bordered"
            onPress={generateStoryboard}
            isLoading={isGeneratingStoryboard}
            isDisabled={isGeneratingVideos}
            className="border-white/10 text-zinc-200"
          >
            Generate storyboard
          </Button>
          <Button
            color="primary"
            onPress={generateVideos}
            isLoading={isGeneratingVideos}
            isDisabled={isGeneratingStoryboard || !scenes.length}
          >
            Generate all videos
          </Button>
        </div>
      </header>

      <div
        className="relative h-full min-h-0 w-full flex-1"
        ref={reactFlowWrapper}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          panOnDrag
          selectionOnDrag={false}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.35}
          maxZoom={1.25}
          proOptions={{ hideAttribution: true }}
          className="!bg-canvas"
          style={{ width: "100%", height: "100%" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#3f3f46"
          />
          <Controls
            position="bottom-left"
            showInteractive={false}
            className="!shadow-node"
          />
        </ReactFlow>
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.08),transparent)]"
          aria-hidden
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <Workflow />
    </ReactFlowProvider>
  );
}
