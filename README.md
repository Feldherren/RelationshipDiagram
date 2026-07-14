# Relationship Diagram Creator

A browser-based editor for character relationship diagrams. Create characters, connect them with styled lines, and organise them into groups on an infinite pan/zoom canvas.

## Features
- Create characters, give them names, subtitles, graphics, customised border colour
- Connect characters with coloured lines (and give the lines labels, a couple of styles, bend them)
- Named groups with customisable colours! Collapse them to hide them if they're a bit large
- Saving and loading
- Image export (entire graphic or selected area) at two distinct levels of zoom (also it estimates the dimensions of the exported image)
- Customise the overall diagram - title and subtitle, grid or no grid, background colour, font 

## Notes
NB: this application is largely generated code (don't want to get accused of hiding that, or of being *good* with react, vite, tauri and so forth). I'm not good at frontend stuff and wanted a usable character relationship diagram application with a few more features than the last thing I was using, and I wanted it more than I wanted to spend however long it would take to learn everything.
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
| Add character | **+ Character** in the toolbar |
| Pan | Drag empty canvas, or middle-mouse drag |
| Zoom | Scroll wheel |
| Connect nodes | Click a character's **+** button, then click a target — or drag **+** to another character |
| Edit properties | Select an item; use the panel on the right |
| Group | Select a character → **+ Group**; drag characters into an expanded group |
| Collapse group | Double-click the group, or use **Collapse group** in the panel |
| Delete | Select an item → **Delete** key |
| Save / Open | **Save** / **Open** (`.rdiagram` JSON files) |
| Export PNG | **Export** — auto content bounds or draw a custom region |

## File format

Diagrams are saved as `.rdiagram` JSON with `schemaVersion: 1`. Images are embedded as base64 data URLs for single-file portability.
