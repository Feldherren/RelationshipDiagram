# Relationship Diagram

A browser-based editor for character relationship diagrams. Create characters, connect them with styled lines, and organise them into groups on an infinite pan/zoom canvas.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Desktop app (Tauri)

This project includes a [Tauri](https://v2.tauri.app/) shell for running as a native desktop app on Windows, macOS, and Linux.

### Prerequisites

1. [Node.js](https://nodejs.org/) (for the frontend)
2. [Rust](https://www.rust-lang.org/tools/install) (`rustup` is recommended)
3. **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually preinstalled on Windows 10/11)

### Run in development

```bash
npm install
npm run tauri:dev
```

### Build installer

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
| Pan | Drag empty canvas, middle-mouse drag, or hold **Space** and drag |
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
