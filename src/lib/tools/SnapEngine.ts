import * as THREE from 'three'

export type SnapType = 'grid' | 'vertex' | 'midpoint' | 'none'

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
}
