import * as THREE from 'three'
import type { CSGGeometryData } from '../../types'

export function serializeGeometry(geo: THREE.BufferGeometry): CSGGeometryData {
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
