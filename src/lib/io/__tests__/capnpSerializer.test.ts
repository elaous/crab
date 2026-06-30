import { describe, it, expect } from 'vitest'
import { serializeBinary, deserializeBinary } from '../capnpSerializer'
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

describe('serializeBinary', () => {
  it('starts with FCET magic bytes', () => {
    const bytes = serializeBinary(makeSceneData())
    expect(bytes[0]).toBe(0x46) // F
    expect(bytes[1]).toBe(0x43) // C
    expect(bytes[2]).toBe(0x45) // E
    expect(bytes[3]).toBe(0x54) // T
  })

  it('encodes format version 1 at offset 4', () => {
    const bytes = serializeBinary(makeSceneData())
    const dv = new DataView(bytes.buffer, bytes.byteOffset)
    expect(dv.getUint16(4, true)).toBe(1)
  })

  it('payload length matches actual payload', () => {
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
    const bytes = serializeBinary(data)
    const result = deserializeBinary(bytes)
    expect(result.name).toBe('My Scene')
  })

  it('round-trips objects array', () => {
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
  })

  it('round-trips settings', () => {
    const data = makeSceneData()
    data.settings.units = 'imperial'
    data.settings.exposure = 1.5
    const result = deserializeBinary(serializeBinary(data))
    expect(result.settings.units).toBe('imperial')
    expect(result.settings.exposure).toBeCloseTo(1.5)
  })

  it('throws on invalid magic bytes', () => {
    const bad = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    expect(() => deserializeBinary(bad)).toThrow('bad magic')
  })

  it('accepts legacy CRAB magic bytes', () => {
    const data = makeSceneData('Legacy')
    const bytes = serializeBinary(data)
    // Patch magic to CRAB
    bytes[0] = 0x43; bytes[1] = 0x52; bytes[2] = 0x41; bytes[3] = 0x42
    // Should not throw
    expect(() => deserializeBinary(bytes)).not.toThrow()
  })
})
