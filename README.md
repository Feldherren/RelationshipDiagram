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

## Usage

| Action | How |
|--------|-----|
| Add character | **+ Character** in the toolbar |
| Pan | Drag empty canvas, middle-mouse drag, or hold **Space** and drag |
| Zoom | Scroll wheel |
| Connect nodes | **Connect** → click source → click target |
| Edit properties | Select an item; use the panel on the right |
| Group | Select a character → **+ Group**; drag characters into an expanded group |
| Collapse group | Double-click the group, or use **Collapse group** in the panel |
| Delete | Select an item → **Delete** key |
| Save / Open | **Save** / **Open** (`.rdiagram` JSON files) |
| Export PNG | **Export** — auto content bounds or draw a custom region |

## File format

Diagrams are saved as `.rdiagram` JSON with `schemaVersion: 1`. Images are embedded as base64 data URLs for single-file portability.
