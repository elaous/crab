import { describe, it, expect } from 'vitest'
import { serializeBinary, deserializeBinary } from '../capnpSerializer'
import { pack } from 'msgpackr'
import type { SceneData } from '../../../types'

function makeSceneData(name = 'Test'): SceneData {
  return {
    version: '1.0.0',
    name,
    objects: [],
    layers: [{ id: 'default', name: 'Default', color: '#60a5fa', visible: true, locked: false }],
    settings: {
      units: 'metric', precision: 3,
      snapEnabled: true, snapDistance: 12,
      gridVisible: true, axesVisible: true,
      displayMode: 'shaded', shadowsEnabled: true,
      outlineEnabled: true, sobelEnabled: false, aoEnabled: false,
      sunAzimuth: 45, sunElevation: 60, sunIntensity: 1.2,
      sectionEnabled: false, sectionAxis: 'y', sectionOffset: 0, sectionAngle: 0,
      toneMapping: 'aces', exposure: 1.0,
      bloomEnabled: false, bloomStrength: 0.4, bloomRadius: 0.4, bloomThreshold: 0.85,
      envPreset: 'studio', envIntensity: 1.0, bgColor: '#16213e',
      stylePreset: 'default', edgesVisible: true, edgeColor: '#1e293b',
      flatShading: false, xrayMode: false, bgGradient: false, bgColorTop: '#0f2027',
    },
    snapshots: [],
    annotations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/** Build a v1 (msgpackr) .facet blob for backward-compat tests. */
function makeV1Blob(data: SceneData): Uint8Array {
  const MAGIC_FCET = new Uint8Array([0x46, 0x43, 0x45, 0x54])
  const payload    = pack(data)
  const header     = new ArrayBuffer(12)
  const dv         = new DataView(header)
  dv.setUint8(0, MAGIC_FCET[0]); dv.setUint8(1, MAGIC_FCET[1])
  dv.setUint8(2, MAGIC_FCET[2]); dv.setUint8(3, MAGIC_FCET[3])
  dv.setUint16(4, 1, true)   // format version 1 = msgpackr
  dv.setUint16(6, 0, true)   // flags
  dv.setUint32(8, payload.byteLength, true)
  const out = new Uint8Array(12 + payload.byteLength)
  out.set(new Uint8Array(header), 0)
  out.set(payload, 12)
  return out
}

describe('serializeBinary (v2 — native Cap\'n Proto)', () => {
  it('starts with FCET magic bytes', () => {
    const bytes = serializeBinary(makeSceneData())
    expect(bytes[0]).toBe(0x46) // F
    expect(bytes[1]).toBe(0x43) // C
    expect(bytes[2]).toBe(0x45) // E
    expect(bytes[3]).toBe(0x54) // T
  })

  it('encodes format version 2 at offset 4', () => {
    const bytes = serializeBinary(makeSceneData())
    const dv = new DataView(bytes.buffer, bytes.byteOffset)
    expect(dv.getUint16(4, true)).toBe(2)
  })

  it('payload length field matches actual payload', () => {
    const bytes = serializeBinary(makeSceneData())
    const dv = new DataView(bytes.buffer, bytes.byteOffset)
    const payloadLen = dv.getUint32(8, true)
    expect(payloadLen).toBeGreaterThan(0)
    expect(bytes.byteLength).toBeGreaterThanOrEqual(12 + payloadLen)
  })

  it('produces different bytes for different scene names', () => {
    const a = serializeBinary(makeSceneData('SceneA'))
    const b = serializeBinary(makeSceneData('SceneB'))
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false)
  })
})

describe('deserializeBinary', () => {
  it('round-trips scene name', () => {
    const data = makeSceneData('My Scene')
    expect(deserializeBinary(serializeBinary(data)).name).toBe('My Scene')
  })

  it('round-trips objects array with Vec3 position', () => {
    const data = makeSceneData()
    data.objects = [{
      id: 'obj1', name: 'Box', type: 'box', layerId: 'default',
      visible: true, locked: false,
      color: '#ff0000', opacity: 1, roughness: 0.5, metalness: 0,
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { width: 2, height: 3, depth: 4 },
      metadata: {},
    }]
    const result = deserializeBinary(serializeBinary(data))
    expect(result.objects).toHaveLength(1)
    expect(result.objects[0].name).toBe('Box')
    expect(result.objects[0].position).toEqual({ x: 1, y: 2, z: 3 })
    expect(result.objects[0].dimensions).toEqual({ width: 2, height: 3, depth: 4 })
  })

  it('round-trips CSGGeometryData', () => {
    const data = makeSceneData()
    data.objects = [{
      id: 'csg1', name: 'CSG Mesh', type: 'csg', layerId: 'default',
      visible: true, locked: false, color: '#00ff00',
      opacity: 1, roughness: 0.3, metalness: 0,
      position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }, dimensions: {}, metadata: {},
      csgData: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        normals:   [0, 0, 1, 0, 0, 1, 0, 0, 1],
        indices:   [0, 1, 2],
      },
    }]
    const result = deserializeBinary(serializeBinary(data))
    const csg = result.objects[0].csgData!
    expect(csg.positions).toHaveLength(9)
    expect(csg.positions[0]).toBeCloseTo(0)
    expect(csg.indices).toEqual([0, 1, 2])
  })

  it('round-trips schema settings (units, precision)', () => {
    const data = makeSceneData()
    data.settings.units     = 'imperial'
    data.settings.precision = 2
    const result = deserializeBinary(serializeBinary(data))
    expect(result.settings.units).toBe('imperial')
    expect(result.settings.precision).toBe(2)
  })

  it('round-trips extra settings via JSON sidecar (exposure, bloom)', () => {
    const data = makeSceneData()
    data.settings.exposure      = 1.75
    data.settings.bloomEnabled  = true
    data.settings.bloomStrength = 0.9
    const result = deserializeBinary(serializeBinary(data))
    expect(result.settings.exposure).toBeCloseTo(1.75)
    expect(result.settings.bloomEnabled).toBe(true)
    expect(result.settings.bloomStrength).toBeCloseTo(0.9)
  })

  it('round-trips extra object fields via JSON sidecar (textureDataUrl)', () => {
    const data = makeSceneData()
    data.objects = [{
      id: 'tex1', name: 'Textured', type: 'box', layerId: 'default',
      visible: true, locked: false, color: '#fff',
      opacity: 1, roughness: 0.5, metalness: 0,
      position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }, dimensions: {}, metadata: {},
      textureDataUrl: 'data:image/png;base64,abc123',
      uvOffset: { x: 0.1, y: 0.2, z: 0 },
    }]
    const result = deserializeBinary(serializeBinary(data))
    expect(result.objects[0].textureDataUrl).toBe('data:image/png;base64,abc123')
    expect(result.objects[0].uvOffset?.x).toBeCloseTo(0.1)
  })

  it('throws on invalid magic bytes', () => {
    const bad = new Uint8Array(12)
    expect(() => deserializeBinary(bad)).toThrow('bad magic')
  })

  it('reads v1 (msgpackr) files for backward compat', () => {
    const data = makeSceneData('Legacy v1')
    const v1   = makeV1Blob(data)
    const result = deserializeBinary(v1)
    expect(result.name).toBe('Legacy v1')
  })

  it('reads CRAB-magic v1 files for backward compat', () => {
    const data = makeSceneData('CRAB Legacy')
    const v1   = makeV1Blob(data)
    // Patch to CRAB magic (old format)
    v1[0] = 0x43; v1[1] = 0x52; v1[2] = 0x41; v1[3] = 0x42
    const result = deserializeBinary(v1)
    expect(result.name).toBe('CRAB Legacy')
  })
})
