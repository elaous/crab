import * as THREE from 'three'
import type { SceneData, SceneObject, Layer, SceneSettings, Annotation, Assembly, ComponentDef, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'
import { deserializeGeometry } from '../csg/BooleanOps'

const VERSION = '1.0.0'

export function serialize(
  name: string,
  objects: Map<string, SceneObject>,
  layers: Map<string, Layer>,
  layerOrder: string[],
  settings: SceneSettings,
  snapshots: import('../../types').CameraSnapshot[] = [],
  annotations: Map<string, Annotation> = new Map(),
  assemblies: Map<string, Assembly> = new Map(),
  componentDefs: Map<string, ComponentDef> = new Map(),
): SceneData {
  return {
    version: VERSION,
    name,
    objects: Array.from(objects.values()),
    layers: layerOrder.map(id => layers.get(id)!).filter(Boolean),
    assemblies: Array.from(assemblies.values()),
    componentDefs: Array.from(componentDefs.values()),
    settings,
    snapshots,
    annotations: Array.from(annotations.values()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function deserialize(data: SceneData): {
  objects: SceneObject[]
  layers: Layer[]
  layerOrder: string[]
  settings: SceneSettings
  annotations: Annotation[]
  assemblies: Assembly[]
  componentDefs: ComponentDef[]
} {
  return {
    objects: data.objects,
    layers: data.layers,
    layerOrder: data.layers.map(l => l.id),
    settings: { ...data.settings },
    annotations: data.annotations ?? [],
    assemblies: data.assemblies ?? [],
    componentDefs: data.componentDefs ?? [],
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJSON(data: SceneData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  downloadBlob(blob, filename.endsWith('.facet') ? filename : filename + '.facet')
}

function getGeometryForObj(obj: SceneObject): THREE.BufferGeometry | null {
  if (obj.type === 'csg') {
    if (!obj.csgData) return null
    return deserializeGeometry(obj.csgData)
  }
  if (obj.type === 'component-instance') return null

  const SEGMENTS = 32
  switch (obj.type) {
    case 'box': {
      const d = obj.dimensions as BoxDims
      return new THREE.BoxGeometry(d.width, d.height, d.depth)
    }
    case 'sphere': {
      const d = obj.dimensions as SphereDims
      return new THREE.SphereGeometry(d.radius, SEGMENTS, SEGMENTS)
    }
    case 'cylinder': {
      const d = obj.dimensions as CylinderDims
      return new THREE.CylinderGeometry(d.radius, d.radius, d.height, SEGMENTS)
    }
    case 'cone': {
      const d = obj.dimensions as ConeDims
      return new THREE.ConeGeometry(d.radius, d.height, SEGMENTS)
    }
    default:
      return null
  }
}

export function exportSTL(objects: Map<string, SceneObject>): string {
  let stl = 'solid Facet 3D\n'

  objects.forEach(obj => {
    const geo = getGeometryForObj(obj)
    if (!geo) return

    // Build world matrix from obj transform
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
    const normalMat = new THREE.Matrix3().getNormalMatrix(mat4)

    // Convert to non-indexed for easy triangle iteration
    const indexedGeo = geo.index ? geo : geo
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo
    const pos = nonIndexed.attributes.position as THREE.BufferAttribute
    const norms = nonIndexed.attributes.normal as THREE.BufferAttribute | undefined

    for (let i = 0; i < pos.count; i += 3) {
      const v0 = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4)
      const v1 = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)).applyMatrix4(mat4)
      const v2 = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)).applyMatrix4(mat4)

      let normal: THREE.Vector3
      if (norms) {
        normal = new THREE.Vector3(norms.getX(i), norms.getY(i), norms.getZ(i))
          .applyMatrix3(normalMat)
          .normalize()
      } else {
        const edge1 = v1.clone().sub(v0)
        const edge2 = v2.clone().sub(v0)
        normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
      }

      stl += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`
      stl += '    outer loop\n'
      stl += `      vertex ${v0.x.toFixed(6)} ${v0.y.toFixed(6)} ${v0.z.toFixed(6)}\n`
      stl += `      vertex ${v1.x.toFixed(6)} ${v1.y.toFixed(6)} ${v1.z.toFixed(6)}\n`
      stl += `      vertex ${v2.x.toFixed(6)} ${v2.y.toFixed(6)} ${v2.z.toFixed(6)}\n`
      stl += '    endloop\n'
      stl += '  endfacet\n'
    }

    nonIndexed.dispose()
    if (geo !== indexedGeo) geo.dispose()
    else geo.dispose()
  })

  stl += 'endsolid Facet 3D\n'
  return stl
}

export function downloadSTL(objects: Map<string, SceneObject>, filename: string) {
  const content = exportSTL(objects)
  downloadBlob(new Blob([content], { type: 'application/octet-stream' }), filename + '.stl')
}

export function exportCSV(objects: Map<string, SceneObject>): string {
  const header = 'Name,Type,PosX,PosY,PosZ,RotX,RotY,RotZ,ScaleX,ScaleY,ScaleZ,Color,Opacity,Material,Notes'
  const rows = Array.from(objects.values()).map(obj => [
    `"${obj.name}"`,
    obj.type,
    obj.position.x.toFixed(3),
    obj.position.y.toFixed(3),
    obj.position.z.toFixed(3),
    obj.rotation.x.toFixed(3),
    obj.rotation.y.toFixed(3),
    obj.rotation.z.toFixed(3),
    obj.scale.x.toFixed(3),
    obj.scale.y.toFixed(3),
    obj.scale.z.toFixed(3),
    obj.color,
    obj.opacity.toFixed(2),
    `"${obj.metadata.material ?? ''}"`,
    `"${obj.metadata.notes ?? ''}"`,
  ].join(','))
  return [header, ...rows].join('\n')
}

export function downloadCSV(objects: Map<string, SceneObject>, filename: string) {
  const content = exportCSV(objects)
  downloadBlob(new Blob([content], { type: 'text/csv' }), filename + '_bom.csv')
}

export async function loadFromFile(): Promise<SceneData | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.facet,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { resolve(null); return }
      const text = await file.text()
      try {
        const data = JSON.parse(text) as SceneData
        resolve(data)
      } catch {
        alert('Invalid file format')
        resolve(null)
      }
    }
    input.click()
  })
}

const AUTOSAVE_KEY = 'facet3d_autosave'

export function autosave(data: SceneData) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

export function loadAutosave(): SceneData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SceneData
  } catch {
    return null
  }
}
