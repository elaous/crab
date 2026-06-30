import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  SceneObject, Layer, CameraSnapshot, SceneSettings,
  PrimitiveType, Vec3, BoxDims, SphereDims, CylinderDims, ConeDims, LineDims,
  ViewMode, ViewPreset, MousePosition3D, BooleanOp, CSGGeometryData,
  Annotation, Assembly, ComponentDef, Parameter, SceneVersion,
} from '../types'
import { evaluateFormula } from '../lib/formula/evaluator'

const DEFAULT_LAYER: Layer = {
  id: 'default',
  name: 'Default',
  color: '#60a5fa',
  visible: true,
  locked: false,
}

export const DEFAULT_SETTINGS: SceneSettings = {
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
  sectionEnabled: false,
  sectionAxis: 'y' as const,
  sectionOffset: 0,
  sectionAngle: 0,
  toneMapping: 'aces' as const,
  exposure: 1.0,
  bloomEnabled: false,
  bloomStrength: 0.4,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  envPreset: 'studio' as const,
  envIntensity: 1.0,
  bgColor: '#16213e',
  stylePreset: 'default' as const,
  edgesVisible: true,
  edgeColor: '#1e293b',
  flatShading: false,
  xrayMode: false,
  bgGradient: false,
  bgColorTop: '#0f2027',
}

const LAYER_COLORS = [
  '#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa',
  '#fb7185', '#38bdf8', '#4ade80', '#facc15', '#c084fc',
]

function makeDims(type: PrimitiveType): BoxDims | SphereDims | CylinderDims | ConeDims | LineDims | Record<string, never> {
  switch (type) {
    case 'box': return { width: 1, height: 1, depth: 1 }
    case 'sphere': return { radius: 0.5 }
    case 'cylinder': return { radius: 0.5, height: 1 }
    case 'cone': return { radius: 0.5, height: 1 }
    case 'line': return { length: 1 }
    case 'csg': return {}
    case 'component-instance': return {}
    case 'imported': return {}
  }
}

interface SceneState {
  sceneId: string
  sceneName: string
  isDirty: boolean
  objects: Map<string, SceneObject>
  layers: Map<string, Layer>
  layerOrder: string[]
  assemblies: Map<string, Assembly>
  assemblyOrder: string[]
  componentDefs: Map<string, ComponentDef>
  componentDefOrder: string[]
  parameters: Map<string, Parameter>
  parameterOrder: string[]
  selectedIds: Set<string>
  activeLayerId: string
  settings: SceneSettings
  snapshots: CameraSnapshot[]
  annotations: Map<string, Annotation>
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

  // Component definitions
  createComponentFromSelected: (name?: string) => string | null
  instantiateComponent: (defId: string, position?: Partial<Vec3>) => string
  updateComponentDef: (defId: string, patch: Partial<Omit<ComponentDef, 'id'>>) => void
  deleteComponentDef: (defId: string) => void
  renameComponentDef: (defId: string, name: string) => void
  explodeInstance: (instanceId: string) => void

  // Assemblies
  createAssembly: (name?: string, objectIds?: string[]) => string
  dissolveAssembly: (id: string) => void
  renameAssembly: (id: string, name: string) => void
  addToAssembly: (assemblyId: string, objectIds: string[]) => void
  removeFromAssembly: (assemblyId: string, objectIds: string[]) => void
  selectAssemblyObjects: (assemblyId: string) => void
  moveAssembly: (assemblyId: string, delta: Vec3) => void

  // Annotations
  addAnnotation: (ann: Omit<Annotation, 'id'>) => string
  removeAnnotation: (id: string) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void

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

  // Parameters
  addParameter: (name?: string) => string
  removeParameter: (id: string) => void
  updateParameter: (id: string, patch: { name?: string; expression?: string }) => void
  setDimensionExpression: (objectId: string, dimKey: string, expr: string | null) => void
  getParamContext: () => Record<string, number>

  // IO
  setSceneName: (name: string) => void
  setDirty: (v: boolean) => void
  newScene: () => void
  loadScene: (objects: SceneObject[], layers: Layer[], layerOrder: string[], settings: SceneSettings, annotations?: Annotation[], assemblies?: Assembly[], componentDefs?: ComponentDef[], parameters?: Parameter[]) => void

  // Mirror / Array / Import
  mirrorObjects: (ids: string[], axis: 'x' | 'y' | 'z') => void
  arrayObjects: (ids: string[], count: number, spacing: Vec3) => string[]
  importObjects: (objs: SceneObject[]) => void

  // Remote collaboration sync — bypass history and collab echo
  _remoteSetObject: (id: string, obj: SceneObject) => void
  _remoteDeleteObject: (id: string) => void

  // Geometry ops
  offsetSelectedFace: (distance: number) => void
  sweepFollowMe: (profileId: string, pathPoints: Vec3[]) => void

  // Versioning
  versions: SceneVersion[]
  createVersion: (name?: string) => string
  restoreVersion: (id: string) => void
  deleteVersion: (id: string) => void
  renameVersion: (id: string, name: string) => void
}

let objectCounter = 1

const ASSEMBLY_COLORS = [
  '#f472b6', '#a78bfa', '#34d399', '#fb923c', '#38bdf8', '#facc15',
]

const COMPONENT_COLORS = [
  '#e879f9', '#818cf8', '#2dd4bf', '#f97316', '#06b6d4', '#eab308',
]

let assemblyCounter = 1
let componentCounter = 1
let paramCounter = 1

function buildParamContext(parameters: Map<string, Parameter>): Record<string, number> {
  const ctx: Record<string, number> = {}
  parameters.forEach(p => { ctx[p.name] = p.value })
  return ctx
}

function applyDimExprs(objects: Map<string, SceneObject>, ctx: Record<string, number>): Map<string, SceneObject> | null {
  let changed = false
  const next = new Map(objects)
  next.forEach((obj, id) => {
    const exprs = obj.dimensionExpressions
    if (!exprs || Object.keys(exprs).length === 0) return
    const newDims = { ...obj.dimensions } as Record<string, number>
    let dimChanged = false
    Object.entries(exprs).forEach(([key, expr]) => {
      try {
        const val = evaluateFormula(expr, ctx)
        if (newDims[key] !== val) { newDims[key] = val; dimChanged = true }
      } catch { /* keep existing */ }
    })
    if (dimChanged) { next.set(id, { ...obj, dimensions: newDims as typeof obj.dimensions }); changed = true }
  })
  return changed ? next : null
}

export const useSceneStore = create<SceneState>((set, get) => ({
  sceneId: uuidv4(),
  sceneName: 'Untitled',
  isDirty: false,
  objects: new Map(),
  layers: new Map([['default', DEFAULT_LAYER]]),
  layerOrder: ['default'],
  assemblies: new Map(),
  assemblyOrder: [],
  componentDefs: new Map(),
  componentDefOrder: [],
  parameters: new Map(),
  parameterOrder: [],
  selectedIds: new Set(),
  activeLayerId: 'default',
  settings: DEFAULT_SETTINGS,
  snapshots: [],
  annotations: new Map(),
  history: [],
  historyIndex: -1,
  versions: [],
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
    get().pushHistory()
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

  createComponentFromSelected: (name) => {
    const { selectedIds, objects, activeLayerId, componentDefs } = get()
    if (selectedIds.size === 0) return null
    const id = uuidv4()
    const color = COMPONENT_COLORS[componentCounter % COMPONENT_COLORS.length]
    const defName = name ?? `Component ${componentCounter++}`

    // Collect selected objects; compute centroid as the def origin
    const selected = [...selectedIds].map(sid => objects.get(sid)).filter(Boolean) as SceneObject[]
    const centroid: Vec3 = {
      x: selected.reduce((s, o) => s + o.position.x, 0) / selected.length,
      y: selected.reduce((s, o) => s + o.position.y, 0) / selected.length,
      z: selected.reduce((s, o) => s + o.position.z, 0) / selected.length,
    }
    // Store objects relative to centroid
    const relObjects: SceneObject[] = selected.map(o => ({
      ...o,
      id: uuidv4(),
      position: { x: o.position.x - centroid.x, y: o.position.y - centroid.y, z: o.position.z - centroid.z },
    }))

    const def: ComponentDef = { id, name: defName, objects: relObjects, origin: centroid, color }
    void componentDefs

    // Replace selected objects with one instance placed at centroid
    const instanceId = uuidv4()
    const instance: SceneObject = {
      id: instanceId,
      name: defName,
      type: 'component-instance',
      layerId: activeLayerId,
      visible: true,
      locked: false,
      color,
      opacity: 1,
      roughness: 0.7,
      metalness: 0.1,
      position: centroid,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: {},
      metadata: {},
      componentDefId: id,
    }

    get().pushHistory()
    set(state => {
      const newObjects = new Map(state.objects)
      selectedIds.forEach(sid => newObjects.delete(sid))
      newObjects.set(instanceId, instance)
      const newDefs = new Map(state.componentDefs)
      newDefs.set(id, def)
      return {
        objects: newObjects,
        componentDefs: newDefs,
        componentDefOrder: [...state.componentDefOrder, id],
        selectedIds: new Set([instanceId]),
        isDirty: true,
      }
    })
    return id
  },

  instantiateComponent: (defId, position) => {
    const { componentDefs, activeLayerId } = get()
    const def = componentDefs.get(defId)
    if (!def) return ''
    const instanceId = uuidv4()
    const instance: SceneObject = {
      id: instanceId,
      name: def.name,
      type: 'component-instance',
      layerId: activeLayerId,
      visible: true,
      locked: false,
      color: def.color,
      opacity: 1,
      roughness: 0.7,
      metalness: 0.1,
      position: { x: position?.x ?? def.origin.x, y: position?.y ?? def.origin.y, z: position?.z ?? def.origin.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: {},
      metadata: {},
      componentDefId: defId,
    }
    set(state => {
      const objects = new Map(state.objects)
      objects.set(instanceId, instance)
      return { objects, selectedIds: new Set([instanceId]), isDirty: true }
    })
    get().pushHistory()
    return instanceId
  },

  updateComponentDef: (defId, patch) => {
    set(state => {
      const defs = new Map(state.componentDefs)
      const def = defs.get(defId)
      if (!def) return {}
      defs.set(defId, { ...def, ...patch })
      return { componentDefs: defs, isDirty: true }
    })
  },

  deleteComponentDef: (defId) => {
    get().pushHistory()
    set(state => {
      const defs = new Map(state.componentDefs)
      defs.delete(defId)
      // Remove all instances
      const objects = new Map(state.objects)
      const selectedIds = new Set(state.selectedIds)
      objects.forEach((obj, oid) => {
        if (obj.componentDefId === defId) { objects.delete(oid); selectedIds.delete(oid) }
      })
      return {
        componentDefs: defs,
        componentDefOrder: state.componentDefOrder.filter(id => id !== defId),
        objects,
        selectedIds,
        isDirty: true,
      }
    })
  },

  renameComponentDef: (defId, name) => {
    set(state => {
      const defs = new Map(state.componentDefs)
      const def = defs.get(defId)
      if (!def) return {}
      defs.set(defId, { ...def, name })
      return { componentDefs: defs, isDirty: true }
    })
  },

  explodeInstance: (instanceId) => {
    const { objects, componentDefs, activeLayerId } = get()
    const instance = objects.get(instanceId)
    if (!instance || instance.type !== 'component-instance' || !instance.componentDefId) return
    const def = componentDefs.get(instance.componentDefId)
    if (!def) return
    get().pushHistory()
    set(state => {
      const newObjects = new Map(state.objects)
      newObjects.delete(instanceId)
      const newIds: string[] = []
      def.objects.forEach(relObj => {
        const newId = uuidv4()
        newIds.push(newId)
        newObjects.set(newId, {
          ...relObj,
          id: newId,
          layerId: instance.layerId ?? activeLayerId,
          position: {
            x: (relObj.position.x * instance.scale.x) + instance.position.x,
            y: (relObj.position.y * instance.scale.y) + instance.position.y,
            z: (relObj.position.z * instance.scale.z) + instance.position.z,
          },
        })
      })
      return { objects: newObjects, selectedIds: new Set(newIds), isDirty: true }
    })
  },

  createAssembly: (name, objectIds = []) => {
    const id = uuidv4()
    const { assemblyOrder } = get()
    const color = ASSEMBLY_COLORS[assemblyCounter % ASSEMBLY_COLORS.length]
    const assembly: Assembly = {
      id,
      name: name ?? `Group ${assemblyCounter++}`,
      childIds: [...objectIds],
      color,
    }
    set(state => {
      const assemblies = new Map(state.assemblies)
      assemblies.set(id, assembly)
      const objects = new Map(state.objects)
      objectIds.forEach(oid => {
        const obj = objects.get(oid)
        if (obj) objects.set(oid, { ...obj, assemblyId: id })
      })
      return { assemblies, assemblyOrder: [...state.assemblyOrder, id], objects, isDirty: true }
    })
    void assemblyOrder
    return id
  },

  dissolveAssembly: (id) => {
    set(state => {
      const assemblies = new Map(state.assemblies)
      const assembly = assemblies.get(id)
      if (!assembly) return {}
      assemblies.delete(id)
      const objects = new Map(state.objects)
      assembly.childIds.forEach(oid => {
        const obj = objects.get(oid)
        if (obj) objects.set(oid, { ...obj, assemblyId: undefined })
      })
      return {
        assemblies,
        assemblyOrder: state.assemblyOrder.filter(a => a !== id),
        objects,
        isDirty: true,
      }
    })
  },

  renameAssembly: (id, name) => {
    set(state => {
      const assemblies = new Map(state.assemblies)
      const assembly = assemblies.get(id)
      if (!assembly) return {}
      assemblies.set(id, { ...assembly, name })
      return { assemblies, isDirty: true }
    })
  },

  addToAssembly: (assemblyId, objectIds) => {
    set(state => {
      const assemblies = new Map(state.assemblies)
      const assembly = assemblies.get(assemblyId)
      if (!assembly) return {}
      const newChildIds = [...new Set([...assembly.childIds, ...objectIds])]
      assemblies.set(assemblyId, { ...assembly, childIds: newChildIds })
      const objects = new Map(state.objects)
      objectIds.forEach(oid => {
        const obj = objects.get(oid)
        if (obj) objects.set(oid, { ...obj, assemblyId })
      })
      return { assemblies, objects, isDirty: true }
    })
  },

  removeFromAssembly: (assemblyId, objectIds) => {
    set(state => {
      const assemblies = new Map(state.assemblies)
      const assembly = assemblies.get(assemblyId)
      if (!assembly) return {}
      const removeSet = new Set(objectIds)
      assemblies.set(assemblyId, {
        ...assembly,
        childIds: assembly.childIds.filter(id => !removeSet.has(id)),
      })
      const objects = new Map(state.objects)
      objectIds.forEach(oid => {
        const obj = objects.get(oid)
        if (obj?.assemblyId === assemblyId) objects.set(oid, { ...obj, assemblyId: undefined })
      })
      return { assemblies, objects, isDirty: true }
    })
  },

  selectAssemblyObjects: (assemblyId) => {
    const assembly = get().assemblies.get(assemblyId)
    if (!assembly) return
    set({ selectedIds: new Set(assembly.childIds) })
  },

  moveAssembly: (assemblyId, delta) => {
    const assembly = get().assemblies.get(assemblyId)
    if (!assembly) return
    get().pushHistory()
    set(state => {
      const objects = new Map(state.objects)
      assembly.childIds.forEach(oid => {
        const obj = objects.get(oid)
        if (!obj) return
        objects.set(oid, {
          ...obj,
          position: {
            x: obj.position.x + delta.x,
            y: obj.position.y + delta.y,
            z: obj.position.z + delta.z,
          },
        })
      })
      return { objects, isDirty: true }
    })
  },

  addAnnotation: (ann) => {
    const id = uuidv4()
    set(state => {
      const annotations = new Map(state.annotations)
      annotations.set(id, { ...ann, id })
      return { annotations, isDirty: true }
    })
    return id
  },

  removeAnnotation: (id) => {
    set(state => {
      const annotations = new Map(state.annotations)
      annotations.delete(id)
      return { annotations, isDirty: true }
    })
  },

  updateAnnotation: (id, patch) => {
    set(state => {
      const annotations = new Map(state.annotations)
      const ann = annotations.get(id)
      if (!ann) return {}
      annotations.set(id, { ...ann, ...patch })
      return { annotations, isDirty: true }
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
    assemblyCounter = 1
    componentCounter = 1
    paramCounter = 1
    set({
      sceneId: uuidv4(),
      sceneName: 'Untitled',
      isDirty: false,
      objects: new Map(),
      layers: new Map([['default', DEFAULT_LAYER]]),
      layerOrder: ['default'],
      assemblies: new Map(),
      assemblyOrder: [],
      componentDefs: new Map(),
      componentDefOrder: [],
      parameters: new Map(),
      parameterOrder: [],
      selectedIds: new Set(),
      activeLayerId: 'default',
      snapshots: [],
      annotations: new Map(),
      history: [],
      historyIndex: -1,
    })
  },

  addParameter: (name) => {
    const id = uuidv4()
    const param: Parameter = {
      id,
      name: name ?? `param${paramCounter++}`,
      expression: '0',
      value: 0,
    }
    set(state => ({
      parameters: new Map(state.parameters).set(id, param),
      parameterOrder: [...state.parameterOrder, id],
      isDirty: true,
    }))
    return id
  },

  removeParameter: (id) => {
    set(state => {
      const parameters = new Map(state.parameters)
      parameters.delete(id)
      return { parameters, parameterOrder: state.parameterOrder.filter(p => p !== id), isDirty: true }
    })
  },

  updateParameter: (id, patch) => {
    const { parameters, objects } = get()
    const param = parameters.get(id)
    if (!param) return

    const newName = patch.name ?? param.name
    const newExpr = patch.expression ?? param.expression
    let newValue = param.value
    const newParams = new Map(parameters)

    // Build context from all params (in order) using the updated param
    const ctx: Record<string, number> = {}
    get().parameterOrder.forEach(pid => {
      const p = newParams.get(pid)
      if (!p) return
      const expr = pid === id ? newExpr : p.expression
      const name = pid === id ? newName : p.name
      try { ctx[name] = evaluateFormula(expr, ctx) }
      catch { ctx[name] = p.value }
    })
    newValue = ctx[newName] ?? param.value

    newParams.set(id, { ...param, name: newName, expression: newExpr, value: newValue })

    // Rebuild full context with final values
    const fullCtx: Record<string, number> = {}
    get().parameterOrder.forEach(pid => {
      const p = newParams.get(pid)!
      fullCtx[p.name] = p.value
    })

    const updatedObjs = applyDimExprs(objects, fullCtx)
    set({ parameters: newParams, ...(updatedObjs ? { objects: updatedObjs } : {}), isDirty: true })
  },

  setDimensionExpression: (objectId, dimKey, expr) => {
    const { objects, parameters } = get()
    const obj = objects.get(objectId)
    if (!obj) return
    const ctx = buildParamContext(parameters)
    const exprs = { ...(obj.dimensionExpressions ?? {}) }

    if (expr === null) {
      delete exprs[dimKey]
    } else {
      exprs[dimKey] = expr
      try {
        const val = evaluateFormula(expr, ctx)
        const dims = { ...obj.dimensions } as Record<string, number>
        dims[dimKey] = val
        set(state => {
          const newObjs = new Map(state.objects)
          newObjs.set(objectId, { ...obj, dimensions: dims as typeof obj.dimensions, dimensionExpressions: exprs })
          return { objects: newObjs, isDirty: true }
        })
        return
      } catch { /* store expr even if invalid */ }
    }

    set(state => {
      const newObjs = new Map(state.objects)
      newObjs.set(objectId, { ...obj, dimensionExpressions: exprs })
      return { objects: newObjs, isDirty: true }
    })
  },

  getParamContext: () => buildParamContext(get().parameters),

  createVersion: (name) => {
    const { objects, layers, layerOrder, settings, sceneName, versions } = get()
    const id = uuidv4()
    const version: SceneVersion = {
      id,
      name: name ?? `v${versions.length + 1} — ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      objectCount: objects.size,
      objects: Array.from(objects.values()),
      layers: Array.from(layers.values()),
      layerOrder: [...layerOrder],
      settings: { ...settings },
      sceneName,
    }
    set(state => ({ versions: [...state.versions, version] }))
    return id
  },

  restoreVersion: (id) => {
    const version = get().versions.find(v => v.id === id)
    if (!version) return
    get().pushHistory()
    const objMap = new Map(version.objects.map(o => [o.id, o]))
    const layerMap = new Map(version.layers.map(l => [l.id, l]))
    set({
      objects: objMap,
      layers: layerMap,
      layerOrder: [...version.layerOrder],
      settings: { ...version.settings },
      sceneName: version.sceneName,
      selectedIds: new Set(),
      isDirty: true,
    })
  },

  deleteVersion: (id) => {
    set(state => ({ versions: state.versions.filter(v => v.id !== id) }))
  },

  renameVersion: (id, name) => {
    set(state => ({
      versions: state.versions.map(v => v.id === id ? { ...v, name } : v),
    }))
  },

  mirrorObjects: (ids, axis) => {
    get().pushHistory()
    set(state => {
      const objects = new Map(state.objects)
      ids.forEach(id => {
        const obj = objects.get(id)
        if (!obj) return
        const mirrored: SceneObject = {
          ...obj,
          id: uuidv4(),
          name: obj.name + ' (mirrored)',
          position: {
            ...obj.position,
            [axis]: -obj.position[axis],
          },
          // Negate scale on the mirror axis — this is the geometric mirror.
          // Rotation stays intact; the flipped scale handles orientation.
          scale: {
            ...obj.scale,
            [axis]: -obj.scale[axis],
          },
        }
        objects.set(mirrored.id, mirrored)
      })
      return { objects, isDirty: true }
    })
  },

  arrayObjects: (ids, count, spacing) => {
    get().pushHistory()
    const newIds: string[] = []
    set(state => {
      const objects = new Map(state.objects)
      for (let i = 1; i <= count; i++) {
        ids.forEach(id => {
          const obj = objects.get(id)
          if (!obj) return
          const newId = uuidv4()
          newIds.push(newId)
          objects.set(newId, {
            ...obj,
            id: newId,
            name: `${obj.name} [${i}]`,
            position: {
              x: obj.position.x + spacing.x * i,
              y: obj.position.y + spacing.y * i,
              z: obj.position.z + spacing.z * i,
            },
          })
        })
      }
      return { objects, isDirty: true }
    })
    return newIds
  },

  importObjects: (objs) => {
    get().pushHistory()
    set(state => {
      const objects = new Map(state.objects)
      objs.forEach(obj => objects.set(obj.id, obj))
      return { objects, isDirty: true }
    })
  },

  _remoteSetObject: (id, obj) => set(state => {
    const objects = new Map(state.objects)
    objects.set(id, obj)
    return { objects }
  }),

  _remoteDeleteObject: (id) => set(state => {
    const objects = new Map(state.objects)
    const selectedIds = new Set(state.selectedIds)
    objects.delete(id)
    selectedIds.delete(id)
    return { objects, selectedIds }
  }),

  offsetSelectedFace: (distance) => {
    const { selectedIds, objects } = get()
    if (selectedIds.size === 0) return
    get().pushHistory()
    set(state => {
      const newObjects = new Map(state.objects)
      selectedIds.forEach(id => {
        const obj = newObjects.get(id)
        if (!obj || obj.type !== 'box') return
        const dims = obj.dimensions as import('../types').BoxDims
        const newWidth = Math.max(0.01, dims.width + distance * 2)
        const newHeight = Math.max(0.01, dims.height + distance * 2)
        const newDepth = Math.max(0.01, dims.depth + distance * 2)
        newObjects.set(id, {
          ...obj,
          dimensions: { width: newWidth, height: newHeight, depth: newDepth },
        })
      })
      return { objects: newObjects, isDirty: true }
    })
    void objects
  },

  sweepFollowMe: (profileId, pathPoints) => {
    const { objects, activeLayerId } = get()
    const profile = objects.get(profileId)
    if (!profile || pathPoints.length < 2) return
    // Lazy import to avoid bundling Three.js geometry in store
    void import('../lib/tools/FollowMeEngine').then(({ sweepProfile }) => {
      const dims = profile.dimensions as BoxDims
      const w = (dims.width ?? 1) * Math.abs(profile.scale.x)
      const h = (dims.height ?? 1) * Math.abs(profile.scale.y)
      const csgData = sweepProfile(w, h, pathPoints)
      if (!csgData) return
      get().pushHistory()
      const id = uuidv4()
      const obj: SceneObject = {
        id,
        name: `Sweep (${profile.name})`,
        type: 'imported',
        layerId: activeLayerId,
        visible: true,
        locked: false,
        color: profile.color,
        opacity: profile.opacity,
        roughness: profile.roughness,
        metalness: profile.metalness,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        dimensions: {},
        metadata: {},
        csgData,
      }
      set(state => {
        const objs = new Map(state.objects)
        objs.set(id, obj)
        return { objects: objs, selectedIds: new Set([id]), isDirty: true }
      })
    })
  },

  loadScene: (objects, layers, layerOrder, settings, annotations, assemblies, componentDefs, parameters) => {
    const objMap = new Map(objects.map(o => [o.id, o]))
    const layerMap = new Map(layers.map(l => [l.id, l]))
    const annMap = new Map((annotations ?? []).map((a: Annotation) => [a.id, a]))
    const asmList = assemblies ?? []
    const asmMap = new Map(asmList.map((a: Assembly) => [a.id, a]))
    const defList = componentDefs ?? []
    const defMap = new Map(defList.map((d: ComponentDef) => [d.id, d]))
    const paramList = parameters ?? []
    const paramMap = new Map(paramList.map((p: Parameter) => [p.id, p]))
    set({
      objects: objMap,
      layers: layerMap,
      layerOrder,
      settings,
      annotations: annMap,
      assemblies: asmMap,
      assemblyOrder: asmList.map((a: Assembly) => a.id),
      componentDefs: defMap,
      componentDefOrder: defList.map((d: ComponentDef) => d.id),
      parameters: paramMap,
      parameterOrder: paramList.map((p: Parameter) => p.id),
      selectedIds: new Set(),
      history: [],
      historyIndex: -1,
      isDirty: false,
    })
  },
}))

// ─── Persistent preferences ────────────────────────────────────────────────

const PREFS_KEY = 'crabcad-prefs'

function loadPersistedPrefs(): Partial<SceneSettings> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? (JSON.parse(raw) as Partial<SceneSettings>) : {}
  } catch { return {} }
}

// Hydrate settings from localStorage on startup
const saved = loadPersistedPrefs()
if (Object.keys(saved).length > 0) {
  useSceneStore.getState().updateSettings(saved)
}

// Write settings to localStorage on every change
useSceneStore.subscribe(state => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(state.settings)) }
  catch { /* quota exceeded or private browsing */ }
})
