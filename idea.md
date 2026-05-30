My team is planning to build for Track 1 with PixVerse. Idea: An application that helps users create short videos (up to 3 minutes) based on their ideas using PixVerse and TRAE. Details: We can demo a workspace-style visual flow UI where users can create and manage their video generation process. The workflow starts with an input media file (e.g., a character image) along with a prompt describing the storyline. In the intermediate stage, the system generates a sequence of frames (Frame 1, Frame 2, etc.) - like my sent image for you. Each frame includes: * A text description of what that scene should depict. * A reference/generated image illustrating the scene. Users can review each frame, approve it, or modify it to better match their intended story. Finally, the system exports a complete video by generating and stitching the scenes together using the PixVerse API.


We are thinking of treating each node as a shot instead of a frame.

Workflow:
1. User uploads a reference character image.
2. User provides a story prompt.
3. TRAE generates a storyboard consisting of 6-8 shots.
4. User reviews and edits individual shots.
5. PixVerse generates a video clip for each approved shot.
6. User can regenerate specific shots if needed.
7. The system stitches all clips into a final video and provides scene-based navigation.

We only have 1-2 hours to build a working hackathon MVP, so please optimize for speed and simplicity rather than production-grade architecture.

Tech stack:

* Next.js 15 (App Router)
* React 19
* TypeScript
* TailwindCSS
* HeroUI v2
* React Flow (for workflow visualization)
* Zustand (if state management is needed)
* No database
* No authentication
* No queue system
* No backend server separate from Next.js
* Use Next.js API routes/server actions only

Goal:
Build an application that helps users create short videos using TRAE and PixVerse.

Workflow:

1. User uploads a reference image.
2. User enters a story prompt.
3. TRAE generates a storyboard consisting of 3-5 scenes.
4. Each scene contains:

   * scene title
   * scene description
   * image prompt
   * video prompt
5. User can edit any scene.
6. User clicks "Generate".
7. The app generates a video clip for each scene using the PixVerse API.
8. The app combines all clips into a final video.
9. User can preview the final result.

Please help me:

1. Simplify the architecture for a 1-2 hour implementation.
2. Design the React Flow node structure.
3. Design TypeScript interfaces.
4. Design API routes.
5. Explain the PixVerse integration flow.
6. Generate the folder structure.
7. Generate the implementation order from easiest to hardest.
8. Provide starter code for the core components and services.

Assume this is a hackathon MVP and prioritize something that can be demonstrated successfully over perfect engineering practices.

Do not propose enterprise architecture, microservices, databases, queues, or production-grade patterns unless absolutely required.