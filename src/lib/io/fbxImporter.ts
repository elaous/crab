import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import type { SceneObject, CSGGeometryData } from '../../types'
import { v4 as uuidv4 } from 'uuid'

function geometryToCSGData(geo: THREE.BufferGeometry): CSGGeometryData {
  const flat = geo.index ? geo.toNonIndexed() : geo
  flat.computeVertexNormals()
  const posAttr = flat.getAttribute('position') as THREE.BufferAttribute
  const normAttr = flat.getAttribute('normal') as THREE.BufferAttribute | undefined
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let i = 0; i < posAttr.count; i++) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    normals.push(normAttr ? normAttr.getX(i) : 0, normAttr ? normAttr.getY(i) : 1, normAttr ? normAttr.getZ(i) : 0)
    indices.push(i)
  }
  if (flat !== geo) flat.dispose()
  return { positions, normals, indices }
}

export async function importFBX(file: File): Promise<SceneObject[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const loader = new FBXLoader()
    loader.load(
      url,
      group => {
        URL.revokeObjectURL(url)
        group.updateMatrixWorld(true)
        const objects: SceneObject[] = []
        const sceneName = file.name.replace(/\.\w+$/, '')
        let idx = 0

        group.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return
          const geo = child.geometry.clone()
          geo.applyMatrix4(child.matrixWorld)

          const mat = child.material as THREE.MeshStandardMaterial | THREE.MeshPhongMaterial | THREE.MeshBasicMaterial
          const color = (mat as THREE.MeshStandardMaterial).color
            ? `#${(mat as THREE.MeshStandardMaterial).color.getHexString()}`
            : '#60a5fa'

          objects.push({
            id: uuidv4(),
            name: child.name || `${sceneName} ${++idx}`,
            type: 'imported',
            layerId: 'default',
            visible: true,
            locked: false,
            color,
            opacity: 1,
            roughness: 0.7,
            metalness: 0.1,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            dimensions: {},
            metadata: {},
            csgData: geometryToCSGData(geo),
          })
        })
        resolve(objects)
      },
      undefined,
      err => { URL.revokeObjectURL(url); reject(err) },
    )
  })
}
