import * as THREE from 'three'
import type { CSGGeometryData } from '../../types'

// ─── Normal smoothing ─────────────────────────────────────────────────────────

/** Make every triangle face carry its own flat normal (faceted look). */
export function flattenNormals(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = geo.toNonIndexed()
  out.computeVertexNormals()   // with non-indexed, each face gets its own vertices → flat normals
  return out
}

/**
 * Angle-based (crease) normal smoothing — the core SketchUp "Soften Edges" feature.
 *
 * Faces whose shared edge angle is below `creaseAngleDeg` get interpolated normals
 * (smooth). Faces above the threshold keep hard edges.
 *
 * Algorithm:
 *   1. Index geometry so we can find shared vertices
 *   2. Build a position→face list map
 *   3. For each vertex in a face, find all faces that share that vertex position
 *   4. Average the normals of faces within the crease-angle threshold
 */
export function creaseSmooth(geo: THREE.BufferGeometry, creaseAngleDeg: number): THREE.BufferGeometry {
  const indexed = geo.index ? geo : mergeVertices(geo)
  const pos = indexed.attributes.position
  const idx = indexed.index!
  const faceCount = idx.count / 3

  // Compute per-face normals
  const faceNormals: THREE.Vector3[] = []
  for (let f = 0; f < faceCount; f++) {
    const a = idx.getX(f * 3), b = idx.getX(f * 3 + 1), c = idx.getX(f * 3 + 2)
    const vA = new THREE.Vector3().fromBufferAttribute(pos, a)
    const vB = new THREE.Vector3().fromBufferAttribute(pos, b)
    const vC = new THREE.Vector3().fromBufferAttribute(pos, c)
    const n = new THREE.Vector3().crossVectors(
      new THREE.Vector3().subVectors(vB, vA),
      new THREE.Vector3().subVectors(vC, vA),
    ).normalize()
    faceNormals.push(n)
  }

  // Map posKey → face indices
  const vertToFaces = new Map<number, number[]>()
  for (let f = 0; f < faceCount; f++) {
    for (let v = 0; v < 3; v++) {
      const vi = idx.getX(f * 3 + v)
      if (!vertToFaces.has(vi)) vertToFaces.set(vi, [])
      vertToFaces.get(vi)!.push(f)
    }
  }

  const cosThreshold = Math.cos(THREE.MathUtils.degToRad(Math.max(0, Math.min(180, creaseAngleDeg))))

  // Compute per-vertex normals per face (smooth within crease, hard across it)
  // Result is stored as a non-indexed geometry with per-vertex-per-face normals
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  let vi = 0

  for (let f = 0; f < faceCount; f++) {
    for (let corner = 0; corner < 3; corner++) {
      const vertIdx = idx.getX(f * 3 + corner)
      const p = new THREE.Vector3().fromBufferAttribute(pos, vertIdx)
      positions.push(p.x, p.y, p.z)

      // Average normals from adjacent faces within crease angle
      const thisFaceNormal = faceNormals[f]
      const accumulated = thisFaceNormal.clone()
      const adjacentFaces = vertToFaces.get(vertIdx) ?? []
      for (const af of adjacentFaces) {
        if (af === f) continue
        const cos = thisFaceNormal.dot(faceNormals[af])
        if (cos >= cosThreshold) {
          accumulated.add(faceNormals[af])
        }
      }
      const smoothedNormal = accumulated.normalize()
      normals.push(smoothedNormal.x, smoothedNormal.y, smoothedNormal.z)
      indices.push(vi++)
    }
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  result.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  result.setIndex(indices)
  return result
}

// ─── Loop subdivision ─────────────────────────────────────────────────────────

/**
 * Loop subdivision surface: each triangle is split into 4 by inserting edge
 * midpoints, and existing vertex positions are updated with Loop weights.
 * Produces smooth surfaces from coarse meshes (like SketchUp's SubD plugin).
 */
export function loopSubdivide(geo: THREE.BufferGeometry, iterations = 1): THREE.BufferGeometry {
  let current = geo.index ? geo : mergeVertices(geo)
  for (let iter = 0; iter < Math.min(iterations, 4); iter++) {
    current = _loopIteration(current)
  }
  current.computeVertexNormals()
  return current
}

function _loopIteration(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position
  const idx = geo.index!
  const vertCount = pos.count
  const faceCount = idx.count / 3

  // Build edge → midpoint map
  const edgeMidpoints = new Map<string, number>()
  const newPositions: number[] = []
  for (let i = 0; i < vertCount; i++) {
    newPositions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  }

  // Build vertex adjacency for Loop weights
  const vertNeighbors = new Map<number, Set<number>>()
  for (let f = 0; f < faceCount; f++) {
    const a = idx.getX(f * 3), b = idx.getX(f * 3 + 1), c = idx.getX(f * 3 + 2)
    if (!vertNeighbors.has(a)) vertNeighbors.set(a, new Set())
    if (!vertNeighbors.has(b)) vertNeighbors.set(b, new Set())
    if (!vertNeighbors.has(c)) vertNeighbors.set(c, new Set())
    vertNeighbors.get(a)!.add(b); vertNeighbors.get(a)!.add(c)
    vertNeighbors.get(b)!.add(a); vertNeighbors.get(b)!.add(c)
    vertNeighbors.get(c)!.add(a); vertNeighbors.get(c)!.add(b)
  }

  const getMidpoint = (a: number, b: number): number => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    if (!edgeMidpoints.has(key)) {
      const midIdx = newPositions.length / 3
      newPositions.push(
        (pos.getX(a) + pos.getX(b)) * 0.5,
        (pos.getY(a) + pos.getY(b)) * 0.5,
        (pos.getZ(a) + pos.getZ(b)) * 0.5,
      )
      edgeMidpoints.set(key, midIdx)
    }
    return edgeMidpoints.get(key)!
  }

  const newIndices: number[] = []
  for (let f = 0; f < faceCount; f++) {
    const a = idx.getX(f * 3), b = idx.getX(f * 3 + 1), c = idx.getX(f * 3 + 2)
    const ab = getMidpoint(a, b)
    const bc = getMidpoint(b, c)
    const ca = getMidpoint(c, a)
    newIndices.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
  }

  // Apply Loop weighting to original vertices
  const posArr = new Float32Array(newPositions)
  for (let v = 0; v < vertCount; v++) {
    const neighbors = vertNeighbors.get(v)
    if (!neighbors || neighbors.size === 0) continue
    const n = neighbors.size
    const beta = n === 3 ? 3.0 / 16.0 : 3.0 / (8.0 * n)
    const keep = 1 - n * beta
    let sx = 0, sy = 0, sz = 0
    for (const nb of neighbors) {
      sx += newPositions[nb * 3]
      sy += newPositions[nb * 3 + 1]
      sz += newPositions[nb * 3 + 2]
    }
    posArr[v * 3]     = keep * newPositions[v * 3]     + beta * sx
    posArr[v * 3 + 1] = keep * newPositions[v * 3 + 1] + beta * sy
    posArr[v * 3 + 2] = keep * newPositions[v * 3 + 2] + beta * sz
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  result.setIndex(newIndices)
  return result
}

// ─── Laplacian smoothing ──────────────────────────────────────────────────────

/**
 * Laplacian (umbrella) smoothing: moves each vertex toward the centroid of
 * its neighbors. Preserves topology; reduces surface noise over iterations.
 * `factor` 0–1 controls blend strength (0.5 is a typical SketchUp-style value).
 */
export function laplacianSmooth(
  geo: THREE.BufferGeometry,
  iterations = 3,
  factor = 0.5,
): THREE.BufferGeometry {
  let current = geo.index ? geo : mergeVertices(geo)
  const pos = current.attributes.position
  const idx = current.index!
  const faceCount = idx.count / 3
  const vertCount = pos.count

  // Build neighbor lists once
  const neighbors: Set<number>[] = Array.from({ length: vertCount }, () => new Set())
  for (let f = 0; f < faceCount; f++) {
    const a = idx.getX(f * 3), b = idx.getX(f * 3 + 1), c = idx.getX(f * 3 + 2)
    neighbors[a].add(b); neighbors[a].add(c)
    neighbors[b].add(a); neighbors[b].add(c)
    neighbors[c].add(a); neighbors[c].add(b)
  }

  const verts = new Float32Array(pos.array)
  const tmp = new Float32Array(vertCount * 3)

  for (let iter = 0; iter < Math.min(iterations, 20); iter++) {
    for (let v = 0; v < vertCount; v++) {
      const nb = neighbors[v]
      if (nb.size === 0) {
        tmp[v * 3] = verts[v * 3]
        tmp[v * 3 + 1] = verts[v * 3 + 1]
        tmp[v * 3 + 2] = verts[v * 3 + 2]
        continue
      }
      let cx = 0, cy = 0, cz = 0
      for (const n of nb) { cx += verts[n * 3]; cy += verts[n * 3 + 1]; cz += verts[n * 3 + 2] }
      cx /= nb.size; cy /= nb.size; cz /= nb.size
      tmp[v * 3]     = verts[v * 3]     + factor * (cx - verts[v * 3])
      tmp[v * 3 + 1] = verts[v * 3 + 1] + factor * (cy - verts[v * 3 + 1])
      tmp[v * 3 + 2] = verts[v * 3 + 2] + factor * (cz - verts[v * 3 + 2])
    }
    verts.set(tmp)
  }

  const result = current.clone()
  result.setAttribute('position', new THREE.BufferAttribute(verts.slice(), 3))
  result.computeVertexNormals()
  return result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Merge vertices that share the same position (within epsilon). Returns indexed geometry. */
function mergeVertices(geo: THREE.BufferGeometry, eps = 1e-6): THREE.BufferGeometry {
  const pos = geo.attributes.position
  const posMap = new Map<string, number>()
  const newPos: number[] = []
  const indices: number[] = []

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const key = `${Math.round(x / eps)},${Math.round(y / eps)},${Math.round(z / eps)}`
    let idx = posMap.get(key)
    if (idx === undefined) {
      idx = newPos.length / 3
      newPos.push(x, y, z)
      posMap.set(key, idx)
    }
    indices.push(idx)
  }

  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPos), 3))
  result.setIndex(indices)
  return result
}

// ─── CSGGeometryData bridge ───────────────────────────────────────────────────

export function geoToCsgData(geo: THREE.BufferGeometry): CSGGeometryData {
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const idx = geo.index

  const positions: number[] = []
  const normals: number[] = []
  for (let i = 0; i < pos.count; i++) {
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
    if (nor) normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
    else normals.push(0, 1, 0)
  }

  const indices: number[] = []
  if (idx) {
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i))
  } else {
    for (let i = 0; i < pos.count; i++) indices.push(i)
  }

  return { positions, normals, indices }
}

export function csgDataToGeo(data: CSGGeometryData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3))
  geo.setIndex(data.indices)
  return geo
}
