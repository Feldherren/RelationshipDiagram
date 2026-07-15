# Relationship Diagram Creator

A browser-based editor for character relationship diagrams. Create characters, connect them with styled lines, organise them into labelled boxes, and tag them with membership groups on an infinite pan/zoom canvas.

## Features
- Create characters, give them names, subtitles, graphics, customised border colour
- Connect characters (and boxes) with coloured lines (and give the lines labels, a couple of styles, bend them)
- **Groups** - semantic membership (a character can belong to many groups). Shown as coloured chips on each character’s border; select a group to highlight its members
- **Boxes** - labelled organisational regions with customisable colours. Drag characters into a box by position; collapse a box to hide whoever is inside it
- Floating text annotations
- Saving and loading
- Image export (entire graphic or selected area) at two distinct levels of zoom (also it estimates the dimensions of the exported image)
- Customise the overall diagram - title and subtitle, grid or no grid, background colour, font

## Notes
NB: this application is largely generated code (don't want to get accused of hiding that, or of being *good* with react, vite, tauri, et cetera). I'm not good at frontend stuff and wanted a usable character relationship diagram application with a few more features than the last thing I was using, and I wanted it more than I wanted to spend however long it would take to learn and write everything from scratch.
I can (and do) still read the code, and I'm happy to fix reported issues and consider into feature requests, should anyone make any.

Also, note that whilst screenshots (if and when I add any) will probably demonstrate the [Honey Pigeon](https://stevencolling.itch.io/honey-pigeon) font, this font is not included with the application; you can use any installed font, and I just happen to like Honey Pigeon.

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
| Add character | **+ Character** in the toolbar, or right-click canvas → **Add character** |
| Add box | Right-click canvas → **Add box** |
| Add group | Right-click canvas → **Add group** |
| Add floating text | Right-click canvas → **Add text** |
| Pan | Drag empty canvas, or middle-mouse drag |
| Zoom | Scroll wheel |
| Connect nodes | Click a character or box’s **+** button, then click a target (same node for a self-loop) — or drag **+** to a target |
| Edit properties | Select an item; use the floating panel near it |
| Manage groups | **Groups** in the toolbar (or click a membership chip / add a group) |
| Assign group membership | Select a character → check groups in the float, or open **Groups** → **Edit members on canvas** |
| Highlight group | Select a group in the Groups panel or click a membership chip — members stay prominent, others dim |
| Customise group chip | Open **Groups**, select a group → **Customise chip…** |
| Organise with a box | Drag characters so their centres sit inside the box; move the box header to move those characters with it |
| Collapse box | Double-click the box, or use **Collapse box** in the floating panel |
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

# Licensing Information

I vibe-coded this, *mostly*, but should anyone want to use or modify this tool, [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) seems appropriate. Also, please pay attention to the licenses of several resources used in the making of the tool, listed below.

## Resources Used

[SVG Repo](https://www.svgrepo.com/)

None of these SVGs have been used as files, but their paths have been used for icons. Still worth attribution.

Droplet SVG: https://www.svgrepo.com/svg/349008/droplet (Open Iconic, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))
Flame Symbol SVG: https://www.svgrepo.com/svg/499167/flame-symbol (nagoshiashumari, [GPL License](https://www.svgrepo.com/page/licensing/#GPL))
Music Note SVG: https://www.svgrepo.com/svg/526059/music-note (Solar Icons, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))
Skull SVG: https://www.svgrepo.com/svg/510199/skull (zest, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))
Glitter 2 SVG: https://www.svgrepo.com/svg/477652/glitter-2 (Icooon Mono, [Public Domain](https://www.svgrepo.com/page/licensing/#PD))
Stone Block SVG: https://www.svgrepo.com/svg/321503/stone-block (game-icons.net, [CC Attribution License](https://www.svgrepo.com/page/licensing/#CC%20Attribution))
Sword F SVG: https://www.svgrepo.com/svg/360818/sword-f (michaelampr, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))
Wind SVG: https://www.svgrepo.com/svg/394565/wind (Kenan Gundogan, [MIT License](https://www.svgrepo.com/page/licensing/#MIT))