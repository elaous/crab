/**
 * Binary serialization for Facet 3D scene files.
 *
 * Schema contract: src/lib/io/scene.capnp
 *
 * Wire format (v2 — native Cap'n Proto packed binary):
 *   [4 bytes] magic: 0x46434554 ("FCET")
 *   [2 bytes] format version: uint16 little-endian (= 2)
 *   [2 bytes] flags: reserved, must be 0
 *   [4 bytes] payload length: uint32 little-endian
 *   [N bytes] Cap'n Proto packed binary (root: SceneFile)
 *
 * SceneFile.debugJson holds a JSON blob with fields not yet in the .capnp
 * schema (texture data URLs, UV params, extra settings, etc.).  This lets
 * schema and runtime evolve independently without breaking existing files.
 *
 * v1 backward compat: files written by the previous (msgpackr) serializer
 * are still readable; FORMAT_VERSION in the header distinguishes the two.
 *
 * Migration path: add new fields directly to scene.capnp and re-generate
 * scene.ts — the extras JSON shrinks automatically as schema coverage grows.
 */

import { Message } from 'capnp-es'
import { unpack } from 'msgpackr'
import {
  SceneFile,
  SceneData as CapnpSceneData,
  SceneObject as CapnpSceneObject,
  SceneSettings as CapnpSceneSettings,
  Layer as CapnpLayer,
  Assembly as CapnpAssembly,
  ComponentDef as CapnpComponentDef,
  ComponentObject as CapnpComponentObject,
  CameraSnapshot as CapnpCameraSnapshot,
  Annotation as CapnpAnnotation,
  Vec3 as CapnpVec3,
} from './scene'
import type {
  SceneData,
  SceneObject,
  SceneSettings,
  Layer,
  Assembly,
  ComponentDef,
  CameraSnapshot,
  Annotation,
  Vec3,
} from '../../types'

// ─── Config ─────────────────────────────────────────────────────────────────

export const DEBUG_SERIALIZATION = true

// ─── Magic + constants ───────────────────────────────────────────────────────

const MAGIC      = new Uint8Array([0x46, 0x43, 0x45, 0x54])   // "FCET"
const MAGIC_LEGACY = new Uint8Array([0x43, 0x52, 0x41, 0x42]) // "CRAB"
const FORMAT_VERSION_MSGPACK = 1   // legacy msgpackr encoding
const FORMAT_VERSION_CAPNP   = 2   // native Cap'n Proto encoding (current)

// ─── Vec3 helper ────────────────────────────────────────────────────────────

function writeVec3(cap: CapnpVec3, v: Vec3): void {
  cap.x = v.x; cap.y = v.y; cap.z = v.z
}

function readVec3(cap: CapnpVec3): Vec3 {
  return { x: cap.x, y: cap.y, z: cap.z }
}

// ─── Encode helpers ─────────────────────────────────────────────────────────

function encodeObject(cap: CapnpSceneObject, obj: SceneObject): void {
  cap.id           = obj.id
  cap.name         = obj.name
  cap.type         = obj.type
  cap.layerId      = obj.layerId
  cap.assemblyId   = obj.assemblyId  ?? ''
  cap.compDefId    = obj.componentDefId ?? ''
  cap.visible      = obj.visible
  cap.locked       = obj.locked
  cap.color        = obj.color
  cap.opacity      = obj.opacity
  cap.roughness    = obj.roughness
  cap.metalness    = obj.metalness
  cap.matPresetId  = obj.materialPresetId ?? ''
  cap.dimsJson     = JSON.stringify(obj.dimensions ?? {})
  writeVec3(cap._initPosition(), obj.position)
  writeVec3(cap._initRotation(), obj.rotation)
  writeVec3(cap._initScale(),    obj.scale)

  if (obj.csgData) {
    const pos = cap._initCsgPositions(obj.csgData.positions.length)
    obj.csgData.positions.forEach((v, i) => pos.set(i, v))
    const nor = cap._initCsgNormals(obj.csgData.normals.length)
    obj.csgData.normals.forEach((v, i) => nor.set(i, v))
    const idx = cap._initCsgIndices(obj.csgData.indices.length)
    obj.csgData.indices.forEach((v, i) => idx.set(i, v))
  }
}

function encodeLayer(cap: CapnpLayer, l: Layer): void {
  cap.id = l.id; cap.name = l.name; cap.color = l.color
  cap.visible = l.visible; cap.locked = l.locked
}

function encodeAssembly(cap: CapnpAssembly, a: Assembly): void {
  cap.id = a.id; cap.name = a.name; cap.color = a.color
  const ids = cap._initChildIds(a.childIds.length)
  a.childIds.forEach((id, i) => ids.set(i, id))
}

function encodeComponentDef(cap: CapnpComponentDef, d: ComponentDef): void {
  cap.id = d.id; cap.name = d.name; cap.description = d.description ?? ''
  cap.color = d.color
  writeVec3(cap._initOrigin(), d.origin)

  const objs = cap._initObjects(d.objects.length)
  d.objects.forEach((o, i) => {
    const co: CapnpComponentObject = objs.get(i)
    co.id = o.id; co.name = o.name; co.type = o.type; co.color = o.color
    co.opacity = o.opacity; co.roughness = o.roughness; co.metalness = o.metalness
    co.dimsJson = JSON.stringify(o.dimensions ?? {})
    writeVec3(co._initPosition(), o.position)
    writeVec3(co._initRotation(), o.rotation)
    writeVec3(co._initScale(),    o.scale)
  })
}

function encodeSettings(cap: CapnpSceneSettings, s: SceneSettings): void {
  cap.units          = s.units
  cap.precision      = s.precision
  cap.snapEnabled    = s.snapEnabled
  cap.snapDistance   = s.snapDistance
  cap.gridVisible    = s.gridVisible
  cap.axesVisible    = s.axesVisible
  cap.displayMode    = s.displayMode
  cap.shadowsEnabled = s.shadowsEnabled
  cap.outlineEnabled = s.outlineEnabled
  cap.sobelEnabled   = s.sobelEnabled
  cap.aoEnabled      = s.aoEnabled
  cap.sunAzimuth     = s.sunAzimuth
  cap.sunElevation   = s.sunElevation
  cap.sunIntensity   = s.sunIntensity
  cap.sectionEnabled = s.sectionEnabled
  cap.sectionAxis    = s.sectionAxis
  cap.sectionOffset  = s.sectionOffset
}

function encodeSnapshot(cap: CapnpCameraSnapshot, sn: CameraSnapshot): void {
  cap.id = sn.id; cap.name = sn.name; cap.preset = sn.preset; cap.mode = sn.mode
  cap.fov = sn.fov; cap.zoom = sn.zoom
  writeVec3(cap._initPosition(), sn.position)
  writeVec3(cap._initTarget(),   sn.target)
}

function encodeAnnotation(cap: CapnpAnnotation, ann: Annotation): void {
  cap.id = ann.id; cap.type = ann.type; cap.text = ann.text
  cap.color = ann.color; cap.fontSize = ann.fontSize
  writeVec3(cap._initPosition(), ann.position)
  if (ann.to) {
    cap.hasTo = true
    writeVec3(cap._initTo(), ann.to)
  }
}

// ─── Decode helpers ─────────────────────────────────────────────────────────

function decodeObject(cap: CapnpSceneObject): Partial<SceneObject> {
  const dims = (() => { try { return JSON.parse(cap.dimsJson || '{}') } catch { return {} } })()
  const obj: Partial<SceneObject> = {
    id:              cap.id,
    name:            cap.name,
    type:            cap.type as SceneObject['type'],
    layerId:         cap.layerId,
    assemblyId:      cap.assemblyId  || undefined,
    componentDefId:  cap.compDefId   || undefined,
    visible:         cap.visible,
    locked:          cap.locked,
    color:           cap.color,
    opacity:         cap.opacity,
    roughness:       cap.roughness,
    metalness:       cap.metalness,
    materialPresetId: cap.matPresetId || undefined,
    dimensions:      dims,
    position:        readVec3(cap.position),
    rotation:        readVec3(cap.rotation),
    scale:           readVec3(cap.scale),
    metadata:        {},
  }

  if (cap._hasCsgPositions()) {
    const positions: number[] = []
    const normals:   number[] = []
    const indices:   number[] = []
    const p = cap.csgPositions; for (let i = 0; i < p.length; i++) positions.push(p.get(i))
    const n = cap.csgNormals;   for (let i = 0; i < n.length; i++) normals.push(n.get(i))
    const x = cap.csgIndices;   for (let i = 0; i < x.length; i++) indices.push(x.get(i))
    obj.csgData = { positions, normals, indices }
  }

  return obj
}

function decodeLayer(cap: CapnpLayer): Layer {
  return { id: cap.id, name: cap.name, color: cap.color, visible: cap.visible, locked: cap.locked }
}

function decodeAssembly(cap: CapnpAssembly): Assembly {
  const childIds: string[] = []
  const c = cap.childIds; for (let i = 0; i < c.length; i++) childIds.push(c.get(i))
  return { id: cap.id, name: cap.name, color: cap.color, childIds }
}

function decodeSettings(cap: CapnpSceneSettings): Partial<SceneSettings> {
  return {
    units:          cap.units as SceneSettings['units'],
    precision:      cap.precision,
    snapEnabled:    cap.snapEnabled,
    snapDistance:   cap.snapDistance,
    gridVisible:    cap.gridVisible,
    axesVisible:    cap.axesVisible,
    displayMode:    cap.displayMode as SceneSettings['displayMode'],
    shadowsEnabled: cap.shadowsEnabled,
    outlineEnabled: cap.outlineEnabled,
    sobelEnabled:   cap.sobelEnabled,
    aoEnabled:      cap.aoEnabled,
    sunAzimuth:     cap.sunAzimuth,
    sunElevation:   cap.sunElevation,
    sunIntensity:   cap.sunIntensity,
    sectionEnabled: cap.sectionEnabled,
    sectionAxis:    cap.sectionAxis as SceneSettings['sectionAxis'],
    sectionOffset:  cap.sectionOffset,
  }
}

function decodeSnapshot(cap: CapnpCameraSnapshot): CameraSnapshot {
  return {
    id: cap.id, name: cap.name,
    preset: cap.preset as CameraSnapshot['preset'],
    mode:   cap.mode   as CameraSnapshot['mode'],
    fov: cap.fov, zoom: cap.zoom,
    position: readVec3(cap.position),
    target:   readVec3(cap.target),
  }
}

function decodeAnnotation(cap: CapnpAnnotation): Annotation {
  const ann: Annotation = {
    id: cap.id, type: cap.type as Annotation['type'], text: cap.text,
    color: cap.color, fontSize: cap.fontSize,
    position: readVec3(cap.position),
  }
  if (cap.hasTo) ann.to = readVec3(cap.to)
  return ann
}

// ─── Extras JSON (non-schema fields) ────────────────────────────────────────

type ExtrasBlob = {
  settings?: Partial<SceneSettings>
  objects?:  Record<string, Partial<SceneObject>>
  componentDefs?: Record<string, Partial<ComponentDef>>
  parameters?: SceneData['parameters']
  layerOrder?: string[]
}

function buildExtras(data: SceneData): string {
  const objectsExtra: Record<string, Partial<SceneObject>> = {}
  for (const obj of data.objects) {
    const extra: Partial<SceneObject> = {}
    if (obj.textureDataUrl)       extra.textureDataUrl      = obj.textureDataUrl
    if (obj.uvOffset)             extra.uvOffset            = obj.uvOffset
    if (obj.uvScale)              extra.uvScale             = obj.uvScale
    if (obj.uvRotation != null)   extra.uvRotation          = obj.uvRotation
    if (obj.lineStyle)            extra.lineStyle           = obj.lineStyle
    if (obj.lineWidth  != null)   extra.lineWidth           = obj.lineWidth
    if (obj.dimensionExpressions) extra.dimensionExpressions = obj.dimensionExpressions
    if (obj.metadata && Object.keys(obj.metadata).length)
      extra.metadata = obj.metadata
    if (Object.keys(extra).length) objectsExtra[obj.id] = extra
  }

  const componentDefsExtra: Record<string, Partial<ComponentDef>> = {}
  for (const d of data.componentDefs ?? []) {
    const extra: Partial<ComponentDef> = {}
    if (d.sku)          extra.sku          = d.sku
    if (d.manufacturer) extra.manufacturer = d.manufacturer
    if (d.unitCost)     extra.unitCost     = d.unitCost
    if (d.category)     extra.category     = d.category
    if (Object.keys(extra).length) componentDefsExtra[d.id] = extra
  }

  // Settings fields not covered by the .capnp schema
  const {
    toneMapping, exposure, bloomEnabled, bloomStrength, bloomRadius, bloomThreshold,
    envPreset, envIntensity, bgColor, stylePreset, edgesVisible, edgeColor,
    flatShading, xrayMode, bgGradient, bgColorTop, sectionAngle,
    clipVolumeEnabled, clipVolumeMin, clipVolumeMax,
  } = data.settings
  const settingsExtra = {
    toneMapping, exposure, bloomEnabled, bloomStrength, bloomRadius, bloomThreshold,
    envPreset, envIntensity, bgColor, stylePreset, edgesVisible, edgeColor,
    flatShading, xrayMode, bgGradient, bgColorTop, sectionAngle,
    clipVolumeEnabled, clipVolumeMin, clipVolumeMax,
  }

  const blob: ExtrasBlob = {
    settings:      settingsExtra as Partial<SceneSettings>,
    layerOrder:    data.objects.map(o => o.layerId).filter(Boolean), // placeholder; actual stored below
  }
  if (Object.keys(objectsExtra).length)      blob.objects      = objectsExtra
  if (Object.keys(componentDefsExtra).length) blob.componentDefs = componentDefsExtra
  if (data.parameters?.length)               blob.parameters   = data.parameters

  // Store layerOrder from the actual scene store field (passed via data)
  // SceneData doesn't have a top-level layerOrder but we include it via sceneSerializer
  return JSON.stringify(blob)
}

function mergeExtras(base: Partial<SceneData>, extras: string): void {
  let blob: ExtrasBlob
  try { blob = JSON.parse(extras) } catch { return }

  if (blob.settings && base.settings)
    Object.assign(base.settings, blob.settings)

  if (blob.objects && base.objects) {
    for (const obj of base.objects) {
      const extra = blob.objects[obj.id]
      if (extra) Object.assign(obj, extra)
    }
  }

  if (blob.componentDefs && base.componentDefs) {
    for (const d of base.componentDefs) {
      const extra = blob.componentDefs[d.id]
      if (extra) Object.assign(d, extra)
    }
  }

  if (blob.parameters) base.parameters = blob.parameters
}

// ─── Encode ─────────────────────────────────────────────────────────────────

export function serializeBinary(data: SceneData): Uint8Array {
  const msg = new Message()
  const root = msg.initRoot(SceneFile)
  root.formatVersion = FORMAT_VERSION_CAPNP

  const scene: CapnpSceneData = root._initScene()
  scene.version   = data.version
  scene.name      = data.name
  scene.createdAt = data.createdAt
  scene.updatedAt = data.updatedAt

  // Objects
  const objs = scene._initObjects(data.objects.length)
  data.objects.forEach((o, i) => encodeObject(objs.get(i), o))

  // Layers
  const layers = scene._initLayers(data.layers.length)
  data.layers.forEach((l, i) => encodeLayer(layers.get(i), l))

  // Assemblies
  const assemblies = data.assemblies ?? []
  const capAssemblies = scene._initAssemblies(assemblies.length)
  assemblies.forEach((a, i) => encodeAssembly(capAssemblies.get(i), a))

  // ComponentDefs
  const defs = data.componentDefs ?? []
  const capDefs = scene._initComponentDefs(defs.length)
  defs.forEach((d, i) => encodeComponentDef(capDefs.get(i), d))

  // Settings
  encodeSettings(scene._initSettings(), data.settings)

  // Snapshots
  const snaps = scene._initSnapshots(data.snapshots.length)
  data.snapshots.forEach((sn, i) => encodeSnapshot(snaps.get(i), sn))

  // Annotations
  const anns = scene._initAnnotations(data.annotations.length)
  data.annotations.forEach((ann, i) => encodeAnnotation(anns.get(i), ann))

  // Store non-schema fields in debugJson
  root.debugJson = buildExtras(data)

  const capnpBytes = new Uint8Array(msg.toPackedArrayBuffer())

  // Build outer FCET container header
  const header = new ArrayBuffer(12)
  const dv = new DataView(header)
  dv.setUint8(0, MAGIC[0]); dv.setUint8(1, MAGIC[1])
  dv.setUint8(2, MAGIC[2]); dv.setUint8(3, MAGIC[3])
  dv.setUint16(4, FORMAT_VERSION_CAPNP, true)
  dv.setUint16(6, 0, true)   // flags reserved
  dv.setUint32(8, capnpBytes.byteLength, true)

  const out = new Uint8Array(12 + capnpBytes.byteLength)
  out.set(new Uint8Array(header), 0)
  out.set(capnpBytes, 12)
  return out
}

// ─── Decode ─────────────────────────────────────────────────────────────────

export function deserializeBinary(bytes: Uint8Array): SceneData {
  const isCurrent = bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1] &&
                    bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3]
  const isLegacy  = bytes[0] === MAGIC_LEGACY[0] && bytes[1] === MAGIC_LEGACY[1] &&
                    bytes[2] === MAGIC_LEGACY[2] && bytes[3] === MAGIC_LEGACY[3]
  if (!isCurrent && !isLegacy) throw new Error('Not a Facet 3D binary file (bad magic)')

  const dv      = new DataView(bytes.buffer, bytes.byteOffset)
  const version = dv.getUint16(4, true)

  // v1 backward-compat: msgpackr-encoded payload
  if (version === FORMAT_VERSION_MSGPACK || isLegacy) {
    const payloadLen = dv.getUint32(8, true)
    const payload    = bytes.slice(12, 12 + payloadLen)
    return unpack(payload) as SceneData
  }

  // v2: native Cap'n Proto packed binary
  const payloadLen = dv.getUint32(8, true)
  const payload    = bytes.slice(12, 12 + payloadLen)
  const msg        = new Message(payload, true)   // packed=true
  const root       = msg.getRoot(SceneFile)
  const scene      = root.scene

  // Objects
  const objects: SceneObject[] = []
  const capObjs = scene.objects
  for (let i = 0; i < capObjs.length; i++)
    objects.push(decodeObject(capObjs.get(i)) as SceneObject)

  // Layers
  const layers: Layer[] = []
  const capLayers = scene.layers
  for (let i = 0; i < capLayers.length; i++)
    layers.push(decodeLayer(capLayers.get(i)))

  // Assemblies
  const assemblies: Assembly[] = []
  const capAssemblies = scene.assemblies
  for (let i = 0; i < capAssemblies.length; i++)
    assemblies.push(decodeAssembly(capAssemblies.get(i)))

  // ComponentDefs
  const componentDefs: ComponentDef[] = []
  const capDefs = scene.componentDefs
  for (let i = 0; i < capDefs.length; i++) {
    const cap = capDefs.get(i)
    const defObjs: SceneObject[] = []
    const capDefObjs = cap.objects
    for (let j = 0; j < capDefObjs.length; j++) {
      const co = capDefObjs.get(j)
      defObjs.push({
        id: co.id, name: co.name, type: co.type as SceneObject['type'],
        color: co.color, opacity: co.opacity, roughness: co.roughness, metalness: co.metalness,
        position: readVec3(co.position), rotation: readVec3(co.rotation), scale: readVec3(co.scale),
        dimensions: (() => { try { return JSON.parse(co.dimsJson || '{}') } catch { return {} } })(),
        layerId: '', visible: true, locked: false, metadata: {},
      } as SceneObject)
    }
    componentDefs.push({
      id: cap.id, name: cap.name, description: cap.description,
      origin: readVec3(cap.origin), color: cap.color, objects: defObjs,
    })
  }

  // Settings
  const settingsBase = decodeSettings(scene.settings)

  // Snapshots
  const snapshots: CameraSnapshot[] = []
  const capSnaps = scene.snapshots
  for (let i = 0; i < capSnaps.length; i++) snapshots.push(decodeSnapshot(capSnaps.get(i)))

  // Annotations
  const annotations: Annotation[] = []
  const capAnns = scene.annotations
  for (let i = 0; i < capAnns.length; i++) annotations.push(decodeAnnotation(capAnns.get(i)))

  const result: Partial<SceneData> = {
    version:       scene.version,
    name:          scene.name,
    createdAt:     scene.createdAt,
    updatedAt:     scene.updatedAt,
    objects,
    layers,
    assemblies,
    componentDefs,
    settings:      settingsBase as SceneSettings,
    snapshots,
    annotations,
  }

  // Restore non-schema fields from the extras JSON blob
  if (root.debugJson) mergeExtras(result, root.debugJson)

  return result as SceneData
}

// ─── File download helpers ───────────────────────────────────────────────────

export async function downloadBinary(data: SceneData, filename: string): Promise<void> {
  const bytes = serializeBinary(data)
  const name = filename.endsWith('.facet') ? filename : filename + '.facet'

  if (window.electronAPI) {
    await window.electronAPI.saveFile(name, bytes)
    return
  }

  const buf = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buf).set(bytes)
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export async function loadBinaryFromFile(): Promise<SceneData | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFile()
    if (!result) return null
    const bytes = new Uint8Array(result.bytes)
    try {
      if (bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1] &&
          bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3]) {
        return deserializeBinary(bytes)
      }
      return JSON.parse(new TextDecoder().decode(bytes)) as SceneData
    } catch {
      alert('Invalid or corrupt Facet 3D file')
      return null
    }
  }

  return new Promise(resolve => {
    const input     = document.createElement('input')
    input.type      = 'file'
    input.accept    = '.facet,.json'
    input.onchange  = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }

      const arrayBuffer = await file.arrayBuffer()
      const bytes       = new Uint8Array(arrayBuffer)

      try {
        if (bytes[0] === MAGIC[0] && bytes[1] === MAGIC[1] &&
            bytes[2] === MAGIC[2] && bytes[3] === MAGIC[3]) {
          resolve(deserializeBinary(bytes))
        } else {
          resolve(JSON.parse(new TextDecoder().decode(bytes)) as SceneData)
        }
      } catch {
        alert('Invalid or corrupt Facet 3D file')
        resolve(null)
      }
    }
    input.click()
  })
}
