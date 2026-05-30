import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { writeFile, unlink } from "fs/promises";
import os from "os";
import path from "path";

function cliCommand(): string {
  return "pixverse";
}

function isTruthyEnv(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export function isPixverseCliEnabled(): boolean {
  return isTruthyEnv(process.env.PIXVERSE_USE_CLI);
}

async function runPixverseJson(args: string[], timeoutMs: number): Promise<any> {
  const stdout = await runCommand(cliCommand(), [...args, "--json"], timeoutMs);
  return parseLooseJson(stdout);
}

async function runCommand(
  cmd: string,
  args: string[],
  timeoutMs: number
): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd.exe", ["/d", "/s", "/c", cmd, ...args], {
            windowsHide: true,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
          })
        : spawn(cmd, args, {
            windowsHide: true,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
          });

    const out: Buffer[] = [];
    const err: Buffer[] = [];

    let timeout: NodeJS.Timeout | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        try {
          child.kill(process.platform === "win32" ? undefined : "SIGKILL");
        } catch {}
        reject(new Error("PixVerse CLI timed out"));
      }, timeoutMs);
    }

    child.stdout.on("data", (d) => out.push(Buffer.from(d)));
    child.stderr.on("data", (d) => err.push(Buffer.from(d)));

    child.on("error", (e) => {
      if (timeout) clearTimeout(timeout);
      reject(e);
    });

    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      const stdout = Buffer.concat(out).toString("utf8").trim();
      const stderr = Buffer.concat(err).toString("utf8").trim();

      if (code === 0) return resolve(stdout);
      const message = stderr || stdout || `PixVerse CLI failed (exit ${code ?? "?"})`;
      reject(new Error(message));
    });
  });
}

function parseLooseJson(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("PixVerse CLI did not return JSON");
  }
  const jsonText = text.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function pickNumber(obj: any, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function pickString(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickVideoUrl(obj: any): string | undefined {
  return (
    pickString(obj, ["video_url", "videoUrl", "url", "output_url", "outputUrl"]) ??
    pickString(obj?.output, ["video", "url"])
  );
}

export async function createVideoWithCli(input: {
  prompt: string;
  referenceImage?: { buffer: Buffer; filename: string; mimeType: string };
  model?: string;
  quality?: string;
  duration?: number;
  aspectRatio?: string;
  audio?: boolean;
  wait: boolean;
}): Promise<{ videoId: number; videoUrl: string }> {
  const timeoutMs = Math.max(30_000, (input.wait ? 300_000 : 60_000));
  const args: string[] = ["create", "video", "--prompt", input.prompt];

  if (input.model) args.push("--model", input.model);
  if (input.quality) args.push("--quality", input.quality);
  if (typeof input.duration === "number") args.push("--duration", String(input.duration));
  if (input.aspectRatio) args.push("--aspect-ratio", input.aspectRatio);
  if (typeof input.audio === "boolean") args.push(input.audio ? "--audio" : "--no-audio");

  let tempPath: string | undefined;
  try {
    if (input.referenceImage) {
      const ext = path.extname(input.referenceImage.filename || "") || ".png";
      tempPath = path.join(os.tmpdir(), `pixverse_ref_${randomUUID()}${ext}`);
      await writeFile(tempPath, input.referenceImage.buffer);
      args.push("--image", tempPath);
    }

    if (!input.wait) args.push("--no-wait");

    const created = await runPixverseJson(args, timeoutMs);

    const videoId =
      pickNumber(created, ["video_id", "videoId", "id", "task_id", "taskId"]) ??
      pickNumber(created?.Resp, ["video_id", "id"]);

    if (!videoId) {
      throw new Error("PixVerse CLI did not return a video_id");
    }

    if (!input.wait) {
      return { videoId, videoUrl: "" };
    }

    const directUrl = pickVideoUrl(created) ?? pickVideoUrl(created?.Resp);
    if (directUrl) return { videoId, videoUrl: directUrl };

    const waited = await runPixverseJson(["task", "wait", String(videoId)], timeoutMs);
    const waitedUrl = pickVideoUrl(waited) ?? pickVideoUrl(waited?.Resp);
    if (!waitedUrl) {
      throw new Error("PixVerse CLI completed but no video URL was found");
    }

    return { videoId, videoUrl: waitedUrl };
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch {}
    }
  }
}
