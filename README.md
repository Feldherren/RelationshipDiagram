# Character Relationship Diagram Creator

A browser-based and desktop editor for character relationship diagrams. Create characters, connect them with styled lines, organise them into labelled boxes, and tag them with membership groups on an infinite pan/zoom canvas.

## Important Notes
This application is largely generated code (don't want to get accused of hiding that, or of being *good* with react, vite, tauri, et cetera). I'm not good at frontend stuff and wanted a usable character relationship diagram application with a few more features than the last thing I was using, and I wanted it more than I wanted to spend however long it would take to learn and write everything from scratch.
I can (and do) still read the code, and I'm happy to fix reported issues and consider feature requests, should anyone make any.

Also, note that whilst screenshots (all one of them) demonstrate the [Honey Pigeon](https://stevencolling.itch.io/honey-pigeon) font, I have not included Honey Pigeon with the application; you can use any installed font, and I just happen to like Honey Pigeon.

## Features
- **Characters** - give them names, subtitles, an image, and a customised border colour
- **Lines** for relationships - coloured lines with optional labels, a couple choices of styles (straight, dotted, wavy, jagged), can be curved for visibility
- **Groups** - semantic membership (a character can belong to many groups). Shown as coloured chips on each character’s border; select a group to highlight its members
- **Boxes** - labelled organisational regions with customisable colours. Drag characters or text into a box by position; collapse a box to hide whoever is inside it
- **Text** - floating text
- **Diagram properties** - title and subtitle, background style, background colour, font
- **Themes** - in-app UI theme and diagram theme editors (themes are stored in localStorage), theme export and import (JSON)
- **Bookmarks** - user-definable easy navigation
- Saving and loading (*.rdiagram)
- Image export (entire graphic or selected area) at two distinct levels of zoom (it estimates the dimensions of the exported image)

## Screenshots

Quick and hacky Matter of Britain diagram exported from desktop app
![Quick and hacky Matter of Britain diagram](https://feldherren.neocities.org/misc/The%20Matter%20of%20Britain.png)

## Setup

### Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Build

```bash
npm run build
npm run preview
```

### Desktop app (Tauri)

This project includes a [Tauri](https://v2.tauri.app/) shell for running as a native desktop app on Windows, macOS, and Linux.

#### Prerequisites

1. [Node.js](https://nodejs.org/) (for the frontend)
2. [Rust](https://www.rust-lang.org/tools/install) (`rustup` is recommended)
3. **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually preinstalled on Windows 10/11)
4. **Mac**: You will need to have [Xcode](https://developer.apple.com/xcode/) installed in order to compile for Mac.

#### Run in development

```bash
npm install
npm run tauri:dev
```

#### Build installer

```bash
npm run tauri:build
```

Installers and binaries are written to `src-tauri/target/release/bundle/`.

### Troubleshooting

**`cargo metadata` / `program not found`** — Rust is installed but the terminal does not see it yet. Either restart Cursor (or open a new terminal), or use the provided `npm run tauri:dev` script which prepends `~/.cargo/bin` to `PATH` automatically.

**`Port 5173 is already in use`** — Stop any other Vite dev server (`npm run dev`) before starting `npm run tauri:dev`.

## Usage

| Action | How |
|--------|-----|
| Add character | Upper-right **Add character** button |
| Add box | Upper-right **Add box** button |
| Add group | **Groups** (lower left) → **Add group** |
| Add floating text | Upper-right **Add text** button |
| Pan | Drag empty canvas, or middle-mouse drag |
| Zoom | Scroll wheel |
| Connect nodes | Click a character or box’s **+** button, then click a target (same node for a self-loop) — or drag **+** to a target |
| Select an item | Single-click it (highlights without opening the panel) |
| Edit properties | Double-click or right-click an item to open its floating panel; or select it and press **Enter** |
| Browse groups | **Groups** in the lower left |
| Assign group membership | **Groups** (lower left) → **Edit members**, or select a group → **Edit members on canvas** |
| Highlight / edit group | Click a membership chip, or pick a group from **Groups** — members stay prominent; edit in the floating panel |
| Customise group chip | Select a group → **Customise chip…** in the floating panel |
| Organise with a box | Drag characters so their centres sit inside the box; move the box header to move those characters with it |
| Collapse box | Click the collapse control on the box, or use **Collapse box** in the floating panel |
| Delete | Select an item → **Delete** key |
| Save / Open | **Save** / **Open** (`.rdiagram` JSON files) |
| Export PNG | **Export** — auto content bounds or draw a custom region |

## Groups vs boxes

| | **Group** | **Box** |
|--|-----------|---------|
| Purpose | “Who belongs together” (factions, families, etc.) | Layout / clutter control on the canvas |
| Membership | Explicit list; multi-membership allowed | Whoever’s position is currently inside the rectangle |
| On canvas | Coloured chips on characters (background, symbol, colours) | Labelled rectangle (connectable, collapsible) |
| Highlight | Selecting a group emphasises its members | — |

## File format

Diagrams are saved as `.rdiagram` JSON with `schemaVersion: 2` (`groups` for membership, `boxes` for organisational regions). Images are embedded as base64 data URLs for single-file portability. Opening a `schemaVersion: 1` file migrates each old combined group into one box (same id, so lines keep working) plus one membership group.

## Translating the UI

The interface is localised with [i18next](https://www.i18next.com/). English (`en`) is the source language (British spellings such as *colour* / *Customise*). Diagram content (character names, labels, and so on) is never auto-translated — only chrome strings.

To add a language:

1. Copy [`src/i18n/locales/_template.json`](src/i18n/locales/_template.json) to `src/i18n/locales/xx.json` (or `xx-YY.json`, e.g. `pt-BR.json`).
2. Translate the string **values**. Keep keys and `{{placeholders}}` (such as `{{name}}`, `{{n}}`, `{{count}}`) unchanged.
3. Register the locale in [`src/i18n/index.ts`](src/i18n/index.ts):
   - Import the JSON file
   - Add it to `resources`
   - Add `{ code: "xx", nativeName: "…" }` to `SUPPORTED_LOCALES` (`nativeName` should be the language’s own name, e.g. `Français`)
4. Open **Settings → Language**, pick the new locale (or **System** to follow the browser/OS), and check the UI.

Please do not submit machine-only translations without review by someone fluent in the target language.

# Licensing Information

I vibe-coded this, *mostly*, but should anyone want to use or modify this tool, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) seems appropriate. Also, please pay attention to the licenses of several resources used in the making of the tool, listed below.

## Resources Used

[SVG Repo](https://www.svgrepo.com/)

None of these SVGs have been used as files, but their paths have been used for icons. Still worth attribution.

Arrows Reload 01: https://www.svgrepo.com/svg/472960/arrows-repeat (jtblabs, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Bookmark Add: https://www.svgrepo.com/svg/471101/bookmark-add (SVG Repo, [CC0 License/Public Domain](https://www.svgrepo.com/page/licensing/#CC0))

Bookmark Filled: https://www.svgrepo.com/svg/472457/bookmark-filled (jtblabs, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Droplet: https://www.svgrepo.com/svg/349008/droplet (Open Iconic, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

External Link: https://www.svgrepo.com/svg/506476/external-link (primefaces, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Eye: https://www.svgrepo.com/svg/528962/eye (Solar Icons, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))

Eye Closed: https://www.svgrepo.com/svg/528958/eye-closed (Solar Icons, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))

Flame Symbol: https://www.svgrepo.com/svg/499167/flame-symbol (nagoshiashumari, [GPL License](https://www.svgrepo.com/page/licensing/#GPL))

Glitter 2: https://www.svgrepo.com/svg/477652/glitter-2 (Icooon Mono, [Public Domain](https://www.svgrepo.com/page/licensing/#PD))

Music Note: https://www.svgrepo.com/svg/526059/music-note (Solar Icons, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))

Skull: https://www.svgrepo.com/svg/510199/skull (zest, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Snap To Grid: https://www.svgrepo.com/svg/451326/snap-to-grid (Esri, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Stone Block: https://www.svgrepo.com/svg/321503/stone-block (game-icons.net, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))

Sword F: https://www.svgrepo.com/svg/360818/sword-f (michaelampr, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))

Wind: https://www.svgrepo.com/svg/394565/wind (Kenan Gundogan, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))