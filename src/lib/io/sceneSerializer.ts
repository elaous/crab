import type { SceneData, SceneObject, Layer, SceneSettings, Annotation } from '../../types'

const VERSION = '1.0.0'

export function serialize(
  name: string,
  objects: Map<string, SceneObject>,
  layers: Map<string, Layer>,
  layerOrder: string[],
  settings: SceneSettings,
  snapshots: import('../../types').CameraSnapshot[] = [],
  annotations: Map<string, Annotation> = new Map(),
): SceneData {
  return {
    version: VERSION,
    name,
    objects: Array.from(objects.values()),
    layers: layerOrder.map(id => layers.get(id)!).filter(Boolean),
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
} {
  return {
    objects: data.objects,
    layers: data.layers,
    layerOrder: data.layers.map(l => l.id),
    settings: { ...data.settings },
    annotations: data.annotations ?? [],
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
  downloadBlob(blob, filename.endsWith('.crab') ? filename : filename + '.crab')
}

export function exportSTL(objects: Map<string, SceneObject>): string {
  let stl = 'solid CrabCAD\n'
  objects.forEach(obj => {
    stl += `  // object: ${obj.name}\n`
  })
  stl += 'endsolid CrabCAD\n'
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
    input.accept = '.crab,.json'
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

const AUTOSAVE_KEY = 'crabcad_autosave'

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
