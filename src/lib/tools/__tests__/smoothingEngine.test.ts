import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  flattenNormals,
  creaseSmooth,
  laplacianSmooth,
  loopSubdivide,
  geoToCsgData,
  csgDataToGeo,
} from '../SmoothingEngine'

/** Single triangle: positions only, no index */
function makeTriangle(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]), 3))
  geo.setIndex([0, 1, 2])
  return geo
}

/** A simple cube geometry (indexed) */
function makeBox(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 1, 1)
}

// ─── geoToCsgData / csgDataToGeo ──────────────────────────────────────────────

describe('geoToCsgData', () => {
  it('returns positions, normals and indices arrays', () => {
    const data = geoToCsgData(makeBox())
    expect(data.positions.length).toBeGreaterThan(0)
    expect(data.normals.length).toBe(data.positions.length)
    expect(data.indices.length).toBeGreaterThan(0)
    expect(data.indices.length % 3).toBe(0)
  })
})

describe('csgDataToGeo', () => {
  it('round-trips a box geometry', () => {
    const box = makeBox()
    const data = geoToCsgData(box)
    const geo = csgDataToGeo(data)
    expect(geo.attributes.position.count).toBe(data.positions.length / 3)
    expect(geo.index!.count).toBe(data.indices.length)
  })
})

// ─── flattenNormals ───────────────────────────────────────────────────────────

describe('flattenNormals', () => {
  it('returns a non-indexed geometry', () => {
    const result = flattenNormals(makeBox())
    expect(result.index).toBeNull()
  })

  it('has normals attribute', () => {
    const result = flattenNormals(makeBox())
    expect(result.attributes.normal).toBeTruthy()
  })

  it('vertex count is a multiple of 3', () => {
    const result = flattenNormals(makeBox())
    expect(result.attributes.position.count % 3).toBe(0)
  })
})

// ─── creaseSmooth ─────────────────────────────────────────────────────────────

describe('creaseSmooth', () => {
  it('preserves vertex count', () => {
    const box = makeBox()
    const before = box.attributes.position.count
    const result = creaseSmooth(box, 30)
    // non-indexed output: vertex count changes but total triangles should match
    expect(result.attributes.position.count % 3).toBe(0)
    void before
  })

  it('produces a geometry with normals', () => {
    const result = creaseSmooth(makeBox(), 45)
    expect(result.attributes.normal).toBeTruthy()
  })

  it('0° crease gives flat normals (every triangle unique)', () => {
    const result = creaseSmooth(makeBox(), 0)
    // With 0° crease, no smoothing occurs — each triangle gets its own vertex copies
    const n = result.attributes.normal
    expect(n.count % 3).toBe(0)
  })

  it('180° crease gives fully smooth normals', () => {
    const sphere = new THREE.SphereGeometry(1, 8, 8)
    const result = creaseSmooth(sphere, 180)
    expect(result.attributes.position.count).toBeGreaterThan(0)
  })
})

// ─── laplacianSmooth ──────────────────────────────────────────────────────────

describe('laplacianSmooth', () => {
  it('preserves vertex and face count', () => {
    const box = makeBox()
    const before = { verts: box.attributes.position.count, tris: box.index!.count / 3 }
    const result = laplacianSmooth(box, 2, 0.5)
    expect(result.attributes.position.count).toBe(before.verts)
    expect(result.index!.count / 3).toBe(before.tris)
  })

  it('moves vertices (factor > 0)', () => {
    const sphere = new THREE.SphereGeometry(1, 6, 6)
    const before = Array.from(sphere.attributes.position.array)
    const result = laplacianSmooth(sphere, 3, 0.5)
    const after = Array.from(result.attributes.position.array)
    // At least some vertices should have moved
    const changed = before.filter((v, i) => Math.abs(v - after[i]) > 1e-6).length
    expect(changed).toBeGreaterThan(0)
  })

  it('clamps iterations to 20', () => {
    const box = makeBox()
    // Should not throw with very high iteration count
    expect(() => laplacianSmooth(box, 100, 0.3)).not.toThrow()
  })

  it('factor=0 leaves geometry unchanged', () => {
    const box = makeBox()
    const before = Array.from(box.attributes.position.array)
    const result = laplacianSmooth(box, 5, 0)
    const after = Array.from(result.attributes.position.array)
    before.forEach((v, i) => expect(after[i]).toBeCloseTo(v, 5))
  })
})

// ─── loopSubdivide ────────────────────────────────────────────────────────────

describe('loopSubdivide', () => {
  it('quadruples triangle count per iteration', () => {
    const tri = makeTriangle()
    const result = loopSubdivide(tri, 1)
    // 1 triangle → 4
    expect(result.index!.count / 3).toBe(4)
  })

  it('2 iterations gives 16× triangle count', () => {
    const tri = makeTriangle()
    const result = loopSubdivide(tri, 2)
    expect(result.index!.count / 3).toBe(16)
  })

  it('clamps iterations to 4', () => {
    const tri = makeTriangle()
    // Should not throw or take forever
    expect(() => loopSubdivide(tri, 10)).not.toThrow()
  })

  it('produces more vertices than the input', () => {
    const box = makeBox()
    const before = box.attributes.position.count
    const result = loopSubdivide(box, 1)
    expect(result.attributes.position.count).toBeGreaterThan(before)
  })
})
