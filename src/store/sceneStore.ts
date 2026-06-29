import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  SceneObject, Layer, CameraSnapshot, SceneSettings,
  PrimitiveType, Vec3, BoxDims, SphereDims, CylinderDims, ConeDims,
  ViewMode, ViewPreset, MousePosition3D, BooleanOp, CSGGeometryData
} from '../types'

const DEFAULT_LAYER: Layer = {
  id: 'default',
  name: 'Default',
  color: '#60a5fa',
  visible: true,
  locked: false,
}

const DEFAULT_SETTINGS: SceneSettings = {
  units: 'metric',
  precision: 3,
  snapEnabled: true,
  snapDistance: 12,
  gridVisible: true,
  axesVisible: true,
  displayMode: 'shaded',
  shadowsEnabled: true,
  outlineEnabled: true,
  sobelEnabled: false,
  aoEnabled: false,
  sunAzimuth: 45,
  sunElevation: 60,
  sunIntensity: 1.2,
}

const LAYER_COLORS = [
  '#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa',
  '#fb7185', '#38bdf8', '#4ade80', '#facc15', '#c084fc',
]

function makeDims(type: PrimitiveType): BoxDims | SphereDims | CylinderDims | ConeDims | Record<string, never> {
  switch (type) {
    case 'box': return { width: 1, height: 1, depth: 1 }
    case 'sphere': return { radius: 0.5 }
    case 'cylinder': return { radius: 0.5, height: 1 }
    case 'cone': return { radius: 0.5, height: 1 }
    case 'csg': return {}
  }
}

interface SceneState {
  sceneName: string
  isDirty: boolean
  objects: Map<string, SceneObject>
  layers: Map<string, Layer>
  layerOrder: string[]
  selectedIds: Set<string>
  activeLayerId: string
  settings: SceneSettings
  snapshots: CameraSnapshot[]
  history: Array<{ objects: Map<string, SceneObject>; layers: Map<string, Layer>; layerOrder: string[] }>
  historyIndex: number
  mousePos3D: MousePosition3D
  viewMode: ViewMode
  viewPreset: ViewPreset

  // Object operations
  addObject: (type: PrimitiveType, position?: Partial<Vec3>) => string
  removeObjects: (ids: string[]) => void
  duplicateObjects: (ids: string[]) => string[]
  updateObject: (id: string, patch: Partial<SceneObject>) => void
  setObjectPosition: (id: string, pos: Vec3) => void
  setObjectRotation: (id: string, rot: Vec3) => void
  setObjectScale: (id: string, scale: Vec3) => void

  // Selection
  selectObject: (id: string, additive?: boolean) => void
  deselectAll: () => void
  selectAll: () => void

  // Layers
  addLayer: () => string
  removeLayer: (id: string) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  setActiveLayer: (id: string) => void
  assignToLayer: (objectIds: string[], layerId: string) => void

  // Boolean operations
  booleanOp: (idA: string, idB: string, op: BooleanOp, csgData: CSGGeometryData) => void

  // Camera snapshots
  addSnapshot: (snap: Omit<CameraSnapshot, 'id'>) => void
  removeSnapshot: (id: string) => void

  // Settings
  updateSettings: (patch: Partial<SceneSettings>) => void

  // View
  setViewMode: (mode: ViewMode) => void
  setViewPreset: (preset: ViewPreset) => void

  // Mouse
  setMousePos3D: (pos: MousePosition3D) => void

  // History (undo/redo)
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // IO
  setSceneName: (name: string) => void
  setDirty: (v: boolean) => void
  newScene: () => void
  loadScene: (objects: SceneObject[], layers: Layer[], layerOrder: string[], settings: SceneSettings) => void
}

let objectCounter = 1

export const useSceneStore = create<SceneState>((set, get) => ({
  sceneName: 'Untitled',
  isDirty: false,
  objects: new Map(),
  layers: new Map([['default', DEFAULT_LAYER]]),
  layerOrder: ['default'],
  selectedIds: new Set(),
  activeLayerId: 'default',
  settings: DEFAULT_SETTINGS,
  snapshots: [],
  history: [],
  historyIndex: -1,
  mousePos3D: { x: 0, y: 0, z: 0, valid: false },
  viewMode: 'perspective',
  viewPreset: 'iso',

  addObject: (type, position) => {
    const id = uuidv4()
    const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${objectCounter++}`
    const { activeLayerId } = get()
    const obj: SceneObject = {
      id,
      name,
      type,
      layerId: activeLayerId,
      visible: true,
      locked: false,
      color: '#60a5fa',
      opacity: 1,
      roughness: 0.7,
      metalness: 0.1,
      position: { x: position?.x ?? 0, y: position?.y ?? 0, z: position?.z ?? 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: makeDims(type),
      metadata: {},
    }
    set(state => {
      const objects = new Map(state.objects)
      objects.set(id, obj)
      return { objects, isDirty: true }
    })
    get().pushHistory()
    return id
  },

  removeObjects: (ids) => {
    get().pushHistory()
    set(state => {
      const objects = new Map(state.objects)
      const selectedIds = new Set(state.selectedIds)
      ids.forEach(id => { objects.delete(id); selectedIds.delete(id) })
      return { objects, selectedIds, isDirty: true }
    })
  },

  duplicateObjects: (ids) => {
    const { objects } = get()
    const newIds: string[] = []
    get().pushHistory()
    set(state => {
      const newObjects = new Map(state.objects)
      ids.forEach(id => {
        const orig = objects.get(id)
        if (!orig) return
        const newId = uuidv4()
        newIds.push(newId)
        newObjects.set(newId, {
          ...orig,
          id: newId,
          name: orig.name + ' Copy',
          position: { x: orig.position.x + 0.5, y: orig.position.y, z: orig.position.z + 0.5 },
        })
        objectCounter++
      })
      return { objects: newObjects, selectedIds: new Set(newIds), isDirty: true }
    })
    return newIds
  },

  updateObject: (id, patch) => {
    set(state => {
      const objects = new Map(state.objects)
      const obj = objects.get(id)
      if (!obj) return {}
      objects.set(id, { ...obj, ...patch })
      return { objects, isDirty: true }
    })
  },

  setObjectPosition: (id, pos) => {
    set(state => {
      const objects = new Map(state.objects)
      const obj = objects.get(id)
      if (!obj) return {}
      objects.set(id, { ...obj, position: pos })
      return { objects, isDirty: true }
    })
  },

  setObjectRotation: (id, rot) => {
    set(state => {
      const objects = new Map(state.objects)
      const obj = objects.get(id)
      if (!obj) return {}
      objects.set(id, { ...obj, rotation: rot })
      return { objects, isDirty: true }
    })
  },

  setObjectScale: (id, scale) => {
    set(state => {
      const objects = new Map(state.objects)
      const obj = objects.get(id)
      if (!obj) return {}
      objects.set(id, { ...obj, scale })
      return { objects, isDirty: true }
    })
  },

  selectObject: (id, additive = false) => {
    set(state => {
      if (additive) {
        const s = new Set(state.selectedIds)
        if (s.has(id)) s.delete(id); else s.add(id)
        return { selectedIds: s }
      }
      return { selectedIds: new Set([id]) }
    })
  },

  deselectAll: () => set({ selectedIds: new Set() }),

  selectAll: () => {
    set(state => ({ selectedIds: new Set(state.objects.keys()) }))
  },

  addLayer: () => {
    const id = uuidv4()
    const { layerOrder } = get()
    const color = LAYER_COLORS[layerOrder.length % LAYER_COLORS.length]
    const layer: Layer = {
      id,
      name: `Layer ${layerOrder.length + 1}`,
      color,
      visible: true,
      locked: false,
    }
    set(state => ({
      layers: new Map(state.layers).set(id, layer),
      layerOrder: [...state.layerOrder, id],
    }))
    return id
  },

  removeLayer: (id) => {
    if (id === 'default') return
    set(state => {
      const layers = new Map(state.layers)
      layers.delete(id)
      const objects = new Map(state.objects)
      objects.forEach((obj, oid) => {
        if (obj.layerId === id) objects.set(oid, { ...obj, layerId: 'default' })
      })
      return {
        layers,
        objects,
        layerOrder: state.layerOrder.filter(l => l !== id),
        activeLayerId: state.activeLayerId === id ? 'default' : state.activeLayerId,
      }
    })
  },

  updateLayer: (id, patch) => {
    set(state => {
      const layers = new Map(state.layers)
      const layer = layers.get(id)
      if (!layer) return {}
      layers.set(id, { ...layer, ...patch })
      return { layers }
    })
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  assignToLayer: (objectIds, layerId) => {
    set(state => {
      const objects = new Map(state.objects)
      objectIds.forEach(id => {
        const obj = objects.get(id)
        if (obj) objects.set(id, { ...obj, layerId })
      })
      return { objects, isDirty: true }
    })
  },

  booleanOp: (idA, idB, op, csgData) => {
    get().pushHistory()
    set(state => {
      const objects = new Map(state.objects)
      const objA = objects.get(idA)
      const objB = objects.get(idB)
      if (!objA || !objB) return {}

      const newId = uuidv4()
      const opNames = { union: 'Union', subtract: 'Subtract', intersect: 'Intersect' }
      const newObj: SceneObject = {
        id: newId,
        name: `${opNames[op]} (${objA.name}, ${objB.name})`,
        type: 'csg',
        layerId: objA.layerId,
        visible: true,
        locked: false,
        color: objA.color,
        opacity: objA.opacity,
        roughness: objA.roughness,
        metalness: objA.metalness,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        dimensions: {},
        metadata: {},
        csgData,
      }

      objects.delete(idA)
      objects.delete(idB)
      objects.set(newId, newObj)

      const selectedIds = new Set([newId])
      return { objects, selectedIds, isDirty: true }
    })
  },

  addSnapshot: (snap) => {
    const id = uuidv4()
    set(state => ({ snapshots: [...state.snapshots, { ...snap, id }] }))
  },

  removeSnapshot: (id) => {
    set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) }))
  },

  updateSettings: (patch) => {
    set(state => ({ settings: { ...state.settings, ...patch } }))
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setViewPreset: (preset) => set({ viewPreset: preset }),
  setMousePos3D: (pos) => set({ mousePos3D: pos }),

  pushHistory: () => {
    const { objects, layers, layerOrder, history, historyIndex } = get()
    const snapshot = {
      objects: new Map(objects),
      layers: new Map(layers),
      layerOrder: [...layerOrder],
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(snapshot)
    set({ history: newHistory.slice(-50), historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({
      objects: new Map(prev.objects),
      layers: new Map(prev.layers),
      layerOrder: [...prev.layerOrder],
      historyIndex: historyIndex - 1,
      isDirty: true,
      selectedIds: new Set(),
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({
      objects: new Map(next.objects),
      layers: new Map(next.layers),
      layerOrder: [...next.layerOrder],
      historyIndex: historyIndex + 1,
      isDirty: true,
      selectedIds: new Set(),
    })
  },

  setSceneName: (name) => set({ sceneName: name }),
  setDirty: (v) => set({ isDirty: v }),

  newScene: () => {
    objectCounter = 1
    set({
      sceneName: 'Untitled',
      isDirty: false,
      objects: new Map(),
      layers: new Map([['default', DEFAULT_LAYER]]),
      layerOrder: ['default'],
      selectedIds: new Set(),
      activeLayerId: 'default',
      snapshots: [],
      history: [],
      historyIndex: -1,
    })
  },

  loadScene: (objects, layers, layerOrder, settings) => {
    const objMap = new Map(objects.map(o => [o.id, o]))
    const layerMap = new Map(layers.map(l => [l.id, l]))
    set({
      objects: objMap,
      layers: layerMap,
      layerOrder,
      settings,
      selectedIds: new Set(),
      history: [],
      historyIndex: -1,
      isDirty: false,
    })
  },
}))
