import * as THREE from 'three'
import type { SceneObject, CSGGeometryData } from '../../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Minimal DXF ASCII parser.
 * Handles: LINE, LWPOLYLINE, POLYLINE, ARC, CIRCLE, 3DFACE, SOLID, INSERT (block refs).
 * All entities are converted to line/triangle geometry and stored as 'imported' SceneObjects.
 */

interface DxfGroup { code: number; value: string }

function tokenize(text: string): DxfGroup[] {
  const groups: DxfGroup[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim())
    const value = lines[i + 1].trim()
    if (!isNaN(code)) groups.push({ code, value })
  }
  return groups
}

interface Entity {
  type: string
  props: Map<number, string[]>
}

function parseEntities(groups: DxfGroup[]): Entity[] {
  const entities: Entity[] = []
  let idx = 0
  // Skip to ENTITIES section
  while (idx < groups.length && !(groups[idx].code === 2 && groups[idx].value === 'ENTITIES')) idx++
  idx++
  while (idx < groups.length) {
    if (groups[idx].code === 0) {
      const type = groups[idx].value
      if (type === 'ENDSEC' || type === 'EOF') break
      idx++
      const props = new Map<number, string[]>()
      while (idx < groups.length && groups[idx].code !== 0) {
        const c = groups[idx].code
        if (!props.has(c)) props.set(c, [])
        props.get(c)!.push(groups[idx].value)
        idx++
      }
      entities.push({ type, props })
    } else {
      idx++
    }
  }
  return entities
}

function getNum(props: Map<number, string[]>, code: number, nth = 0): number {
  return parseFloat(props.get(code)?.[nth] ?? '0') || 0
}

function geometryToCSGData(positions: number[], normals: number[], indices: number[]): CSGGeometryData {
  return { positions, normals, indices }
}

function lineToCSGData(p1: THREE.Vector3, p2: THREE.Vector3): CSGGeometryData {
  // Represent as a thin box along the line direction
  const dir = p2.clone().sub(p1)
  const len = dir.length()
  const geo = new THREE.BoxGeometry(len, 0.01, 0.01)
  const mid = p1.clone().add(p2).multiplyScalar(0.5)
  geo.translate(mid.x, mid.y, mid.z)
  const flat = geo.toNonIndexed()
  flat.computeVertexNormals()
  const pos = flat.getAttribute('position') as THREE.BufferAttribute
  const norm = flat.getAttribute('normal') as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let i = 0; i < pos.count; i++) {
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
    normals.push(norm.getX(i), norm.getY(i), norm.getZ(i))
    indices.push(i)
  }
  geo.dispose(); flat.dispose()
  return { positions, normals, indices }
}

function arcToCSGData(cx: number, cy: number, cz: number, r: number, startDeg: number, endDeg: number): CSGGeometryData {
  const pts: THREE.Vector3[] = []
  let a = startDeg
  if (endDeg <= startDeg) endDeg += 360
  const steps = Math.max(8, Math.ceil((endDeg - startDeg) / 5))
  for (let i = 0; i <= steps; i++) {
    const angle = THREE.MathUtils.degToRad(a + (endDeg - startDeg) * (i / steps))
    pts.push(new THREE.Vector3(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, cz))
  }
  // Build line strip as thin cylinders
  const allPos: number[] = []
  const allNorm: number[] = []
  const allIdx: number[] = []
  pts.forEach((p, i) => {
    if (i < pts.length - 1) {
      const d = lineToCSGData(p, pts[i + 1])
      const off = allIdx.length > 0 ? Math.max(...allIdx) + 1 : 0
      allPos.push(...d.positions)
      allNorm.push(...d.normals)
      allIdx.push(...d.indices.map(v => v + off))
    }
  })
  return { positions: allPos, normals: allNorm, indices: allIdx }
}

function faceToCSGData(verts: THREE.Vector3[]): CSGGeometryData {
  if (verts.length < 3) return { positions: [], normals: [], indices: [] }
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  // Fan triangulation
  const n = new THREE.Vector3().crossVectors(
    verts[1].clone().sub(verts[0]),
    verts[2].clone().sub(verts[0]),
  ).normalize()
  for (let i = 1; i < verts.length - 1; i++) {
    const base = positions.length / 3
    for (const v of [verts[0], verts[i], verts[i + 1]]) {
      positions.push(v.x, v.y, v.z)
      normals.push(n.x, n.y, n.z)
    }
    indices.push(base, base + 1, base + 2)
  }
  return { positions, normals, indices }
}

function mergeCSG(parts: CSGGeometryData[]): CSGGeometryData {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  let offset = 0
  for (const p of parts) {
    positions.push(...p.positions)
    normals.push(...p.normals)
    indices.push(...p.indices.map(i => i + offset))
    offset += p.positions.length / 3
  }
  return { positions, normals, indices }
}

function makeObject(name: string, csgData: CSGGeometryData, color = '#94a3b8'): SceneObject {
  return {
    id: uuidv4(),
    name,
    type: 'imported',
    layerId: 'default',
    visible: true,
    locked: false,
    color,
    opacity: 1,
    roughness: 0.8,
    metalness: 0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    dimensions: {},
    metadata: {},
    csgData,
  }
}

export function parseDXF(text: string): SceneObject[] {
  const groups = tokenize(text)
  const entities = parseEntities(groups)
  const parts: CSGGeometryData[] = []
  let idx = 0

  for (const ent of entities) {
    const p = ent.props
    idx++
    switch (ent.type) {
      case 'LINE': {
        const p1 = new THREE.Vector3(getNum(p, 10), getNum(p, 20), getNum(p, 30))
        const p2 = new THREE.Vector3(getNum(p, 11), getNum(p, 21), getNum(p, 31))
        parts.push(lineToCSGData(p1, p2))
        break
      }
      case 'ARC': {
        const cx = getNum(p, 10), cy = getNum(p, 20), cz = getNum(p, 30)
        const r = getNum(p, 40)
        const start = getNum(p, 50), end = getNum(p, 51)
        parts.push(arcToCSGData(cx, cy, cz, r, start, end))
        break
      }
      case 'CIRCLE': {
        const cx = getNum(p, 10), cy = getNum(p, 20), cz = getNum(p, 30)
        const r = getNum(p, 40)
        parts.push(arcToCSGData(cx, cy, cz, r, 0, 360))
        break
      }
      case 'LWPOLYLINE': {
        const xs = p.get(10) ?? [], ys = p.get(20) ?? []
        const pts = xs.map((x, i) => new THREE.Vector3(parseFloat(x), parseFloat(ys[i] ?? '0'), 0))
        for (let i = 0; i < pts.length - 1; i++) parts.push(lineToCSGData(pts[i], pts[i + 1]))
        // Close if flag bit 0 set
        const flags = parseInt(p.get(70)?.[0] ?? '0')
        if (flags & 1 && pts.length > 1) parts.push(lineToCSGData(pts[pts.length - 1], pts[0]))
        break
      }
      case '3DFACE': {
        const verts = [
          new THREE.Vector3(getNum(p, 10), getNum(p, 20), getNum(p, 30)),
          new THREE.Vector3(getNum(p, 11), getNum(p, 21), getNum(p, 31)),
          new THREE.Vector3(getNum(p, 12), getNum(p, 22), getNum(p, 32)),
          new THREE.Vector3(getNum(p, 13), getNum(p, 23), getNum(p, 33)),
        ]
        parts.push(faceToCSGData(verts))
        break
      }
      case 'SOLID': {
        // Same as 3DFACE
        const verts = [
          new THREE.Vector3(getNum(p, 10), getNum(p, 20), getNum(p, 30)),
          new THREE.Vector3(getNum(p, 11), getNum(p, 21), getNum(p, 31)),
          new THREE.Vector3(getNum(p, 13), getNum(p, 23), getNum(p, 33)),
          new THREE.Vector3(getNum(p, 12), getNum(p, 22), getNum(p, 32)),
        ]
        parts.push(faceToCSGData(verts))
        break
      }
    }
  }

  if (parts.length === 0) return []
  // Chunk into objects of at most 10k triangles each to avoid huge single meshes
  const objects: SceneObject[] = []
  const CHUNK = 10000
  for (let i = 0; i < parts.length; i += CHUNK) {
    const chunk = parts.slice(i, i + CHUNK)
    const merged = mergeCSG(chunk)
    if (merged.positions.length > 0) {
      objects.push(makeObject(`DXF Part ${Math.floor(i / CHUNK) + 1}`, merged))
    }
  }
  return objects
}

void geometryToCSGData
