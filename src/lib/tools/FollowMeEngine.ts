import * as THREE from 'three'
import type { CSGGeometryData, Vec3 } from '../../types'

/**
 * Follow Me: sweep a 2D cross-section profile along a 3D path.
 *
 * The profile is a rectangle defined by width × height.
 * The path is a series of 3D waypoints interpolated by a CatmullRomCurve3.
 * Returns CSGGeometryData so the result can be stored as an 'imported' SceneObject.
 */
export function sweepProfile(
  profileWidth: number,
  profileHeight: number,
  pathPoints: Vec3[],
  steps = 64,
): CSGGeometryData | null {
  if (pathPoints.length < 2) return null

  const shape = new THREE.Shape()
  const hw = profileWidth / 2
  const hh = profileHeight / 2
  shape.moveTo(-hw, -hh)
  shape.lineTo(hw, -hh)
  shape.lineTo(hw, hh)
  shape.lineTo(-hw, hh)
  shape.closePath()

  const curve = new THREE.CatmullRomCurve3(
    pathPoints.map(p => new THREE.Vector3(p.x, p.y, p.z)),
  )

  const geo = new THREE.ExtrudeGeometry(shape, {
    extrudePath: curve,
    steps: Math.max(steps, (pathPoints.length - 1) * 8),
    bevelEnabled: false,
  })

  // Convert to non-indexed so we can read positions/normals
  const flat = geo.toNonIndexed()
  flat.computeVertexNormals()

  const posAttr = flat.getAttribute('position') as THREE.BufferAttribute
  const normAttr = flat.getAttribute('normal') as THREE.BufferAttribute

  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (let i = 0; i < posAttr.count; i++) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
    indices.push(i)
  }

  geo.dispose()
  flat.dispose()

  return { positions, normals, indices }
}

/**
 * Lathe: revolve a 2D profile (cross-section points on the XY plane)
 * around the Y axis by `segments` steps.
 */
export function latheProfile(
  points: Vec3[],
  segments = 32,
  phiStart = 0,
  phiLength = Math.PI * 2,
): CSGGeometryData | null {
  if (points.length < 2) return null

  const lathePoints = points.map(p => new THREE.Vector2(p.x, p.y))
  const geo = new THREE.LatheGeometry(lathePoints, segments, phiStart, phiLength)
  const flat = geo.toNonIndexed()
  flat.computeVertexNormals()

  const posAttr = flat.getAttribute('position') as THREE.BufferAttribute
  const normAttr = flat.getAttribute('normal') as THREE.BufferAttribute
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (let i = 0; i < posAttr.count; i++) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
    indices.push(i)
  }

  geo.dispose()
  flat.dispose()

  return { positions, normals, indices }
}
