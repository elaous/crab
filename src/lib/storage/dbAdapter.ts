import type { StorageAdapter, SceneEntry } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined ?? '').replace(/\/$/, '')

function url(path: string) { return `${BASE}/api${path}` }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('facet3d-api-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function assertOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Facet 3D API ${res.status}: ${text}`)
  }
}

export const dbAdapter: StorageAdapter = {
  async save(id, name, bytes) {
    const res = await fetch(url(`/scenes/${id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Scene-Name': encodeURIComponent(name),
        ...authHeaders(),
      },
      body: bytes.buffer as ArrayBuffer,
    })
    await assertOk(res)
  },

  async load(id) {
    const res = await fetch(url(`/scenes/${id}`), { headers: authHeaders() })
    if (res.status === 404) return null
    await assertOk(res)
    const buf = await res.arrayBuffer()
    const nameHeader = res.headers.get('X-Scene-Name')
    const name = nameHeader ? decodeURIComponent(nameHeader) : 'Untitled'
    return { name, bytes: new Uint8Array(buf) }
  },

  async list() {
    const res = await fetch(url('/scenes'), { headers: authHeaders() })
    await assertOk(res)
    return res.json() as Promise<SceneEntry[]>
  },

  async delete(id) {
    const res = await fetch(url(`/scenes/${id}`), {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await assertOk(res)
  },
}
