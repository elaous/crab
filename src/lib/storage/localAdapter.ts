import type { StorageAdapter, SceneEntry } from './types'

const PREFIX = 'crabcad-scene:'
const INDEX_KEY = 'crabcad-scene-index'

function getIndex(): SceneEntry[] {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]') as SceneEntry[] }
  catch { return [] }
}

function setIndex(entries: SceneEntry[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries))
}

export const localAdapter: StorageAdapter = {
  async save(id, name, bytes) {
    // Store as base64
    let binary = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    localStorage.setItem(PREFIX + id, btoa(binary))

    const index = getIndex().filter(e => e.id !== id)
    index.unshift({ id, name, updatedAt: new Date().toISOString() })
    setIndex(index)
  },

  async load(id) {
    const raw = localStorage.getItem(PREFIX + id)
    if (!raw) return null
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const entry = getIndex().find(e => e.id === id)
    return { name: entry?.name ?? 'Untitled', bytes }
  },

  async list() {
    return getIndex()
  },

  async delete(id) {
    localStorage.removeItem(PREFIX + id)
    setIndex(getIndex().filter(e => e.id !== id))
  },
}
