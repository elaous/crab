# CrabCAD — Open-Source 3D Modeling Suite

A browser-based 3D modeling environment inspired by SketchUp, built with TypeScript, React, Three.js, and Zustand.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6 |
| UI | React 19 |
| Build | Vite 8 |
| 3D Rendering | Three.js 0.185 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| File Format | `.crab` — MessagePack binary (Cap'n Proto schema) |
| Testing | Vitest |

## Getting Started

```bash
npm install
npm run dev      # development server
npm test         # unit tests
npm run build    # production build
```

## Features

### Modeling
- **Primitives** — Box, Sphere, Cylinder, Cone with live dimension editing
- **Push/Pull** — Face extrusion with snap-to-grid
- **Boolean CSG** — Union, Subtract, Intersect via `three-bvh-csg`
- **Transform Gizmo** — Translate / Rotate / Scale with TransformControls
- **Box Selection** — Rubber-band drag to select multiple objects
- **Groups** — Named collections of objects, move as a unit
- **Components** — Reusable definitions with multiple placed instances; edit once, update everywhere; explode back to geometry

### Scene Organization
- **Object Tree** — Hierarchy view with rename, hide/show, lock, delete
- **Layer System** — Create/rename/delete layers, toggle visibility, color coding, per-object assignment
- **Component Library** — Definition list with instance count, place/delete, select-all-instances

### Materials & Rendering
- **PBR Materials** — 23 presets across 6 categories (Wood, Stone, Metal, Plastic, Glass, Other)
- **Material Sliders** — Roughness, metalness, opacity, base color per object
- **Display Modes** — Shaded, Wireframe, Rendered
- **Post-Processing** — Outline pass, Sobel edge detection, bloom (UnrealBloomPass)
- **Tone Mapping** — None, Linear, Reinhard, Cineon, ACES Filmic; exposure control
- **Environment Presets** — Studio (RoomEnvironment), Outdoor, Sunset, City (procedural Sky + PMREMGenerator)
- **Background Control** — Custom background color with fog sync
- **Sun Controls** — Azimuth, elevation, intensity; soft shadows

### Documentation & Collaboration
- **Annotations** — Text labels anchored to 3D positions (CSS2DRenderer)
- **Camera Snapshots** — Save and restore named viewport positions
- **Section Cuts** — Clip scene along X/Y/Z axis with real-time offset slider
- **Viewport Capture** — Export current view as PNG

### Import / Export
- **Save/Load** — `.crab` binary files (MessagePack + embedded debug JSON); auto-detects legacy JSON
- **GLTF Export** — Full scene via Three.js GLTFExporter
- **OBJ Export** — Mesh-only via Three.js OBJExporter
- **STL Export** — Binary STL
- **CSV BOM** — Bill of materials with position, rotation, scale, material, notes
- **Autosave** — 30-second autosave to localStorage; restored on next load

### UI & Productivity
- **Keyboard Shortcuts** — W/E/R/S tools, Ctrl+Z/Y undo/redo, Ctrl+D duplicate, Ctrl+G group, Del delete, Ctrl+A select all, H hide, `?` shortcut reference
- **Shortcut Modal** — Full keyboard reference overlay (`?` or Help menu)
- **Onboarding Wizard** — 5-step first-run guide (localStorage-persisted dismissal)
- **View Presets** — Front, Back, Left, Right, Top, Bottom, Isometric (keys 1/3/7/0)
- **Status Bar** — Live 3D cursor position, selection count, display mode, units
- **Undo/Redo** — 50-step ring buffer

## File Format

`.crab` files use a 12-byte binary header followed by a MessagePack payload:

```
[4 bytes] magic: "CRAB"
[2 bytes] format version (uint16 LE)
[2 bytes] flags (bit 0 = debug JSON present)
[4 bytes] payload length (uint32 LE)
[N bytes] MessagePack-encoded scene data
[M bytes] optional embedded JSON sidecar (debug mode, on by default)
```

The type schema is defined in [`src/lib/io/scene.capnp`](src/lib/io/scene.capnp) (Cap'n Proto). Full Cap'n Proto binary encoding is planned once `capnpc-ts` supports TypeScript 6.

## Project Structure

```
src/
  components/
    layout/       # MenuBar, LeftSidebar, RightSidebar, StatusBar
    panels/       # ObjectTree, LayerPanel, MaterialPanel, AssemblyPanel,
                  # ComponentPanel, AnnotationPanel, SnapshotPanel, LightingPanel
    viewport/     # Viewport (canvas host, event handling)
    overlay/      # ShortcutModal, OnboardingOverlay
  hooks/          # useKeyboard
  lib/
    scene/        # SceneManager (Three.js renderer, sync, post-processing)
    geometry/     # Primitives builder
    csg/          # Boolean operations (three-bvh-csg)
    materials/    # Material presets library
    rendering/    # PostProcessor (EffectComposer chain)
    tools/        # SnapEngine, push-pull tool
    io/           # sceneSerializer (JSON), capnpSerializer (binary), scene.capnp
  store/          # sceneStore, toolStore, uiStore (Zustand)
  types/          # Shared TypeScript interfaces
```

## Roadmap

### Near-term
- [x] Rendering upgrades — tone mapping (ACES/Reinhard/Cineon/Linear), bloom, environment presets (Studio/Outdoor/Sunset/City), background color; HDRI file import and path tracing remain
- [ ] Styles — viewport rendering styles (edge display, face modes, sketchy lines, watermarks, background gradients)
- [ ] Parametric modeling — formula-driven dimensions, constraint fields
- [ ] Configuration system — user preferences, workspace layouts, keybinding overrides

### Platform
- [ ] Plugin system — sandboxed JS plugins with a stable API surface for custom tools, importers, and panels
- [ ] SDK — TypeScript SDK for building plugins and integrations; published as an npm package
- [ ] Versioning — scene version history with named checkpoints and diff view
- [ ] Electron app — desktop wrapper with native file dialogs, OS integration, and offline-first support

### Collaboration
- [ ] Real-time collaboration — multiplayer cursors, shared state via Y.js + WebRTC (peer-to-peer, no server required)
- [ ] Collaboration history — per-user change log, revert to any point

### Geospatial
- [ ] Map import — drop in a base map tile (Google Maps, Leaflet, OpenStreetMap) as a scene floor plane
- [ ] ArcGIS support — import GIS layers (shapefiles, feature services) as 3D geometry and metadata

## License

MIT
