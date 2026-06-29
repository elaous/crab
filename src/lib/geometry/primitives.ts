import * as THREE from 'three'
import type { SceneObject, PrimitiveType, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'

const SEGMENTS = 32

export function createGeometry(type: PrimitiveType, dims: SceneObject['dimensions']): THREE.BufferGeometry {
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

export function createEdgesGeometry(geo: THREE.BufferGeometry): THREE.EdgesGeometry {
  return new THREE.EdgesGeometry(geo, 15)
}

export function buildMeshGroup(obj: SceneObject, selected: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = obj.id

  const geo = createGeometry(obj.type, obj.dimensions)

  const color = new THREE.Color(obj.color)
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.1,
    transparent: obj.opacity < 1,
    opacity: obj.opacity,
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = `mesh_${obj.id}`
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.objectId = obj.id
  group.add(mesh)

  const edgesGeo = createEdgesGeometry(geo)
  const edgesMat = new THREE.LineBasicMaterial({
    color: selected ? 0x3b82f6 : 0x1e293b,
    linewidth: 1,
  })
  const edges = new THREE.LineSegments(edgesGeo, edgesMat)
  edges.name = `edges_${obj.id}`
  edges.renderOrder = 1
  group.add(edges)

  if (selected) {
    const selMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.15,
      depthTest: true,
    })
    const selMesh = new THREE.Mesh(geo.clone(), selMat)
    selMesh.name = `sel_${obj.id}`
    selMesh.scale.multiplyScalar(1.002)
    group.add(selMesh)
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

export function updateMeshColor(group: THREE.Group, color: string) {
  group.traverse(child => {
    if (child instanceof THREE.Mesh && child.name.startsWith('mesh_')) {
      ;(child.material as THREE.MeshStandardMaterial).color.set(color)
    }
  })
}
