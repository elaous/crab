import * as THREE from 'three'
import type { SceneObject, PrimitiveType, BoxDims, SphereDims, CylinderDims, ConeDims, LineDims, LineStyle } from '../../types'
import { deserializeGeometry } from '../csg/BooleanOps'

const SEGMENTS = 32

export function createGeometry(
  type: Exclude<PrimitiveType, 'csg' | 'component-instance' | 'line' | 'imported'>,
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

function makeDashedMaterial(style: LineStyle, color: string, width: number): THREE.LineDashedMaterial | THREE.LineBasicMaterial {
  const base = { color: new THREE.Color(color), linewidth: width }
  if (style === 'solid') return new THREE.LineBasicMaterial(base)
  const dashSize = style === 'dotted' ? 0.02 : style === 'dot-dash' ? 0.15 : 0.12
  const gapSize  = style === 'dotted' ? 0.06 : style === 'dot-dash' ? 0.06 : 0.06
  return new THREE.LineDashedMaterial({ ...base, dashSize, gapSize })
}

function buildLineGroup(obj: SceneObject, selected: boolean): THREE.Group {
  const group = new THREE.Group()
  group.name = obj.id

  const dims = obj.dimensions as LineDims
  const length = dims.length ?? 1
  const style = obj.lineStyle ?? 'solid'
  const width = obj.lineWidth ?? 1
  const color = selected ? '#3b82f6' : obj.color

  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0)]
  const geo = new THREE.BufferGeometry().setFromPoints(points)

  if (style === 'double') {
    const offset = 0.02
    const pts1 = [new THREE.Vector3(-offset, 0, 0), new THREE.Vector3(-offset, length, 0)]
    const pts2 = [new THREE.Vector3(offset, 0, 0), new THREE.Vector3(offset, length, 0)]
    const geo1 = new THREE.BufferGeometry().setFromPoints(pts1)
    const geo2 = new THREE.BufferGeometry().setFromPoints(pts2)
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: width })
    const line1 = new THREE.Line(geo1, mat)
    const line2 = new THREE.Line(geo2, mat.clone())
    line1.name = `line_a_${obj.id}`
    line2.name = `line_b_${obj.id}`
    group.add(line1, line2)
  } else {
    const mat = makeDashedMaterial(style, color, width)
    const line = new THREE.Line(geo, mat)
    line.computeLineDistances()
    line.name = `line_${obj.id}`
    group.add(line)
  }

  applyTransform(group, obj)
  return group
}

function getGeometry(obj: SceneObject): THREE.BufferGeometry {
  if (obj.type === 'csg' || obj.type === 'imported') {
    if (obj.csgData) return deserializeGeometry(obj.csgData)
    return new THREE.BoxGeometry(1, 1, 1)
  }
  if (obj.type === 'component-instance' || obj.type === 'line') {
    return new THREE.BoxGeometry(0.5, 0.5, 0.5)
  }
  return createGeometry(obj.type, obj.dimensions)
}

export function buildMeshGroup(obj: SceneObject, selected: boolean): THREE.Group {
  if (obj.type === 'line') return buildLineGroup(obj, selected)

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
  mesh.userData.baseOpacity = obj.opacity
  group.add(mesh)

  // Edges — only for parametric types (CSG/imported geometry may have too many edges)
  if (obj.type !== 'csg' && obj.type !== 'imported') {
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
