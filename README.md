# Mobile Webview Builder

A drag-and-drop builder for the simple, uniform mobile webview screens that live inside the app.
Compose screens from your Lit component library, reuse pieces as blocks, keep every screen on one
theme, click through flows in preview, and export ready-to-use Lit components.

This is a local prototype using public Lit/Lion packages and sample data. The internal `ing-web`
adapter is disabled until you configure it. No private ING packages, backend account, API key,
or native mobile app are required to run the included examples.

## Hosted demo

[Open Mobile Webview Builder](https://mobile-webview-builder.frostorygon.workers.dev).

The hosted demo starts with five built-in sample screens. Compose and edit screens, reuse blocks,
change the theme, preview navigation, and download source, theme, or project JSON.

Projects autosave in the current browser on the current device. Download **Project JSON** from
**Export** to keep a backup or move work to another browser, then use **Import project** to reopen it.
Clearing browser storage removes the local saved project.

For a complete compiled export with bundled component dependencies, run the builder locally and use
**Write all screens to repo**. Downloaded Lit/HTML source is intended for use with that local project.

## Presentation

See [the short PDF presentation](output/pdf/mobile-webview-builder.pdf) for an overview of
reusable tooling, consistent screens, and customization in Mobile Webview Builder.

## Download and run locally

### Requirements

- **Node.js 24.x**, with npm included. Install it from [nodejs.org](https://nodejs.org/).
  This project is verified with Node 24.20.0 and npm 11.19.0. An `.nvmrc` pins the Node 24 release line
  if you already use a compatible Node version manager.
- **Git** for cloning, or use GitHub's **Code → Download ZIP** instead.
- A current desktop browser and internet access to install dependencies.
- Access to the GitHub repository. It is private, so sign in with an authorized account before downloading.

Check your installation:

```sh
node --version
npm --version
```

### Option 1: clone with Git

```sh
git clone https://github.com/frostorygon/mobile-webview-builder.git
cd mobile-webview-builder
npm ci
npm run dev -- --host 127.0.0.1 --strictPort
```

Open **http://127.0.0.1:5180** in your browser. Keep the terminal running; press **Ctrl+C** to stop it.
Run these commands from the folder containing `package.json`.

### Option 2: download a ZIP

1. Open [the repository](https://github.com/frostorygon/mobile-webview-builder) while signed in.
2. Select **Code → Download ZIP**, then extract the ZIP completely.
3. Open a terminal in the extracted folder containing `package.json`.
4. Run:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --strictPort
```

Then open **http://127.0.0.1:5180**.

On Windows PowerShell, if `npm` reports that scripts are disabled, use `npm.cmd` in its place:

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --strictPort
```

`npm ci` installs the exact dependencies in `package-lock.json`. Run it on a fresh download;
it replaces any existing `node_modules` folder. No global Vite or TypeScript installation is needed.

### First demo

1. Select a sample screen in the bottom strip.
2. Insert a component from **Components**, then edit its text in **Properties**.
3. Save a composition as a block to reuse it across screens.
4. Set **On tap, go to**, then choose **Preview** to try navigation.
5. Choose **Export** to inspect code or **Write all screens to repo** to create runnable exports in `generated/`.

The included saved project uses Shoelace from a public CDN, which requires internet access when
loading that example. The built-in Lit/Lion components are installed locally. Remote library imports
and remote images also need their URLs to be reachable. Prepare and test the exact demo before presenting offline.

### Verify the project

```sh
npm test
npm run typecheck
npm run build
```

The build also runs the TypeScript check. To inspect the static build:

```sh
npm run preview -- --host 127.0.0.1
```

Use the URL printed in the terminal. **Use `npm run dev` for the full demo**: file autosave and
**Write all screens to repo** depend on the development server. Static preview uses browser storage instead.

### Saved work and troubleshooting

- Development mode saves changes to `builder-data/project.json`. This repository includes a sample
  project; edits change that file locally. Download project JSON from Export to keep a separate backup.
- Dependencies, build output, generated exports, local settings, and environment files are excluded from Git.
- If port 5180 is occupied, stop the other local server or run
  `npm run dev -- --host 127.0.0.1 --strictPort --port 5181`, then open http://127.0.0.1:5181.
- If a remote library fails to load, check your internet connection and its URL in **Libraries**.
- If dependencies fail to install, confirm Node is version 24.x and rerun `npm ci` from the project folder.
- Keep the development server on your own computer. Its save and export routes are local authoring tools.

To preview exported pages, after **Write all screens to repo** run in a second terminal:

```sh
npm run preview -- --outDir generated --host 127.0.0.1 --port 5182 --strictPort
```

Open an exported filename under **http://127.0.0.1:5182/html/**, such as the corresponding HTML file
listed in `generated/html/`. Keep the entire `generated/` folder together so shared assets and linked screens resolve.

## How it works

| Concept | What it is |
| --- | --- |
| **Screens** | A webview page: native or web navigation bar, a scrollable body and a sticky footer for actions. Start blank or from a template (info, success, error, form, settings list, review, loading). |
| **Components** | Real custom elements from registered libraries, rendered live in the canvas. Drag them in, or click to insert after the selection. |
| **Layout** | Stack, Row, Card, Section and Spacer. They render as plain HTML with token-based spacing, so generated code has no layout dependency. |
| **Blocks** | Reusable compositions. Select anything and use **Save as block**. Every use is linked: edit the block once and all screens update. Each use can override texts and icons, or be detached. |
| **Theme** | One set of design tokens (`--mk-*`) for all screens: colors, radius, font, text size. |
| **Preview** | Set **On tap, go to** on any element, then press **P** to click through the flow. |
| **Export** | Inspect or download Lit source, an HTML page, `theme.css` or project JSON. With the dev server running, **Write all screens to repo** writes Lit source, compiled screens, HTML pages and bundled local dependencies to `generated/`. |

The project autosaves to `builder-data/project.json` (commit it to share screens with your team).
Without the dev server it falls back to the browser's localStorage.

Repository exports include `screens/*.ts` for editing, `screens/*.js` and shared `assets/`
for execution, `html/*.html` for browser previews, and `theme.css`. Serve `generated/`
through a local web server to preview the HTML pages and their linked navigation. The
compiled files can be copied together to another repo without the builder's source.
Remote libraries and their stylesheets remain URL dependencies. Downloading a single
source or HTML file does not download its companion assets.

Screen names can repeat: exports assign distinct filenames, element tags and routes,
including names that normalize to the same filename. Repeated Duplicate actions also
produce distinct display names.

## Bringing in a component library

Libraries describe their components with a `ComponentDef`: tag, props (and how each maps to an
attribute, property or slotted text), whether it accepts children, and its import path for
generated code. You rarely write these by hand. Most Lit libraries can generate a
[Custom Elements Manifest](https://github.com/webcomponents/custom-elements-manifest), and
`src/core/cem.ts` turns it into defs.

**Lion** (`src/libraries/lion`) is wired up this way and is the template for **ing-web**:

1. `npm install ing-web` from your internal registry.
2. Slim its manifest (Lion's is 6 MB, the slim version is a fraction of that):
   ```bash
   node scripts/slim-manifest.mjs node_modules/ing-web/custom-elements.json src/libraries/ing-web/ing-web.manifest.json --prefix=ing- --package=ing-web
   ```
   No manifest yet? Run `npx @custom-elements-manifest/analyzer analyze --litelement` in the ing-web repo.
3. Follow the steps in `src/libraries/ing-web/index.ts`: list the tags, their `define` imports and any
   curation (labels, default text, which attributes to show). Then set `ENABLED = true`.

**No code:** the **Libraries** dialog can add a library from URLs, an ES module plus its
`custom-elements.json`. *Fill example* loads Shoelace from a CDN to show how it works. This also suits an
internal CDN build of ing-web.

Manifest slots remain editable child containers. Select a container, choose **Insert into
slot** in Properties when it has several slots, then click a palette component to insert
it there. In Layers, each named slot is also a drop target. Named slots are preserved in
the live canvas and exported code.

## Adding your own components

Team components live in `src/libraries/custom/`:

1. Write a normal Lit element (see `team-promo-card.ts` or `team-code-input.ts`). Read design tokens
   such as `var(--mk-color-primary)` so it follows the theme.
2. Describe it in `src/libraries/custom/index.ts` (tag, props, import path).

Vite hot-reloads it into the palette. For compositions of existing components, use blocks instead.

## Project layout

```
src/
  core/
    model.ts       project, screens, nodes, blocks
    registry.ts    component/library registry
    cem.ts         Custom Elements Manifest -> component defs
    remote.ts      libraries loaded from URLs
    render.ts      node tree -> live DOM (canvas, preview, thumbnails)
    codegen.ts     node tree -> Lit / HTML (mirrors render.ts)
    blocks.ts      linked instances, overrides, detach
    tree.ts        insert / move / remove / duplicate
    store.ts       state, undo/redo, persistence
    actions.ts     editing operations used by the UI and shortcuts
    dnd.ts         pointer-based drag and drop across shadow roots
    templates.ts   screen templates and the seed project
    theme.ts       design tokens and presets
  app/             builder UI (Lit): canvas, palette, layers, inspector, dialogs
  libraries/
    layout.ts      layout primitives + shared screen CSS
    mobile-kit/    Lit component set standing in for ing-web
    lion/          @lion/ui via its manifest
    custom/        your team's components
    ing-web/       adapter template
scripts/slim-manifest.mjs
test/              vitest: tree ops, manifest import, blocks, codegen
```

## Keyboard

| | |
| --- | --- |
| Double-click | edit text in place (on a block: open it) |
| `Del` / `Backspace` | delete |
| `Ctrl+D` | duplicate |
| `Ctrl+C` / `Ctrl+V` | copy / paste, also across screens |
| `Alt+↑` / `Alt+↓` | move within parent |
| `Esc` | select parent |
| `Ctrl+Z` / `Ctrl+Shift+Z` | undo / redo |
| `P` | toggle preview |
| `/` | search components |
| `[` / `]` | previous / next screen |

## Scripts

`npm run dev` · `npm test` · `npm run typecheck` · `npm run build` (static build, browser storage only)

## Deploy to Cloudflare

From this folder, using an authorized Cloudflare login:

```sh
npm run build
npx wrangler@4.131.0 deploy --config wrangler.jsonc
```

The production build serves static assets without a backend or shared project database.
