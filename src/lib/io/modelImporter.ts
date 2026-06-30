import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import type { SceneObject, CSGGeometryData } from '../../types'
import { v4 as uuidv4 } from 'uuid'

function geometryToCSGData(geo: THREE.BufferGeometry): CSGGeometryData {
  const indexed = geo.index ? geo : geo.toNonIndexed()
  const posAttr = indexed.getAttribute('position') as THREE.BufferAttribute
  const normAttr = indexed.getAttribute('normal') as THREE.BufferAttribute | undefined

  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  for (let i = 0; i < posAttr.count; i++) {
    positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
    if (normAttr) {
      normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i))
    } else {
      normals.push(0, 1, 0)
    }
    indices.push(i)
  }

  return { positions, normals, indices }
}

function extractMeshes(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverse(child => {
    if (child instanceof THREE.Mesh) meshes.push(child)
  })
  return meshes
}

function meshToSceneObject(mesh: THREE.Mesh, name: string, index: number): SceneObject {
  const color = (mesh.material instanceof THREE.MeshStandardMaterial || mesh.material instanceof THREE.MeshPhongMaterial)
    ? `#${(mesh.material.color as THREE.Color).getHexString()}`
    : '#60a5fa'

  const geo = mesh.geometry.clone()
  geo.applyMatrix4(mesh.matrixWorld)

  return {
    id: uuidv4(),
    name: mesh.name || `${name} ${index + 1}`,
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
  }
}

export async function importGLTF(file: File): Promise<SceneObject[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const loader = new GLTFLoader()
    loader.load(
      url,
      gltf => {
        URL.revokeObjectURL(url)
        gltf.scene.updateMatrixWorld(true)
        const meshes = extractMeshes(gltf.scene)
        const sceneName = file.name.replace(/\.\w+$/, '')
        resolve(meshes.map((m, i) => meshToSceneObject(m, sceneName, i)))
      },
      undefined,
      err => { URL.revokeObjectURL(url); reject(err) },
    )
  })
}

export async function importOBJ(file: File): Promise<SceneObject[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target?.result as string
        const loader = new OBJLoader()
        const obj = loader.parse(text)
        obj.updateMatrixWorld(true)
        const meshes = extractMeshes(obj)
        const sceneName = file.name.replace(/\.\w+$/, '')
        resolve(meshes.map((m, i) => meshToSceneObject(m, sceneName, i)))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export async function importModel(file: File): Promise<SceneObject[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'glb' || ext === 'gltf') return importGLTF(file)
  if (ext === 'obj') return importOBJ(file)
  if (ext === 'skp') throw new Error(
    'SketchUp .skp files must be exported first.\n\nIn SketchUp: File → Export → 3D Model → .glb or .obj\nThen import that file here.',
  )
  throw new Error(`Unsupported format: .${ext}`)
}

export function openModelFilePicker(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.glb,.gltf,.obj,.skp'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
