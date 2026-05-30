# PixVerse Video Track — Optimal Node Structure & Data Model

This document describes a practical **graph/node structure** (for a flow/workspace UI) and a **regeneration-friendly data model** for a PixVerse-powered storyboard → clip generation → stitching workflow.

---

## 0) Goals & constraints

- Treat each node as a **shot** (not a single frame).
- Typical MVP: **6–8 shots**, **5–8s each**, total **≥ 30s** final video.
- Users can:
  - upload a **character reference image**
  - provide a **story prompt**
  - review/edit each shot
  - generate a **clip per shot** with PixVerse
  - regenerate individual shots (keep history)
  - stitch into a final video with **scene navigation**

---

## 1) Node (graph) structure for the UI

### 1.1 Top-level nodes (single-instance)

1. **Project**
   - Global settings and defaults (aspect ratio, model, resolution, fps, etc.)
2. **Character Reference**
   - One or more reference images + optional character sheet text
3. **Story Prompt**
   - High-level story premise + target audience + intent
4. **Style Bible (recommended)**
   - “Do/Don’t” list + visual anchors (tone, lighting, palette, lens, era)
5. **Storyboard (TRAE)**
   - The generated shot list (6–8 shots), editable

### 1.2 Per-shot repeated “bundle” (6–8 bundles)

Each shot should be a **bundle** (expandable group) or a composite node with internal tabs:

- **Shot Spec (Editable)**
  - title, scene description, subject action, camera movement, duration, aspect ratio
- **Prompt (TRAE assist + manual)**
  - prompt text, negative prompt, params, diffs/history
- **PixVerse Generate Clip (Async job)**
  - queued/running/succeeded/failed + progress + retries
- **Review / Approve**
  - approve/reject, notes, “selected version” for stitching

### 1.3 Finalization nodes

1. **Stitch / Assemble**
   - timeline order, transitions, music (optional), subtitles (optional)
2. **Player / Scene Navigation**
   - chapters/scene index, jump to shot, show per-shot metadata

### 1.4 Edges (connections)

- `Character Reference` → all `Shot Spec` (consistency anchor)
- `Style Bible` → all `Prompt` (style consistency)
- `Story Prompt` → `Storyboard (TRAE)` → each `Shot Spec`
- Per shot: `Shot Spec` → `Prompt` → `Generate Clip` → `Review`
- Approved shots: `Review` → `Stitch / Assemble` → `Player / Scene Navigation`

### 1.5 Why this graph works

- **Localized regen**: regenerating shot 3 does not invalidate shot 1–2 and 4–8.
- **Judge-friendly**: you can show TRAE iteration and per-shot decision making.
- **Scales**: to reach 3 minutes, just add shots or increase durations.

---

## 2) Data model (regeneration-friendly)

### 2.1 Key modeling principle

**Shot is stable; generations are versioned.**

- A **Shot** stays the same ID across edits/regeneration.
- Each edit creates a **ShotRevision**.
- Each PixVerse run creates a **GenerationJob** (linked to a ShotRevision).
- A shot chooses a **selected clip** to use in final stitching.

This keeps history, makes debugging easy, and supports “best-of” selection.

---

## 3) Entities (recommended)

### 3.1 Project

```json
{
  "id": "proj_123",
  "name": "Film Teaser Builder",
  "domain": "film_entertainment",
  "createdAt": "2026-05-30T10:00:00Z",
  "settings": {
    "aspectRatio": "16:9",
    "defaultShotDurationSec": 6,
    "targetTotalDurationSec": 36,
    "pixverseModel": "v6",
    "resolution": "720p",
    "fps": 24
  }
}
```

### 3.2 Asset (unified media object)

Use one Asset table/collection for images, clips, and final video:

```json
{
  "id": "asset_001",
  "type": "image | clip | video",
  "uri": "s3://bucket/key or /files/asset_001",
  "mimeType": "image/png",
  "width": 1280,
  "height": 720,
  "durationSec": 6,
  "createdAt": "2026-05-30T10:00:00Z"
}
```

### 3.3 CharacterProfile

```json
{
  "id": "char_123",
  "projectId": "proj_123",
  "name": "Aya",
  "referenceAssetIds": ["asset_char_img_1"],
  "notes": {
    "appearance": "short silver hair, scar on left eyebrow",
    "wardrobe": "black trench coat"
  }
}
```

### 3.4 StorySpec (+ Style Bible)

```json
{
  "id": "story_123",
  "projectId": "proj_123",
  "prompt": "A detective uncovers a memory market conspiracy...",
  "styleBible": {
    "visualStyle": "cinematic neo-noir, rain, anamorphic lens flare",
    "do": ["consistent protagonist face", "moody lighting"],
    "dont": ["cartoon style", "random outfit changes"]
  }
}
```

---

## 4) Shots, revisions, generation jobs

### 4.1 Shot (stable container)

```json
{
  "id": "shot_01",
  "projectId": "proj_123",
  "order": 1,
  "title": "Inciting discovery",
  "spec": {
    "sceneDescription": "Night alley, detective finds a glowing cassette",
    "subjectAction": "kneels, picks it up, looks shocked",
    "camera": "slow dolly-in, shallow depth of field",
    "durationSec": 6,
    "aspectRatio": "16:9"
  },
  "state": "draft | ready | generating | needs_review | approved",
  "activeRevisionId": "shotrev_01a",
  "selectedClipAssetId": "asset_clip_01v2"
}
```

### 4.2 ShotRevision (versioned prompt + params)

Every user edit or TRAE rewrite creates a new revision:

```json
{
  "id": "shotrev_01a",
  "shotId": "shot_01",
  "createdAt": "2026-05-30T10:05:00Z",
  "createdBy": "user | trae",
  "prompt": "Cinematic neo-noir... (PixVerse prompt here)",
  "negativePrompt": "cartoon, low-res, extra limbs",
  "params": {
    "model": "v6",
    "resolution": "720p",
    "seed": 12345,
    "cfgScale": 7,
    "durationSec": 6
  },
  "consistency": {
    "characterRefAssetId": "asset_char_img_1",
    "styleRefAssetId": null
  },
  "changeNote": "TRAE tightened camera & lighting"
}
```

### 4.3 GenerationJob (PixVerse async execution)

```json
{
  "id": "job_789",
  "shotRevisionId": "shotrev_01a",
  "provider": "pixverse",
  "status": "queued | running | succeeded | failed | canceled",
  "progress": 0.65,
  "error": null,
  "createdAt": "2026-05-30T10:06:00Z",
  "completedAt": "2026-05-30T10:07:30Z",
  "outputAssetId": "asset_clip_01v1"
}
```

### 4.4 ReviewDecision (approval + selection)

```json
{
  "id": "review_01",
  "shotId": "shot_01",
  "status": "approved | rejected",
  "notes": "Great mood, but reduce motion blur; regenerate once.",
  "approvedClipAssetId": "asset_clip_01v2",
  "createdAt": "2026-05-30T10:08:00Z"
}
```

---

## 5) Timeline, stitching, and navigation

### 5.1 Timeline (what you stitch)

```json
{
  "id": "tl_123",
  "projectId": "proj_123",
  "items": [
    {
      "shotId": "shot_01",
      "clipAssetId": "asset_clip_01v2",
      "inSec": 0,
      "outSec": 6,
      "transition": "cut"
    },
    {
      "shotId": "shot_02",
      "clipAssetId": "asset_clip_02v1",
      "inSec": 6,
      "outSec": 12,
      "transition": "crossfade_8f"
    }
  ]
}
```

### 5.2 FinalRenderJob (stitch/export)

```json
{
  "id": "render_555",
  "projectId": "proj_123",
  "timelineId": "tl_123",
  "status": "queued | running | succeeded | failed",
  "outputVideoAssetId": "asset_final_video",
  "createdAt": "2026-05-30T10:20:00Z"
}
```

### 5.3 SceneIndex (for scene-based navigation)

```json
{
  "projectId": "proj_123",
  "scenes": [
    { "shotId": "shot_01", "title": "Inciting discovery", "startSec": 0, "endSec": 6 },
    { "shotId": "shot_02", "title": "Memory market", "startSec": 6, "endSec": 12 }
  ]
}
```

---

## 6) Shot state machine (recommended)

Suggested `Shot.state` transitions:

- `draft` → `ready` (has minimum spec + prompt revision)
- `ready` → `generating` (PixVerse job started)
- `generating` → `needs_review` (job succeeded; clip available)
- `needs_review` → `approved` (clip selected) **OR** back to `ready` (edit prompt/spec)

Important: **do not block other shots** if one shot fails.

---

## 7) Minimal API surface (suggested)

### Project & inputs
- `POST /projects`
- `POST /projects/:id/assets` (upload character image)
- `PUT /projects/:id/story`

### Storyboard
- `POST /projects/:id/storyboard:generate` (TRAE generates shot list)
- `PUT /shots/:shotId` (edit shot spec)

### Prompt + generation
- `POST /shots/:shotId/revisions` (create revision: from user or TRAE)
- `POST /revisions/:revId/generate` (start PixVerse job)
- `GET /jobs/:jobId` (poll progress)

### Review
- `POST /shots/:shotId/review` (approve/reject + select clip)

### Stitching & playback
- `POST /projects/:id/render` (stitch timeline → final video)
- `GET /projects/:id/scene-index`

---

## 8) Implementation notes (hackathon-friendly)

- Prefer a **single “selectedClipAssetId” per shot** for stitching.
- Keep **all previous clips** as history so the user can switch versions quickly.
- For consistent character:
  - Always attach the same `characterRefAssetId` in `ShotRevision.consistency`.
  - Put shared constraints in `Style Bible` and automatically inject them into prompts.
- For demo reliability:
  - Default to **6 shots × 6s = 36s**.
  - Allow “regenerate shot only” without re-rendering the entire project until export.

---

## 9) Optional (nice-to-have) additions

- `TemplateProject` (starter flows for common teaser styles)
- `PromptDiff` (store previous prompt + highlight changes for “TRAE efficiency” points)
- `Safety/Policy` logging (store which prompts were blocked and why)

