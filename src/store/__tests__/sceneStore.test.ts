import { describe, it, expect, beforeEach } from 'vitest'
import { useSceneStore } from '../sceneStore'

// Reset store state between tests
beforeEach(() => {
  useSceneStore.setState({
    sceneName: 'Untitled',
    isDirty: false,
    objects: new Map(),
    layers: new Map([['default', { id: 'default', name: 'Default', color: '#60a5fa', visible: true, locked: false }]]),
    layerOrder: ['default'],
    selectedIds: new Set(),
    activeLayerId: 'default',
    annotations: new Map(),
    snapshots: [],
    history: [],
    historyIndex: -1,
  })
})

describe('addObject', () => {
  it('creates an object and marks scene dirty', () => {
    const { addObject, objects, isDirty } = useSceneStore.getState()
    const id = addObject('box')
    expect(useSceneStore.getState().objects.has(id)).toBe(true)
    expect(useSceneStore.getState().isDirty).toBe(true)
    // avoid unused variable warning
    void objects; void isDirty
  })

  it('assigns the given position', () => {
    const id = useSceneStore.getState().addObject('sphere', { x: 3, y: 1, z: -2 })
    const obj = useSceneStore.getState().objects.get(id)
    expect(obj?.position).toEqual({ x: 3, y: 1, z: -2 })
  })

  it('creates a box with correct default dimensions', () => {
    const id = useSceneStore.getState().addObject('box')
    const obj = useSceneStore.getState().objects.get(id)
    expect(obj?.dimensions).toEqual({ width: 1, height: 1, depth: 1 })
  })

  it('creates a sphere with correct default dimensions', () => {
    const id = useSceneStore.getState().addObject('sphere')
    const obj = useSceneStore.getState().objects.get(id)
    expect(obj?.dimensions).toEqual({ radius: 0.5 })
  })
})

describe('removeObjects', () => {
  it('deletes the specified object', () => {
    const id = useSceneStore.getState().addObject('box')
    useSceneStore.getState().removeObjects([id])
    expect(useSceneStore.getState().objects.has(id)).toBe(false)
  })

  it('removes id from selection', () => {
    const id = useSceneStore.getState().addObject('box')
    useSceneStore.getState().selectObject(id)
    expect(useSceneStore.getState().selectedIds.has(id)).toBe(true)
    useSceneStore.getState().removeObjects([id])
    expect(useSceneStore.getState().selectedIds.has(id)).toBe(false)
  })
})

describe('updateObject', () => {
  it('patches object fields', () => {
    const id = useSceneStore.getState().addObject('box')
    useSceneStore.getState().updateObject(id, { color: '#ff0000', opacity: 0.5 })
    const obj = useSceneStore.getState().objects.get(id)
    expect(obj?.color).toBe('#ff0000')
    expect(obj?.opacity).toBe(0.5)
  })

  it('is a no-op for unknown id', () => {
    const before = new Map(useSceneStore.getState().objects)
    useSceneStore.getState().updateObject('nonexistent', { color: '#fff' })
    expect(useSceneStore.getState().objects).toEqual(before)
  })
})

describe('duplicateObjects', () => {
  it('creates a copy with offset position', () => {
    const id = useSceneStore.getState().addObject('box')
    const orig = useSceneStore.getState().objects.get(id)!
    const [newId] = useSceneStore.getState().duplicateObjects([id])
    const copy = useSceneStore.getState().objects.get(newId)!
    expect(copy.position.x).toBeCloseTo(orig.position.x + 0.5)
    expect(copy.name).toContain('Copy')
  })
})

describe('undo/redo', () => {
  it('restores state before removeObjects', () => {
    // Add two objects so history has entries for removeObjects to undo
    const idA = useSceneStore.getState().addObject('box')
    const idB = useSceneStore.getState().addObject('sphere')
    expect(useSceneStore.getState().objects.has(idA)).toBe(true)
    // removeObjects pushes history BEFORE deletion
    useSceneStore.getState().removeObjects([idA])
    expect(useSceneStore.getState().objects.has(idA)).toBe(false)
    useSceneStore.getState().undo()
    // After undo, idA should be back
    expect(useSceneStore.getState().objects.has(idA)).toBe(true)
    void idB
  })

  it('redo re-applies a duplicated state', () => {
    const id = useSceneStore.getState().addObject('box')
    // Duplicate pushes history before creating the copy
    const [copyId] = useSceneStore.getState().duplicateObjects([id])
    expect(useSceneStore.getState().objects.has(copyId)).toBe(true)
    useSceneStore.getState().undo()
    expect(useSceneStore.getState().objects.has(copyId)).toBe(false)
    useSceneStore.getState().redo()
    expect(useSceneStore.getState().objects.has(copyId)).toBe(true)
  })
})

describe('annotations', () => {
  it('adds and retrieves an annotation', () => {
    const id = useSceneStore.getState().addAnnotation({
      type: 'label', text: 'hello', position: { x: 0, y: 0, z: 0 }, color: '#fff', fontSize: 12,
    })
    const ann = useSceneStore.getState().annotations.get(id)
    expect(ann?.text).toBe('hello')
  })

  it('removes an annotation', () => {
    const id = useSceneStore.getState().addAnnotation({
      type: 'label', text: 'bye', position: { x: 0, y: 0, z: 0 }, color: '#fff', fontSize: 12,
    })
    useSceneStore.getState().removeAnnotation(id)
    expect(useSceneStore.getState().annotations.has(id)).toBe(false)
  })

  it('updates annotation text', () => {
    const id = useSceneStore.getState().addAnnotation({
      type: 'label', text: 'old', position: { x: 0, y: 0, z: 0 }, color: '#fff', fontSize: 12,
    })
    useSceneStore.getState().updateAnnotation(id, { text: 'new' })
    expect(useSceneStore.getState().annotations.get(id)?.text).toBe('new')
  })
})

describe('layers', () => {
  it('adds a new layer', () => {
    const id = useSceneStore.getState().addLayer()
    expect(useSceneStore.getState().layers.has(id)).toBe(true)
    expect(useSceneStore.getState().layerOrder).toContain(id)
  })

  it('removes a layer and moves objects to default', () => {
    const layerId = useSceneStore.getState().addLayer()
    const objId = useSceneStore.getState().addObject('box')
    useSceneStore.getState().assignToLayer([objId], layerId)
    expect(useSceneStore.getState().objects.get(objId)?.layerId).toBe(layerId)
    useSceneStore.getState().removeLayer(layerId)
    expect(useSceneStore.getState().objects.get(objId)?.layerId).toBe('default')
  })

  it('cannot remove the default layer', () => {
    useSceneStore.getState().removeLayer('default')
    expect(useSceneStore.getState().layers.has('default')).toBe(true)
  })
})

describe('deleteFace', () => {
  it('removes the matching triangle from csgData indices', () => {
    const id = useSceneStore.getState().addObject('box')
    const csgData = {
      positions: [0,0,0, 1,0,0, 0,1,0, 1,1,0],
      normals:   [0,0,1, 0,0,1, 0,0,1, 0,0,1],
      indices: [0,1,2, 1,3,2],
    }
    useSceneStore.getState().updateObject(id, { csgData, type: 'imported' })
    useSceneStore.getState().deleteFace(id, 0, 1, 2)
    const obj = useSceneStore.getState().objects.get(id)
    expect(obj?.csgData?.indices).toEqual([1, 3, 2])
  })

  it('is a no-op when face is not found', () => {
    const id = useSceneStore.getState().addObject('box')
    const csgData = { positions: [0,0,0, 1,0,0, 0,1,0], normals: [0,0,1, 0,0,1, 0,0,1], indices: [0,1,2] }
    useSceneStore.getState().updateObject(id, { csgData, type: 'imported' })
    const before = useSceneStore.getState().objects.get(id)?.csgData?.indices?.length
    useSceneStore.getState().deleteFace(id, 5, 6, 7) // non-existent face
    const after = useSceneStore.getState().objects.get(id)?.csgData?.indices?.length
    expect(after).toBe(before)
  })

  it('is a no-op when object has no csgData', () => {
    const id = useSceneStore.getState().addObject('box')
    expect(() => useSceneStore.getState().deleteFace(id, 0, 1, 2)).not.toThrow()
  })

  it('accepts any winding order of the same triangle', () => {
    const id = useSceneStore.getState().addObject('box')
    const csgData = {
      positions: [0,0,0, 1,0,0, 0,1,0],
      normals: [0,0,1, 0,0,1, 0,0,1],
      indices: [0,1,2],
    }
    useSceneStore.getState().updateObject(id, { csgData, type: 'imported' })
    // Supply face vertices in reversed winding
    useSceneStore.getState().deleteFace(id, 2, 1, 0)
    expect(useSceneStore.getState().objects.get(id)?.csgData?.indices).toEqual([])
  })
})
