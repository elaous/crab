import * as THREE from 'three'

export type SnapType = 'grid' | 'vertex' | 'midpoint' | 'face-center' | 'edge' | 'intersection' | 'none'

export interface SnapResult {
  point: THREE.Vector3
  type: SnapType
}

export class SnapEngine {
  snapToGrid(value: number, gridSize: number): number {
    if (gridSize <= 0) return value
    return Math.round(value / gridSize) * gridSize
  }

  snapValueToGrid(value: number, gridSize: number, enabled: boolean): number {
    if (!enabled || gridSize <= 0) return value
    return this.snapToGrid(value, gridSize)
  }

  /** Snap an extrusion distance to grid */
  snapDistance(dist: number, gridSize: number, enabled: boolean): number {
    if (!enabled) return dist
    return this.snapToGrid(dist, gridSize)
  }

  /** Snap an angle to the nearest multiple of snapDeg */
  snapAngle(angleDeg: number, snapDeg: number): number {
    if (snapDeg <= 0) return angleDeg
    return Math.round(angleDeg / snapDeg) * snapDeg
  }

  /** Find nearest vertex among all mesh groups, returns snap point if within threshold px */
  findNearestVertex(
    worldPt: THREE.Vector3,
    groups: Map<string, THREE.Group>,
    threshold: number,
    camera: THREE.Camera,
    screenW: number,
    screenH: number,
  ): SnapResult | null {
    let best: SnapResult | null = null
    let bestDist = Infinity

    groups.forEach(group => {
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return
        if (!child.name.startsWith('mesh_')) return
        const geo = child.geometry as THREE.BufferGeometry
        const pos = geo.attributes.position
        if (!pos) return
        const mat4 = child.matrixWorld
        for (let i = 0; i < pos.count; i++) {
          const vWorld = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4)
          const vScreen = vWorld.clone().project(camera)
          const sx = (vScreen.x * 0.5 + 0.5) * screenW
          const sy = (-vScreen.y * 0.5 + 0.5) * screenH
          const ptScreen = worldPt.clone().project(camera)
          const px = (ptScreen.x * 0.5 + 0.5) * screenW
          const py = (-ptScreen.y * 0.5 + 0.5) * screenH
          const d = Math.hypot(sx - px, sy - py)
          if (d < threshold && d < bestDist) {
            bestDist = d
            best = { point: vWorld, type: 'vertex' }
          }
        }
      })
    })

    return best
  }

  /** Find nearest edge midpoint among all mesh groups */
  findNearestMidpoint(
    worldPt: THREE.Vector3,
    groups: Map<string, THREE.Group>,
    threshold: number,
    camera: THREE.Camera,
    screenW: number,
    screenH: number,
  ): SnapResult | null {
    let best: SnapResult | null = null
    let bestDist = Infinity

    groups.forEach(group => {
      group.traverse(child => {
        if (!(child instanceof THREE.LineSegments)) return
        if (!child.name.startsWith('edges_')) return
        const geo = child.geometry as THREE.BufferGeometry
        const pos = geo.attributes.position
        if (!pos) return
        const mat4 = child.matrixWorld
        for (let i = 0; i < pos.count - 1; i += 2) {
          const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4)
          const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)).applyMatrix4(mat4)
          const mid = a.clone().lerp(b, 0.5)
          const mScreen = mid.clone().project(camera)
          const sx = (mScreen.x * 0.5 + 0.5) * screenW
          const sy = (-mScreen.y * 0.5 + 0.5) * screenH
          const ptScreen = worldPt.clone().project(camera)
          const px = (ptScreen.x * 0.5 + 0.5) * screenW
          const py = (-ptScreen.y * 0.5 + 0.5) * screenH
          const d = Math.hypot(sx - px, sy - py)
          if (d < threshold && d < bestDist) {
            bestDist = d
            best = { point: mid, type: 'midpoint' }
          }
        }
      })
    })

    return best
  }

  /** Find the center of the nearest mesh face */
  findNearestFaceCenter(
    worldPt: THREE.Vector3,
    groups: Map<string, THREE.Group>,
    threshold: number,
    camera: THREE.Camera,
    screenW: number,
    screenH: number,
  ): SnapResult | null {
    let best: SnapResult | null = null
    let bestDist = Infinity

    const ptScreen = worldPt.clone().project(camera)
    const px = (ptScreen.x * 0.5 + 0.5) * screenW
    const py = (-ptScreen.y * 0.5 + 0.5) * screenH

    groups.forEach(group => {
      group.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return
        if (!child.name.startsWith('mesh_')) return
        const geo = child.geometry as THREE.BufferGeometry
        const pos = geo.attributes.position
        if (!pos) return
        const mat4 = child.matrixWorld
        // iterate over triangles (3 verts per face)
        const count = geo.index ? geo.index.count : pos.count
        const getIdx = (i: number) => geo.index ? geo.index.getX(i) : i
        for (let i = 0; i < count; i += 3) {
          const a = new THREE.Vector3(
            pos.getX(getIdx(i)), pos.getY(getIdx(i)), pos.getZ(getIdx(i)),
          ).applyMatrix4(mat4)
          const b = new THREE.Vector3(
            pos.getX(getIdx(i + 1)), pos.getY(getIdx(i + 1)), pos.getZ(getIdx(i + 1)),
          ).applyMatrix4(mat4)
          const c = new THREE.Vector3(
            pos.getX(getIdx(i + 2)), pos.getY(getIdx(i + 2)), pos.getZ(getIdx(i + 2)),
          ).applyMatrix4(mat4)
          const center = a.clone().add(b).add(c).multiplyScalar(1 / 3)
          const cs = center.clone().project(camera)
          const sx = (cs.x * 0.5 + 0.5) * screenW
          const sy = (-cs.y * 0.5 + 0.5) * screenH
          const d = Math.hypot(sx - px, sy - py)
          if (d < threshold && d < bestDist) {
            bestDist = d
            best = { point: center, type: 'face-center' }
          }
        }
      })
    })

    return best
  }

  /** Find the closest point on any mesh edge */
  findNearestEdgePoint(
    worldPt: THREE.Vector3,
    groups: Map<string, THREE.Group>,
    threshold: number,
    camera: THREE.Camera,
    screenW: number,
    screenH: number,
  ): SnapResult | null {
    let best: SnapResult | null = null
    let bestDist = Infinity

    const ptScreen = worldPt.clone().project(camera)
    const px = (ptScreen.x * 0.5 + 0.5) * screenW
    const py = (-ptScreen.y * 0.5 + 0.5) * screenH

    groups.forEach(group => {
      group.traverse(child => {
        if (!(child instanceof THREE.LineSegments)) return
        if (!child.name.startsWith('edges_')) return
        const geo = child.geometry as THREE.BufferGeometry
        const pos = geo.attributes.position
        if (!pos) return
        const mat4 = child.matrixWorld
        for (let i = 0; i < pos.count - 1; i += 2) {
          const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4)
          const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)).applyMatrix4(mat4)
          // Find closest point on segment a-b to worldPt
          const ab = b.clone().sub(a)
          const len2 = ab.lengthSq()
          if (len2 < 1e-10) continue
          const t = Math.max(0, Math.min(1, worldPt.clone().sub(a).dot(ab) / len2))
          const closest = a.clone().addScaledVector(ab, t)
          const cs = closest.clone().project(camera)
          const sx = (cs.x * 0.5 + 0.5) * screenW
          const sy = (-cs.y * 0.5 + 0.5) * screenH
          const d = Math.hypot(sx - px, sy - py)
          if (d < threshold && d < bestDist) {
            bestDist = d
            best = { point: closest, type: 'edge' }
          }
        }
      })
    })

    return best
  }

  /** Try vertex → midpoint → face center → edge → grid fallback */
  snapBestPoint(
    worldPt: THREE.Vector3,
    groups: Map<string, THREE.Group>,
    threshold: number,
    camera: THREE.Camera,
    screenW: number,
    screenH: number,
    enabled: boolean,
  ): SnapResult {
    if (enabled) {
      const v = this.findNearestVertex(worldPt, groups, threshold, camera, screenW, screenH)
      if (v) return v
      const m = this.findNearestMidpoint(worldPt, groups, threshold, camera, screenW, screenH)
      if (m) return m
      const fc = this.findNearestFaceCenter(worldPt, groups, threshold, camera, screenW, screenH)
      if (fc) return fc
      const e = this.findNearestEdgePoint(worldPt, groups, threshold, camera, screenW, screenH)
      if (e) return e
    }
    return { point: worldPt, type: 'grid' }
  }
}
