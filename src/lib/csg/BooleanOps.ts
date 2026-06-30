import * as THREE from 'three'
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg'
import type { SceneObject, BooleanOp, CSGGeometryData } from '../../types'
import { createGeometry } from '../geometry/primitives'
import { serializeGeometry, deserializeGeometry } from './geometry'

const evaluator = new Evaluator()
evaluator.attributes = ['position', 'normal']

function buildBrush(obj: SceneObject): Brush {
  let geo: THREE.BufferGeometry

  if (obj.type === 'csg' && obj.csgData) {
    geo = deserializeGeometry(obj.csgData)
  } else {
    geo = createGeometry(obj.type as Exclude<typeof obj.type, 'csg' | 'component-instance' | 'line' | 'imported'>, obj.dimensions as never)
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

export { serializeGeometry, deserializeGeometry }
