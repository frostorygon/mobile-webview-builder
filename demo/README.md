# DemoJam materials

Everything for the 10-minute Screen Builder DemoJam slot. These files need nothing beyond a browser
and a Markdown viewer. The live part uses the app in this repository.
Claude Desktop drafted the script and browser animation. Codex reviewed the facts, checked playback,
and exported the ready-to-play MP4.

| File | What it is |
| --- | --- |
| [DEMO-SCRIPT.md](DEMO-SCRIPT.md) | Read-aloud script for 0:00 to 10:00, with SAY and DO steps, recovery line, optional close and rehearsal checklist. |
| [workflow-animation.html](workflow-animation.html) | 40-second silent intro animation. Open it directly in a browser. Fully offline. |
| [workflow-animation.mp4](workflow-animation.mp4) | Ready-to-play 40-second video, 1280x720, 24 fps, H.264, no audio. Play in a video player or insert into a presentation. |

On GitHub, download the MP4 with **Download raw file**, or download the repository ZIP and extract it.
Open the HTML after downloading; GitHub's source view does not play it. Keep the script on a second
screen or print it. **SAY** is spoken text and **DO** is a click cue. Rehearse with a timer;
the ten-minute timestamps include the animation and live interactions.

## Run of show

| Time | Section | On screen |
| --- | --- | --- |
| 0:00-0:40 | Silent intro: brief, build, review, repair, prototype | Animation, full screen |
| 0:40-1:30 | Why this tool | Animation last frame |
| 1:30-2:30 | The brief and the build | Animation last frame |
| 2:30-3:40 | Independent review: five reproduced bugs | Optionally seek to the five-bug review frame |
| 3:40-4:20 | Repair and regression checks | Optionally seek to the repair / 25 tests frame |
| 4:20-5:00 | Tour: **Components**, **Layers**, **Properties**, **Theme** | Live app |
| 5:00-6:20 | **On tap, go to** and **Preview**: Transfer review to Transfer sent and back | Live app |
| 6:20-7:40 | Shared block: **Edit block** on Help link, both screens update | Live app |
| 7:40-8:50 | **Export** tabs and **Write all screens to repo** | Live app |
| 8:50-9:30 | Scope and next steps | Live app |
| 9:30-10:00 | Close | Live app or animation last frame |

If time runs short, trim the Export section first.

## The animation

Open `demo/workflow-animation.html` by double-clicking it, or drag it into a browser window.
It starts paused on the title frame and stops on the last frame. It never loops.

| Key | Action |
| --- | --- |
| Space or K | Play / pause |
| R | Replay from the start |
| F | Full screen on / off |
| Left / Right | Seek 2 seconds |
| Home / End | First / last frame |
| H | Hide / show the controls |

The on-screen controls are **Play**, **Replay**, a seek bar and **Full screen**. They hide while playing
once the mouse rests, and come back when it moves or when playback stops.

If the operating system asks for reduced motion, the animation keeps its timing and fades but drops
movement such as slides, the review sweep and the tap ripple. Add `?motion=full` to the URL to override that.

### Exporting an MP4 (optional)

The MP4 is already included. Regeneration is optional and does not affect the Node-only app setup.
The helper needs Python, installed Google Chrome, the Python `playwright` package, and either
ffmpeg on PATH or the Python `imageio-ffmpeg` package. From the repository root:

```sh
python scripts/export-demo-animation.py
```

It produces `demo/workflow-animation.mp4` at 1280x720 and 24 fps. It replaces that output only after
the export succeeds. The helper holds the closing scene for two seconds within the 40-second video.

- `?capture=1` hides the controls and always renders full motion.
- `window.ANIMATION_DURATION` is `40`.
- `window.renderAt(seconds)` draws the complete frame for any time from 0 to 40. It uses no timers or
  CSS transitions, so a frame-by-frame capture tool can step through it at any frame rate.
- The stage is 1920x1080 and scales to fit, so capture at a 16:9 viewport such as 1920x1080.

## Demo preparation

Do this on the presenting laptop, on the same network setup you will have on stage.

1. From the repository root, with Node 24.x:
   ```sh
   npm ci
   npm run dev -- --host 127.0.0.1 --strictPort
   ```
   On Windows PowerShell, use `npm.cmd` in place of `npm` if scripts are blocked.
2. Open `http://127.0.0.1:5180`. The header shows **Mobile webviews** and **Saved to builder-data/ in the repo**.
3. Check the six screens in the bottom strip: Software update, Transfer review, Transfer sent, Verify code,
   Savings overview, New screen.
4. Select **Transfer review** and leave the app there for the talk.
5. Open the animation in a second browser window, press **F** for full screen, and leave it paused on the title frame.
6. Use built-in components only. Do not open **Libraries** or load its Shoelace example. It needs internet.

### Reset after every rehearsal

The app autosaves to `builder-data/project.json`, so the block edit from rehearsal stays saved.
Use a dedicated demo copy. Before restoring the sample project, export any work you want to keep
as Project JSON or copy `builder-data/project.json` to a separate backup. The restore command below
discards local changes to that file. Then:

1. Close the builder tab so it cannot autosave over the reset.
2. From the repository root:
   ```sh
   git restore builder-data/project.json
   ```
3. Reopen `http://127.0.0.1:5180` and confirm the Help link reads `Questions? Contact us`.

If you clicked **Write all screens to repo**, it wrote to `generated/`. That folder is ignored by Git.

### Before committing demo changes

Run `git status` and review each change. Demo edits may change `builder-data/project.json` through
autosave. Preserve any work you want to keep before restoring the sample file. Presentation assets
live under `demo/`, and the optional video export helper lives under `scripts/`.

## Facts the talk relies on

Keep any changes to the script within these. Do not add timing, cost, productivity or full-correctness claims.

- A high-level brief went to Claude in Claude Desktop with creative ownership. An independent Astra review followed, then authorized repairs.
- With 16 tests and the build passing, the review reproduced five bugs: circular block paste crash; export missing component dependencies; duplicate names overwriting export files; lost imported and named slots; cleared custom text restoring defaults on export.
- After repair: 25 tests and the build passed, plus browser checks for slots and export navigation.
- A fresh install by Codex from the tracked files passed all 25 tests and the production build, and started over HTTP with six saved screens.
- Public components and sample data only. The internal ing-web adapter is a disabled template. No verified private ING package, native bridge, production integration or accessibility certification. Custom coded components need code and registration.
- The builder does not contain an AI assistant. Preview navigation is simulated. No real transfer happens.
