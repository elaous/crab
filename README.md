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
- [x] Styles — edge overlay, flat shading, x-ray, gradient background, five one-click style presets (Default/Sketchy/Flat/X-Ray/Blueprint)
- [x] Parametric modeling — named parameters with formula expressions drive object dimensions; ordered dependency chain; safe evaluator with math functions
- [x] Configuration system — user preferences persisted to localStorage, preferences modal, export/import config, keybinding overrides

### Platform
- [x] Plugin system — sandboxed Web Worker plugins with `api.scene.*` surface, `registerTool()`, `log()`; built-in examples; install from file
- [ ] SDK — TypeScript SDK for building plugins and integrations; published as an npm package
- [x] Versioning — named scene checkpoints (`Ctrl+Shift+S`), diff view (added/removed/modified), restore with undo safety
- [x] Electron app — desktop wrapper with native file dialogs (save/open via OS dialog), native app menu, cross-platform builds (dmg/nsis/AppImage) via electron-builder

### Collaboration
- [x] Real-time collaboration — multiplayer cursors, shared state via Y.js + WebRTC (peer-to-peer, no server required)
- [ ] Self-hosting — Docker Compose (local), Encore, and Crossplane/Minikube deployment targets; storage abstraction (browser localStorage ↔ Prisma-backed database)
- [ ] Share & control permissions — invite links, read-only vs editor roles, per-room access control list
- [ ] Collaboration history — per-user change log, revert to any point

### Geospatial
- [ ] Map import — drop in a base map tile (Google Maps, Leaflet, OpenStreetMap) as a scene floor plane
- [ ] ArcGIS support — import GIS layers (shapefiles, feature services) as 3D geometry and metadata

## Self-Hosting

CrabCAD is designed to run entirely in the browser (no server required) and can also be deployed on-premises with a backend for persistent scene storage, multi-user auth, and collaboration relay. Three deployment targets are provided:

### Storage abstraction

| Mode | When to use | Implementation |
|------|-------------|----------------|
| `localStore` | Single-user / offline / Electron | Browser localStorage + `.crab` file downloads (default) |
| `database` | Multi-user / self-hosted | Prisma ORM → PostgreSQL; scenes stored as binary blobs |

The storage adapter is selected at build time via `VITE_STORAGE=local` (default) or `VITE_STORAGE=db`. The `api/` layer exposes the same `saveScene / loadScene / listScenes` interface regardless of backend.

---

### Docker Compose (local)

The simplest self-hosted setup — a single `docker-compose.yml` runs the static frontend behind nginx, a lightweight Node API server, and a PostgreSQL database.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: crab
      POSTGRES_PASSWORD: crab
      POSTGRES_DB: crabcad
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://crab:crab@db:5432/crabcad
      VITE_STORAGE: db
    depends_on: [db]
    ports: ["3001:3001"]

  web:
    build: .
    environment:
      VITE_API_URL: http://api:3001
      VITE_STORAGE: db
    ports: ["8080:80"]
    depends_on: [api]

volumes:
  pgdata:
```

```bash
docker compose up -d
# App at http://localhost:8080
```

Schema is managed by Prisma migrations (`api/prisma/schema.prisma`). Run `docker compose exec api npx prisma migrate deploy` on first start.

---

### Encore (managed cloud)

[Encore](https://encore.dev) provides type-safe services with zero-config deployments. The `encore/` directory contains the backend service definition.

```typescript
// encore/scenes/scenes.ts
import { api } from "encore.dev/api"
import { SQLDatabase } from "encore.dev/storage/sqldb"

const db = new SQLDatabase("crabcad", { migrations: "./migrations" })

export const saveScene = api({ method: "POST", path: "/scenes" },
  async (req: { id: string; name: string; data: string }) => {
    await db.exec`
      INSERT INTO scenes (id, name, data, updated_at)
      VALUES (${req.id}, ${req.name}, ${req.data}, NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
        data = EXCLUDED.data, updated_at = NOW()
    `
    return { ok: true }
  }
)

export const loadScene = api({ method: "GET", path: "/scenes/:id" },
  async ({ id }: { id: string }) => {
    const row = await db.queryRow`SELECT data FROM scenes WHERE id = ${id}`
    if (!row) throw new Error("Scene not found")
    return { data: row.data as string }
  }
)
```

```bash
# Local development
encore run

# Deploy to Encore Cloud (or self-hosted Encore runner)
encore deploy
```

---

### Crossplane / Minikube (Kubernetes)

For teams running Kubernetes, the `k8s/` directory provides Crossplane composite resource definitions that provision a PostgreSQL instance alongside the CrabCAD deployment.

```yaml
# k8s/crossplane/crabcad-xrd.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xcrabcadinstances.crabcad.io
spec:
  group: crabcad.io
  names:
    kind: XCrabCADInstance
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                storageGB: { type: integer, default: 10 }
                replicas:  { type: integer, default: 1 }
```

```yaml
# k8s/crossplane/composition.yaml  (excerpt)
resources:
  - name: postgresql
    base:
      apiVersion: postgresql.cnpg.io/v1
      kind: Cluster
      spec:
        instances: 1
        storage:
          size: 10Gi
  - name: crabcad-deployment
    base:
      apiVersion: apps/v1
      kind: Deployment
      spec:
        template:
          spec:
            containers:
              - name: api
                image: ghcr.io/elaous/crab-api:latest
                env:
                  - name: VITE_STORAGE
                    value: db
```

```bash
# Local with Minikube
minikube start
kubectl apply -f k8s/crossplane/

# Claim an instance
kubectl apply -f k8s/crossplane/claim.yaml
```

Full manifests (Deployment, Service, Ingress, ConfigMap, HorizontalPodAutoscaler) are in [`k8s/`](k8s/).

---

> **Note:** The `api/`, `encore/`, and `k8s/` directories and the Prisma schema are planned — the browser-only build works today with no backend required.

## License

MIT
