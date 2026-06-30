import * as THREE from 'three'
import type { SceneObject, ComponentDef } from '../../types'
import { createGeometry } from '../geometry/primitives.js'

/**
 * Groups component instances that share the same ComponentDef and builds a
 * single THREE.InstancedMesh per group, reducing draw calls dramatically for
 * scenes with many repeated components (chairs, columns, bolts, etc.).
 *
 * Returns a Map of defId → InstancedMesh. Caller is responsible for adding
 * them to the scene and disposing when they become stale.
 */
export function buildInstancedMeshes(
  objects: Map<string, SceneObject>,
  componentDefs: Map<string, ComponentDef>,
): Map<string, THREE.InstancedMesh> {
  const result = new Map<string, THREE.InstancedMesh>()

  // Group instances by defId
  const byDef = new Map<string, SceneObject[]>()
  objects.forEach(obj => {
    if (obj.type === 'component-instance' && obj.componentDefId && obj.visible) {
      const list = byDef.get(obj.componentDefId) ?? []
      list.push(obj)
      byDef.set(obj.componentDefId, list)
    }
  })

  byDef.forEach((instances, defId) => {
    const def = componentDefs.get(defId)
    if (!def || def.objects.length === 0) return

    // Merge definition geometry into a single buffer
    const merged = mergeDefGeometry(def)
    if (!merged) return

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color),
      roughness: 0.7,
      metalness: 0.1,
    })

    const mesh = new THREE.InstancedMesh(merged, mat, instances.length)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.name = `instanced_${defId}`

    const dummy = new THREE.Object3D()
    instances.forEach((obj, i) => {
      dummy.position.set(obj.position.x, obj.position.y, obj.position.z)
      dummy.rotation.set(
        THREE.MathUtils.degToRad(obj.rotation.x),
        THREE.MathUtils.degToRad(obj.rotation.y),
        THREE.MathUtils.degToRad(obj.rotation.z),
      )
      dummy.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true

    result.set(defId, mesh)
  })

  return result
}

function mergeDefGeometry(def: ComponentDef): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = []
  for (const obj of def.objects) {
    if (obj.type === 'csg' || obj.type === 'imported' || obj.type === 'line' || obj.type === 'component-instance') continue
    try {
      const geo = createGeometry(
        obj.type as Exclude<typeof obj.type, 'csg' | 'imported' | 'line' | 'component-instance'>,
        obj.dimensions,
      )
      const mat4 = new THREE.Matrix4()
      mat4.compose(
        new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(
          THREE.MathUtils.degToRad(obj.rotation.x),
          THREE.MathUtils.degToRad(obj.rotation.y),
          THREE.MathUtils.degToRad(obj.rotation.z),
        )),
        new THREE.Vector3(obj.scale.x, obj.scale.y, obj.scale.z),
      )
      geo.applyMatrix4(mat4)
      geos.push(geo)
    } catch { /* skip unsupported shapes */ }
  }
  if (geos.length === 0) return null
  return mergeBufferGeometries(geos)
}

function mergeBufferGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry()
  let totalVerts = 0
  let totalIdx = 0
  for (const g of geos) {
    totalVerts += g.attributes.position.count
    if (g.index) totalIdx += g.index.count
  }

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null

  let vOff = 0, iOff = 0, baseVert = 0
  for (const g of geos) {
    const pos = g.attributes.position.array as Float32Array
    positions.set(pos, vOff * 3)
    if (g.attributes.normal) {
      const nor = g.attributes.normal.array as Float32Array
      normals.set(nor, vOff * 3)
    }
    if (g.index && indices) {
      const idx = g.index.array
      for (let i = 0; i < idx.length; i++) {
        indices[iOff + i] = idx[i] + baseVert
      }
      iOff += idx.length
    }
    baseVert += pos.length / 3
    vOff += g.attributes.position.count
  }

  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1))
  merged.computeVertexNormals()
  return merged
}
