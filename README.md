# Facet 3D — Open-Source 3D Modeling Suite

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
| File Format | `.facet` — MessagePack binary |
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
- **Save/Load** — `.facet` binary files (MessagePack); auto-detects legacy JSON
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

`.facet` files use a 12-byte binary header followed by a MessagePack payload:

```
[4 bytes] magic: "FCET" (legacy .crab files use "CRAB", still readable)
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
sdk/              # @facet3d/sdk — TypeScript plugin SDK
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

### Recently Implemented

- [x] **Follow Me tool** — `sweepProfile()` sweeps a box cross-section along a CatmullRom path (ToolPanel shortcut J); `latheProfile()` for revolution
- [x] **Draw-on-face** — Draw tool ray-casts against mesh faces; first hit locks a `THREE.Plane` so all subsequent points snap to that face surface
- [x] **Eraser (X)** — Deletes hovered objects by click (whole-object mode; sub-face deletion is a sub-object selection problem deferred to roadmap)
- [x] **IFC import** — Text-based STEP regex parser handles IFC 2x3 building elements (Wall, Slab, Column, Beam, Door, Window, Space, Stair, Roof) without WASM; import via File → Import
- [x] **First-person walk-through (F)** — PointerLock API + WASD/Q/E movement; `camera.rotation.order='YXZ'` for correct FPS look; `Esc` exits
- [x] **Interactive 2D Layout view** — SVG top-down floor plan panel (tab "2D") with scroll-to-zoom, middle-drag pan, dimension labels, click-to-select
- [x] **Component catalog search** — name filter input in Catalog tab (already existed, now fully visible with cross-category search)
- [x] **Import from 3D Warehouse URL** — paste any public .glb/.gltf URL; File → Import from 3D Warehouse URL
- [x] **Headless CLI render** — `scripts/render.ts` (Playwright + headless Chromium): `npx tsx scripts/render.ts scene.facet --view iso --out render.png`
- [x] **Align to Face** — hover over a surface, click "Align to Face" in Geometry Ops to snap selected object to that position
- [x] **Sub-object face selection** — `faceselect` tool (F2) highlights individual triangular faces with blue overlay; selects parent object; hover preview
- [x] **Torus & Helix primitives** — curved geometry via `THREE.TorusGeometry` and custom CatmullRom + `THREE.ExtrudeGeometry` helix builder
- [x] **DXF import** — ASCII tokenizer handles LINE, ARC, CIRCLE, LWPOLYLINE, 3DFACE entities; converts to CSGGeometryData
- [x] **FBX import** — via `three/addons/loaders/FBXLoader.js`; traverses mesh children into scene objects
- [x] **Solid Inspector** — edge-sharing analysis: reports duplicate vertices, degenerate triangles, open edges, and non-manifold edges per mesh
- [x] **Map import (OSM)** — fetch real-world tile textures from OpenStreetMap, positioned at true metre scale per zoom level
- [x] **UV texture editor** — per-object UV offset, scale, and rotation controls with `THREE.RepeatWrapping`; set-origin helpers (corner/center)
- [x] **Collaboration history log** — rolling 200-entry per-session change log (add/move/update/delete) with color-coded action types
- [x] **Purge Unused** — removes empty layers (except Default) and component definitions with zero placed instances; reports count
- [x] **Print / Page Layout** — A3 landscape HTML page with title block, SVG orthographic views, and BOM table; opens in new window and auto-prints
- [x] **Role-based access control types** — canonical `UserRole = 'owner' | 'editor' | 'viewer'` in types; ShareModal wired to this type
- [x] **LOD / GPU instancing optimizer** — `buildInstancedMeshes()` groups component instances by definition into `THREE.InstancedMesh` for reduced draw calls

### Roadmap

- [ ] **Import price sheet** — load a CSV of SKU / unit-cost rows and link each to a Smart Material or Smart Component definition automatically
- [ ] **SketchUp importer** — parse `.skp` binary format and convert geometry + materials; investigate Trimble SDK bridge
- [ ] **SDK npm package** — publish `@facet3d/sdk` to npm for third-party plugin development
- [ ] **Universal updater** — auto-update across Electron and future desktop targets
- [ ] **Agentic drawing** — natural-language scene generation with pluggable LLM backend
- [ ] **ArcGIS support** — import GIS layers (shapefiles, feature services) as 3D geometry
- [ ] **Transparency Manifest** — machine-readable declaration of every browser API the app uses
- [ ] **Cap'n Proto binary encoding** — full capnp binary once `capnpc-ts` supports TypeScript 6
- [ ] **Scan / point cloud import** — load `.las` / `.ply` point cloud files as a textured billboard mesh
- [ ] **Mobile / touch input** — pinch-to-zoom, two-finger orbit, tap-to-select on iOS/Android browsers
- [ ] **Accessibility (a11y)** — ARIA labels, keyboard-navigable panels, high-contrast theme, reduced-motion option
- [ ] **CI/CD test coverage** — unit tests for geometry, serializer, formula evaluator; Playwright E2E smoke tests; coverage report in CI
- [ ] **Material physics** — density, tensile strength, thermal conductivity metadata on material presets; drives structural BOM analysis
- [ ] **Clipping volumes** — box/sphere region clip to hide geometry outside the clipping zone; non-destructive live preview
- [ ] **Eraser for individual faces/edges** — in faceselect mode, delete the selected face and re-triangulate the mesh
- [ ] **Set material origin** — click-to-place UV coordinate origin on mesh surface; drives `uvOffset` from picked point

## Self-Hosting

Facet 3D works entirely in the browser (no server required) and can also be deployed with a backend for persistent storage, multi-user auth, and collaboration relay.

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
