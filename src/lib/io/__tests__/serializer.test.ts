import { describe, it, expect } from 'vitest'
import { serialize, deserialize, exportCSV } from '../sceneSerializer'
import type { SceneObject, Layer, SceneSettings, Annotation, Assembly } from '../../../types'

const DEFAULT_SETTINGS: SceneSettings = {
  units: 'metric', precision: 3,
  snapEnabled: true, snapDistance: 12,
  gridVisible: true, axesVisible: true,
  displayMode: 'shaded', shadowsEnabled: true,
  outlineEnabled: true, sobelEnabled: false, aoEnabled: false,
  sunAzimuth: 45, sunElevation: 60, sunIntensity: 1.2,
  sectionEnabled: false, sectionAxis: 'y', sectionOffset: 0,
}

function makeObject(id: string, name = 'Box'): SceneObject {
  return {
    id, name, type: 'box', layerId: 'default',
    visible: true, locked: false,
    color: '#60a5fa', opacity: 1, roughness: 0.7, metalness: 0.1,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: { width: 1, height: 1, depth: 1 },
    metadata: {},
  }
}

const DEFAULT_LAYER: Layer = {
  id: 'default', name: 'Default', color: '#60a5fa', visible: true, locked: false,
}

describe('serialize', () => {
  it('produces SceneData with correct version and name', () => {
    const objects = new Map([['a', makeObject('a')]])
    const layers = new Map([['default', DEFAULT_LAYER]])
    const data = serialize('MyScene', objects, layers, ['default'], DEFAULT_SETTINGS)
    expect(data.version).toBe('1.0.0')
    expect(data.name).toBe('MyScene')
  })

  it('serializes all objects', () => {
    const objects = new Map([
      ['a', makeObject('a', 'Box A')],
      ['b', makeObject('b', 'Box B')],
    ])
    const layers = new Map([['default', DEFAULT_LAYER]])
    const data = serialize('Test', objects, layers, ['default'], DEFAULT_SETTINGS)
    expect(data.objects).toHaveLength(2)
    expect(data.objects.map(o => o.name).sort()).toEqual(['Box A', 'Box B'])
  })

  it('includes annotations when provided', () => {
    const objects = new Map<string, SceneObject>()
    const layers = new Map([['default', DEFAULT_LAYER]])
    const ann: Annotation = { id: 'ann1', type: 'label', text: 'Test note', position: { x: 0, y: 0, z: 0 }, color: '#fff', fontSize: 12 }
    const annotations = new Map([['ann1', ann]])
    const data = serialize('Test', objects, layers, ['default'], DEFAULT_SETTINGS, [], annotations)
    expect(data.annotations).toHaveLength(1)
    expect(data.annotations[0].text).toBe('Test note')
  })

  it('respects layer order in output', () => {
    const layerA: Layer = { ...DEFAULT_LAYER, id: 'a', name: 'A' }
    const layerB: Layer = { ...DEFAULT_LAYER, id: 'b', name: 'B' }
    const layers = new Map([['a', layerA], ['b', layerB]])
    const data = serialize('Test', new Map(), layers, ['b', 'a'], DEFAULT_SETTINGS)
    expect(data.layers.map(l => l.id)).toEqual(['b', 'a'])
  })
})

describe('deserialize', () => {
  it('round-trips objects', () => {
    const objects = new Map([['x', makeObject('x', 'Sphere')]])
    const layers = new Map([['default', DEFAULT_LAYER]])
    const data = serialize('S', objects, layers, ['default'], DEFAULT_SETTINGS)
    const result = deserialize(data)
    expect(result.objects).toHaveLength(1)
    expect(result.objects[0].name).toBe('Sphere')
  })

  it('round-trips annotations', () => {
    const ann: Annotation = { id: 'a1', type: 'label', text: 'hello', position: { x: 1, y: 2, z: 3 }, color: '#ff0', fontSize: 14 }
    const annotations = new Map([['a1', ann]])
    const data = serialize('S', new Map(), new Map([['default', DEFAULT_LAYER]]), ['default'], DEFAULT_SETTINGS, [], annotations)
    const result = deserialize(data)
    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].text).toBe('hello')
  })

  it('returns empty annotations when field missing', () => {
    const data = serialize('S', new Map(), new Map([['default', DEFAULT_LAYER]]), ['default'], DEFAULT_SETTINGS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (data as any).annotations
    const result = deserialize(data)
    expect(result.annotations).toEqual([])
  })

  it('round-trips assemblies', () => {
    const asm: Assembly = { id: 'g1', name: 'Frame', childIds: ['a', 'b'], color: '#f472b6' }
    const assemblies = new Map([['g1', asm]])
    const data = serialize('S', new Map(), new Map([['default', DEFAULT_LAYER]]), ['default'], DEFAULT_SETTINGS, [], new Map(), assemblies)
    const result = deserialize(data)
    expect(result.assemblies).toHaveLength(1)
    expect(result.assemblies[0].name).toBe('Frame')
    expect(result.assemblies[0].childIds).toEqual(['a', 'b'])
  })

  it('returns empty assemblies when field missing', () => {
    const data = serialize('S', new Map(), new Map([['default', DEFAULT_LAYER]]), ['default'], DEFAULT_SETTINGS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (data as any).assemblies
    const result = deserialize(data)
    expect(result.assemblies).toEqual([])
  })
})

describe('exportCSV', () => {
  it('produces a header row', () => {
    const csv = exportCSV(new Map())
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toContain('Name')
    expect(firstLine).toContain('Type')
    expect(firstLine).toContain('PosX')
  })

  it('produces one data row per object', () => {
    const objects = new Map([
      ['a', makeObject('a', 'First')],
      ['b', makeObject('b', 'Second')],
    ])
    const rows = exportCSV(objects).split('\n')
    expect(rows).toHaveLength(3) // header + 2 data rows
  })

  it('includes object name in output', () => {
    const objects = new Map([['x', makeObject('x', 'MyBox')]])
    const csv = exportCSV(objects)
    expect(csv).toContain('MyBox')
  })
})
