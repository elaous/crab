# CrabCAD — Open-Source 3D Modeling Suite

A browser-based 3D modeling environment inspired by SketchUp, built with TypeScript, React, Three.js, and Zustand.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| UI | React 19 |
| Build | Vite 8 |
| 3D Rendering | Three.js |
| State | Zustand |
| Styling | Tailwind CSS v4 |

## Phase 1 Features (Implemented)

- **3D Viewport** — WebGL renderer with perspective/orthographic cameras, orbit/pan/zoom controls, grid & axes
- **Primitives** — Box, Sphere, Cylinder, Cone with live dimension editing
- **Object Tree** — Hierarchy view with rename, hide/show, delete
- **Layer System** — Create/rename/delete layers, toggle visibility, assign objects, color coding
- **Properties Panel** — Transform (position/rotation/scale), color, opacity, metadata (cost/material/notes)
- **Display Modes** — Shaded, Wireframe, Rendered
- **Lighting** — Ambient + directional sun light with soft shadows
- **File I/O** — Save/load `.crab` JSON files, STL export, 30s autosave to localStorage
- **Keyboard Shortcuts** — Ctrl+Z/Y undo/redo, Del delete, Ctrl+A select all, Ctrl+D duplicate, Esc deselect, H hide
- **View Presets** — Front, Back, Left, Right, Top, Bottom, Isometric
- **Status Bar** — Live 3D cursor position, selection count, display mode, units

## Getting Started

```bash
npm install
npm run dev
```

## Roadmap

- **Phase 2** — Push/Pull extrusion, constraint snapping, dimension display
- **Phase 3** — Boolean operations (OCCT.js), PBR materials, sketching
- **Phase 4** — Annotations, section cuts, STEP/GLTF/FBX export
- **Phase 5** — Performance optimization, plugin API

## License

MIT
