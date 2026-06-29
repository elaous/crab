import * as THREE from 'three'
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import type { SceneObject, BooleanOp, CSGGeometryData } from '../../types'
import { createGeometry } from '../geometry/primitives'

const evaluator = new Evaluator()
evaluator.attributes = ['position', 'normal']

function buildBrush(obj: SceneObject): Brush {
  let geo: THREE.BufferGeometry

  if (obj.type === 'csg' && obj.csgData) {
    geo = deserializeGeometry(obj.csgData)
  } else {
    geo = createGeometry(obj.type as Exclude<typeof obj.type, 'csg' | 'component-instance'>, obj.dimensions as never)
  }

  const brush = new Brush(
    geo,
    new THREE.MeshStandardMaterial({ color: obj.color }),
  )

  // Apply object's world transform
  brush.position.set(obj.position.x, obj.position.y, obj.position.z)
  brush.rotation.set(
    THREE.MathUtils.degToRad(obj.rotation.x),
    THREE.MathUtils.degToRad(obj.rotation.y),
    THREE.MathUtils.degToRad(obj.rotation.z),
  )
  brush.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
  brush.updateMatrixWorld(true)

  return brush
}

export function performBoolean(
  objA: SceneObject,
  objB: SceneObject,
  op: BooleanOp,
): CSGGeometryData | null {
  try {
    const brushA = buildBrush(objA)
    const brushB = buildBrush(objB)

    const opMap = {
      union: ADDITION,
      subtract: SUBTRACTION,
      intersect: INTERSECTION,
    }

    const result = new Brush()
    evaluator.evaluate(brushA, brushB, opMap[op], result)
    result.updateMatrixWorld(true)

    const geo = result.geometry
    if (!geo || geo.attributes.position?.count === 0) return null

    return serializeGeometry(geo)
  } catch (err) {
    console.error('CSG operation failed:', err)
    return null
  }
}

function serializeGeometry(geo: THREE.BufferGeometry): CSGGeometryData {
  // Ensure normals exist
  if (!geo.attributes.normal) geo.computeVertexNormals()

  const positions = Array.from(geo.attributes.position.array as Float32Array)
  const normals = Array.from(geo.attributes.normal.array as Float32Array)
  const indices = geo.index
    ? Array.from(geo.index.array as Uint32Array)
    : Array.from({ length: positions.length / 3 }, (_, i) => i)

  return { positions, normals, indices }
}

export function deserializeGeometry(data: CSGGeometryData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3))
  if (data.indices.length > 0) geo.setIndex(data.indices)
  return geo
}
