import * as THREE from 'three'
import type { SceneObject, PrimitiveType, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'
import { deserializeGeometry } from '../csg/BooleanOps'

const SEGMENTS = 32

export function createGeometry(
  type: Exclude<PrimitiveType, 'csg' | 'component-instance'>,
  dims: SceneObject['dimensions'],
): THREE.BufferGeometry {
  switch (type) {
    case 'box': {
      const d = dims as BoxDims
      return new THREE.BoxGeometry(d.width, d.height, d.depth)
    }
    case 'sphere': {
      const d = dims as SphereDims
      return new THREE.SphereGeometry(d.radius, SEGMENTS, SEGMENTS)
    }
    case 'cylinder': {
      const d = dims as CylinderDims
      return new THREE.CylinderGeometry(d.radius, d.radius, d.height, SEGMENTS)
    }
    case 'cone': {
      const d = dims as ConeDims
      return new THREE.ConeGeometry(d.radius, d.height, SEGMENTS)
    }
  }
}

function getGeometry(obj: SceneObject): THREE.BufferGeometry {
  if (obj.type === 'csg') {
    if (obj.csgData) return deserializeGeometry(obj.csgData)
    return new THREE.BoxGeometry(1, 1, 1)
  }
  if (obj.type === 'component-instance') {
    // Instances are rendered by SceneManager.buildInstanceGroup; fallback placeholder
    return new THREE.BoxGeometry(0.5, 0.5, 0.5)
  }
  return createGeometry(obj.type, obj.dimensions)
}

export function buildMeshGroup(obj: SceneObject, selected: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = obj.id

  const geo = getGeometry(obj)

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(obj.color),
    roughness: obj.roughness ?? 0.7,
    metalness: obj.metalness ?? 0.1,
    transparent: obj.opacity < 1,
    opacity: obj.opacity,
    side: obj.opacity < 1 ? THREE.DoubleSide : THREE.FrontSide,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = `mesh_${obj.id}`
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.objectId = obj.id
  group.add(mesh)

  // Edges — only for parametric types (CSG geometry may have too many edges)
  if (obj.type !== 'csg') {
    const edgesGeo = new THREE.EdgesGeometry(geo, 15)
    const edgesMat = new THREE.LineBasicMaterial({
      color: selected ? 0x3b82f6 : 0x1e293b,
    })
    const edges = new THREE.LineSegments(edgesGeo, edgesMat)
    edges.name = `edges_${obj.id}`
    edges.renderOrder = 1
    group.add(edges)
  }

  applyTransform(group, obj)
  return group
}

export function applyTransform(group: THREE.Object3D, obj: SceneObject) {
  group.position.set(obj.position.x, obj.position.y, obj.position.z)
  group.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation.x),
    THREE.MathUtils.degToRad(obj.rotation.y),
    THREE.MathUtils.degToRad(obj.rotation.z),
  )
  group.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
}
