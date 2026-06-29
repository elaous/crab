import type { SceneData, SceneObject, Layer, SceneSettings } from '../../types'

const VERSION = '1.0.0'

export function serialize(
  name: string,
  objects: Map<string, SceneObject>,
  layers: Map<string, Layer>,
  layerOrder: string[],
  settings: SceneSettings,
): SceneData {
  return {
    version: VERSION,
    name,
    objects: Array.from(objects.values()),
    layers: layerOrder.map(id => layers.get(id)!).filter(Boolean),
    settings,
    snapshots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function deserialize(data: SceneData): {
  objects: SceneObject[]
  layers: Layer[]
  layerOrder: string[]
  settings: SceneSettings
} {
  return {
    objects: data.objects,
    layers: data.layers,
    layerOrder: data.layers.map(l => l.id),
    settings: data.settings,
  }
}

export function downloadJSON(data: SceneData, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.crab') ? filename : filename + '.crab'
  a.click()
  URL.revokeObjectURL(url)
}

export function exportSTL(objects: Map<string, SceneObject>): string {
  let stl = 'solid CrabCAD\n'
  // Placeholder: real STL export happens via geometry kernel
  objects.forEach(obj => {
    stl += `  // object: ${obj.name}\n`
  })
  stl += 'endsolid CrabCAD\n'
  return stl
}

export function downloadSTL(objects: Map<string, SceneObject>, filename: string) {
  const content = exportSTL(objects)
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename + '.stl'
  a.click()
  URL.revokeObjectURL(url)
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
