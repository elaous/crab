# CrabCAD — Open-Source 3D Modeling Suite

A browser-based 3D modeling environment inspired by SketchUp, built with TypeScript, React, Three.js, and Zustand. Works offline with no server required; optionally self-hosted with multi-user persistence.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6 |
| UI | React 19 |
| Build | Vite 8 |
| 3D Rendering | Three.js 0.185 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| File Format | `.crab` — MessagePack binary |
| Testing | Vitest |

## Getting Started

```bash
npm install
npm run dev      # development server (http://localhost:5173)
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
- **Mirror** — Mirror selected objects across X/Y/Z axis (negates scale)
- **Array** — Rectangular and radial array with count and spacing
- **Offset Face** — Inset/outset selected face by distance

### Drawing Tools
- **Draw (D)** — Freehand polyline/polygon drawing mode with inference guides (X/Y/Z axes)
- **Arc (A)** — Three-point arc tool
- **Polygon (G)** — Regular polygon by center + radius
- **Eraser (X)** — Object deletion by click
- **Tape Measure (T)** — Click-to-click distance measurement with CSS2D overlay label
- **Protractor (Q)** — Three-point angle measurement

### Snapping & Inference
- **Smart Snap** — Vertex, midpoint, face-center, edge-point snap with visual indicator
- **Angle Snap** — 15° / 45° / 90° increments
- **Inference Guides** — Real-time X/Y/Z axis guide lines while drawing
- **Grid Snap** — Configurable snap distance

### Scene Organization
- **Object Tree** — Hierarchy view with rename, hide/show, lock, delete
- **Layer System** — Create/rename/delete layers, toggle visibility, color coding, per-object assignment
- **Component Library** — Definition list with instance count, place/delete, select-all-instances
- **Assemblies** — Named sub-groups within the scene graph
- **Annotations** — Text and dimension labels anchored to 3D positions (CSS2DRenderer)
- **Camera Snapshots** — Save and restore named viewport positions

### Materials & Rendering
- **PBR Materials** — 23 built-in presets across 6 categories (Wood, Stone, Metal, Plastic, Glass, Other)
- **Custom Materials** — Create and save your own materials with optional texture image import
- **Material Sliders** — Roughness, metalness, opacity, base color per object
- **Smart Materials** — Optional physical metadata: SKU, manufacturer, unit cost, unit of measure, coverage per unit — drives the Takeoff / BOM panel
- **Display Modes** — Shaded, Wireframe, Rendered
- **Styles** — Edge overlay, flat shading, X-ray, gradient background; five one-click presets (Default / Sketchy / Flat / X-Ray / Blueprint)
- **Post-Processing** — Outline pass, Sobel edge detection, bloom (UnrealBloomPass)
- **Tone Mapping** — None, Linear, Reinhard, Cineon, ACES Filmic; exposure control
- **Environment Presets** — Studio, Outdoor, Sunset, City; HDRI import
- **Sun Controls** — Azimuth, elevation, intensity; soft shadows
- **Screenshot** — Capture viewport at 1×, 2×, or 4× resolution

### Catalog
- **Component Catalog** — 7 categories (Architectural, Furniture, Mechanical, 2D Materials, 2D Furniture, Hardware, Appliances) with 39+ pre-built items
- **2D Floor Plan Items** — Flat-box representations of flooring, tiles, furniture, fixtures, appliances for top-down layout design

### Quantity Takeoff / BOM
- **Takeoff Panel** — Analyzes all visible scene objects and aggregates material quantities by surface area (with 10% waste factor) and component instance counts
- **Cost Estimates** — Multiplies quantities by unit cost from Smart Material/Component metadata
- **CSV Export** — Download the full takeoff as a spreadsheet
- **Smart Components** — Component definitions can carry SKU, manufacturer, and unit cost; instances are automatically counted in the BOM

### Documentation & Collaboration
- **Section Cuts** — Clip scene along X/Y/Z axis or arbitrary angle with real-time offset slider
- **Real-time Collaboration** — Multiplayer cursors, shared state via Y.js + WebRTC (peer-to-peer, no server required)
- **Versioning** — Named scene checkpoints (`Ctrl+Shift+S`), diff view (added/removed/modified), restore with undo safety
- **WebXR** — Enter VR/AR mode on compatible headsets

### Import / Export
- **Save/Load** — `.crab` binary files (MessagePack); auto-detects legacy JSON
- **GLTF Export** — Full scene via Three.js GLTFExporter
- **OBJ Export** — Mesh-only via Three.js OBJExporter
- **STL Export** — Binary STL with actual mesh triangulation
- **IFC Export** — IFC 2x3 STEP format for BIM workflows
- **SVG Export** — 2D orthographic drawings (Top, Front, Right, or all four views)
- **CSV BOM** — Bill of materials with position, rotation, scale, material, notes
- **3D Import** — GLTF / GLB / OBJ / STL via Three.js loaders
- **Share Links** — Generate a shareable URL with viewer/editor permissions; `?share=TOKEN` loads the shared scene

### UI & Productivity
- **Keyboard Shortcuts** — W/E/R/S tools, D/A/G/X drawing tools, T/Q measurement, Ctrl+Z/Y undo/redo, Ctrl+D duplicate, Ctrl+G group, Del delete, Ctrl+A select all, H hide, `?` shortcut reference
- **Parametric Modeling** — Named parameters with formula expressions drive object dimensions
- **Plugin System** — Sandboxed Web Worker plugins with `api.scene.*` surface, `registerTool()`, `log()`
- **Electron App** — Desktop wrapper with native file dialogs, OS app menu, cross-platform builds
- **Onboarding Wizard** — 5-step first-run guide
- **View Presets** — Front/Back/Left/Right/Top/Bottom/Isometric (keys 1/3/7/0)
- **Autosave** — 30-second autosave to localStorage
- **Undo/Redo** — 50-step ring buffer

## File Format

`.crab` files use a 12-byte binary header followed by a MessagePack payload:

```
[4 bytes] magic: "CRAB"
[2 bytes] format version (uint16 LE)
[2 bytes] flags (bit 0 = debug JSON present)
[4 bytes] payload length (uint32 LE)
[N bytes] MessagePack-encoded scene data
[M bytes] optional embedded JSON sidecar (debug mode)
```

## Project Structure

```
src/
  components/
    layout/       # MenuBar, LeftSidebar, RightSidebar, StatusBar
    panels/       # ObjectTree, LayerPanel, MaterialPanel, BOMPanel, AssemblyPanel,
                  # ComponentPanel, AnnotationPanel, SnapshotPanel, LightingPanel,
                  # CatalogPanel, ToolPanel, ParametricPanel, StylesPanel, PluginsPanel
    viewport/     # Viewport (canvas host, event handling)
    overlay/      # ShortcutModal, OnboardingOverlay, ShareModal, ScenePickerModal
  hooks/          # useKeyboard, useElectronMenu
  lib/
    scene/        # SceneManager (Three.js renderer, sync, post-processing, WebXR)
    geometry/     # Primitives builder
    csg/          # Boolean operations (three-bvh-csg)
    materials/    # Material presets library (with Smart Material metadata)
    rendering/    # PostProcessor (EffectComposer chain)
    tools/        # SnapEngine, DrawEngine, InferenceEngine, MeasureEngine
    io/           # sceneSerializer, capnpSerializer, ifcExporter, svgExporter, modelImporter
    storage/      # localAdapter, dbAdapter, fs adapter
    collaboration/# CollabManager (Y.js + WebRTC)
    formula/      # Parametric expression evaluator
    plugins/      # PluginHost (Web Worker sandbox)
  store/          # sceneStore, toolStore, uiStore, collabStore, pluginStore (Zustand)
  types/          # Shared TypeScript interfaces
electron/         # Electron main process, native menus, IPC
sdk/              # @crabcad/sdk — TypeScript plugin SDK
api/              # Express 5 + Prisma 6 REST API (for self-hosted mode)
```

## Roadmap

### Implemented

- [x] Primitives (Box, Sphere, Cylinder, Cone) with live dimension editing
- [x] Push/Pull face extrusion
- [x] Boolean CSG (Union, Subtract, Intersect)
- [x] Transform Gizmo (Translate, Rotate, Scale)
- [x] Box selection, Groups, Components, Assemblies
- [x] Mirror and Array tools
- [x] Drawing tools — Draw, Arc, Polygon, Eraser
- [x] Tape Measure and Protractor with overlay labels
- [x] Smart Snapping — vertex, midpoint, face-center, edge-point, angle snap
- [x] Inference guides (X/Y/Z axis lines while drawing)
- [x] Object Tree with visibility, lock, rename, delete
- [x] Layer system — create, rename, delete, visibility, color
- [x] 23 PBR material presets + custom material creator
- [x] Custom materials with texture image import
- [x] **Smart Materials** — physical metadata (SKU, cost, unit of measure, coverage) on materials
- [x] **Smart Components** — SKU, manufacturer, unit cost on component definitions
- [x] **Takeoff / BOM Panel** — quantity takeoff from surface areas + component counts, CSV export
- [x] Component Catalog — 7 categories, 39+ items including 2D floor plan shapes
- [x] 2D floor plan items — materials, furniture, hardware, appliances
- [x] Styles — edge overlay, flat shading, X-ray, gradient background, 5 presets
- [x] Post-processing — bloom, outline, Sobel edge, ambient occlusion
- [x] Tone mapping (ACES, Reinhard, Cineon, Linear) + exposure
- [x] Environment presets (Studio, Outdoor, Sunset, City) + HDRI import
- [x] Section cuts (X/Y/Z + angle offset)
- [x] Annotations (text + dimension labels, CSS2DRenderer)
- [x] Camera snapshots
- [x] Parametric modeling — named parameters with formula expressions
- [x] Versioning / history checkpoints with diff view
- [x] Real-time collaboration (Y.js + WebRTC)
- [x] Plugin system (sandboxed Web Workers)
- [x] GLTF / OBJ / STL / IFC export
- [x] SVG 2D orthographic export (Top/Front/Right/all views)
- [x] 3D import (GLTF, GLB, OBJ, STL)
- [x] Share links with viewer/editor permissions
- [x] Screenshot (1×/2×/4×)
- [x] WebXR (VR/AR)
- [x] Electron desktop app with native file dialogs
- [x] Docker Compose self-hosting setup
- [x] Storage adapters (localStorage, filesystem, Prisma + PostgreSQL)
- [x] Keyboard shortcuts + shortcut reference modal
- [x] Onboarding wizard
- [x] Autosave to localStorage

### In Progress / Near-term

- [ ] **Follow Me tool** — sweep a face profile along a selected path (requires edge/path selection)
- [ ] **Draw-on-face** — auto-fill enclosed polyline drawn on an existing face into a new face mesh
- [ ] **Eraser for edges/faces** — currently deletes whole objects; needs sub-object selection mode
- [ ] **IFC import** — round-trip IFC 2x3/4 loading into the scene graph (export done, import pending)
- [ ] **First-person walk-through** — WASD + mouse-look navigation mode for interior walkthroughs
- [ ] **Interactive 2D layout view** — orthographic top-down canvas mode with room labels and dimensions overlay

### Platform / Future

- [ ] **SketchUp importer** — parse `.skp` files and convert geometry + materials
- [ ] **SDK npm package** — publish `@crabcad/sdk` to npm for third-party plugin development
- [ ] **Universal updater** — auto-update across Electron and future desktop targets
- [ ] **Component library tagging/search** — tag catalog items, search by name or category
- [ ] **Agentic drawing** — natural-language scene generation with pluggable LLM backend
- [ ] **Map import** — drop in a base map tile (OSM / Google Maps) as a scene floor plane
- [ ] **ArcGIS support** — import GIS layers (shapefiles, feature services) as 3D geometry
- [ ] **Transparency Manifest** — machine-readable declaration of every browser API the app uses
- [ ] **Collaboration history** — per-user change log, revert to any point
- [ ] **Cap'n Proto binary encoding** — full capnp binary once `capnpc-ts` supports TypeScript 6

## Self-Hosting

CrabCAD works entirely in the browser (no server required) and can also be deployed with a backend for persistent storage, multi-user auth, and collaboration relay.

### Storage adapters

| Adapter | `VITE_STORAGE` | When to use |
|---------|---------------|-------------|
| **Browser localStorage** | `local` *(default)* | Single-user, offline, Electron |
| **Filesystem** | `fs` | Electron / Node CLI / CI |
| **Database (Prisma)** | `db` | Multi-user, self-hosted |

### Docker Compose

```bash
docker compose up -d
# App at http://localhost:8080
# Run migrations: docker compose exec api npx prisma migrate deploy
```

See `docker-compose.yml` for full configuration (nginx + Node API + PostgreSQL).

## License

MIT
