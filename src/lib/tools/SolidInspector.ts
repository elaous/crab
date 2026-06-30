import type { SceneObject, CSGGeometryData } from '../../types'

export interface SolidIssue {
  type: 'non-manifold-edge' | 'degenerate-triangle' | 'open-surface' | 'duplicate-vertex'
  count: number
  description: string
}

export interface InspectionResult {
  objectId: string
  name: string
  issues: SolidIssue[]
  isManifold: boolean
  triangleCount: number
  vertexCount: number
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function vec3Key(positions: number[], idx: number): string {
  const x = positions[idx * 3].toFixed(5)
  const y = positions[idx * 3 + 1].toFixed(5)
  const z = positions[idx * 3 + 2].toFixed(5)
  return `${x},${y},${z}`
}

function triangleArea(p: number[], i0: number, i1: number, i2: number): number {
  const ax = p[i0 * 3], ay = p[i0 * 3 + 1], az = p[i0 * 3 + 2]
  const bx = p[i1 * 3], by = p[i1 * 3 + 1], bz = p[i1 * 3 + 2]
  const cx = p[i2 * 3], cy = p[i2 * 3 + 1], cz = p[i2 * 3 + 2]
  const abx = bx - ax, aby = by - ay, abz = bz - az
  const acx = cx - ax, acy = cy - ay, acz = cz - az
  const nx = aby * acz - abz * acy
  const ny = abz * acx - abx * acz
  const nz = abx * acy - aby * acx
  return Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5
}

export function inspectObject(obj: SceneObject): InspectionResult {
  const result: InspectionResult = {
    objectId: obj.id,
    name: obj.name,
    issues: [],
    isManifold: true,
    triangleCount: 0,
    vertexCount: 0,
  }

  const data: CSGGeometryData | undefined = obj.csgData
  if (!data || data.positions.length === 0) {
    // Parametric types (box, sphere, etc.) are always manifold by construction
    result.isManifold = true
    return result
  }

  const { positions, indices } = data
  result.vertexCount = positions.length / 3
  result.triangleCount = indices.length / 3

  // Build vertex position → canonical index map (deduplication)
  const posKeyToCanon = new Map<string, number>()
  const vertexRemap: number[] = new Array(positions.length / 3)
  let dupCount = 0
  for (let i = 0; i < positions.length / 3; i++) {
    const key = vec3Key(positions, i)
    if (posKeyToCanon.has(key)) {
      vertexRemap[i] = posKeyToCanon.get(key)!
      dupCount++
    } else {
      posKeyToCanon.set(key, i)
      vertexRemap[i] = i
    }
  }
  if (dupCount > 0) {
    result.issues.push({ type: 'duplicate-vertex', count: dupCount, description: `${dupCount} duplicate vertex positions` })
  }

  // Count degenerate triangles (near-zero area)
  let degenCount = 0
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = indices[t], i1 = indices[t + 1], i2 = indices[t + 2]
    if (triangleArea(positions, i0, i1, i2) < 1e-9) degenCount++
  }
  if (degenCount > 0) {
    result.issues.push({ type: 'degenerate-triangle', count: degenCount, description: `${degenCount} zero-area triangle(s)` })
  }

  // Check manifold: every edge (canonical) shared by exactly 2 triangles
  const edgeCount = new Map<string, number>()
  for (let t = 0; t < indices.length; t += 3) {
    const i0 = vertexRemap[indices[t]]
    const i1 = vertexRemap[indices[t + 1]]
    const i2 = vertexRemap[indices[t + 2]]
    for (const key of [edgeKey(i0, i1), edgeKey(i1, i2), edgeKey(i2, i0)]) {
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1)
    }
  }

  let nonManifoldEdges = 0
  let openEdges = 0
  for (const count of edgeCount.values()) {
    if (count === 1) openEdges++
    else if (count > 2) nonManifoldEdges++
  }

  if (openEdges > 0) {
    result.issues.push({ type: 'open-surface', count: openEdges, description: `${openEdges} boundary edge(s) — mesh is not closed` })
    result.isManifold = false
  }
  if (nonManifoldEdges > 0) {
    result.issues.push({ type: 'non-manifold-edge', count: nonManifoldEdges, description: `${nonManifoldEdges} non-manifold edge(s) — shared by >2 faces` })
    result.isManifold = false
  }

  return result
}

export function inspectScene(objects: Map<string, SceneObject>): InspectionResult[] {
  return Array.from(objects.values())
    .filter(o => o.visible && (o.type === 'imported' || o.type === 'csg'))
    .map(inspectObject)
}
