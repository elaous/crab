import type { PluginBundle, PluginManifest } from './plugin.js'
import type { SceneObject, Layer } from './types/index.js'

// ── Scene snapshot ─────────────────────────────────────────────────────────────

export interface SceneSnapshot {
  name: string
  objects: SceneObject[]
  layers: Layer[]
  exportedAt: number
}

// ── Remote plugin registry entry ──────────────────────────────────────────────

export interface RemotePlugin {
  /** URL to a JS file or a JSON bundle { manifest, code } */
  url: string
  manifest: PluginManifest
}

// ── CrabCADClient ─────────────────────────────────────────────────────────────

export interface CrabCADClientOptions {
  /**
   * Base URL of a self-hosted CrabCAD API server.
   * When omitted the client operates in local-only mode (no network calls).
   */
  apiUrl?: string
  /** Authentication token forwarded in `Authorization: Bearer <token>` */
  token?: string
}

/**
 * Client for interacting with a CrabCAD instance from external tooling:
 * CI pipelines, testing harnesses, external plugin registries, or server-side
 * scene processing.
 *
 * @example
 * ```ts
 * import { CrabCADClient } from '@crabcad/sdk'
 *
 * const client = new CrabCADClient({ apiUrl: 'https://crabcad.example.com' })
 * const plugins = await client.listRemotePlugins()
 * ```
 */
export class CrabCADClient {
  private apiUrl: string | undefined
  private headers: Record<string, string>

  constructor(options: CrabCADClientOptions = {}) {
    this.apiUrl = options.apiUrl?.replace(/\/$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    }
  }

  // ── Plugin registry ──────────────────────────────────────────────────────────

  /**
   * Fetches the remote plugin registry.
   * Expects the server to expose `GET /api/plugins` returning `RemotePlugin[]`.
   */
  async listRemotePlugins(): Promise<RemotePlugin[]> {
    const res = await this.fetch('/api/plugins')
    return res.json() as Promise<RemotePlugin[]>
  }

  /**
   * Loads a plugin from a URL. Supports:
   * - Raw `.js` files — treated as plugin code with a default manifest
   * - `.json` files of shape `{ manifest, code }` — standard plugin bundle
   */
  async loadPluginFromUrl(url: string): Promise<PluginBundle> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch plugin: ${res.status} ${res.statusText}`)
    const text = await res.text()

    if (url.endsWith('.json')) {
      const parsed = JSON.parse(text) as PluginBundle
      if (!parsed.manifest || !parsed.code) throw new Error('Invalid plugin bundle: missing manifest or code')
      return parsed
    }

    return {
      manifest: { name: url.split('/').pop() ?? 'remote-plugin', version: '0.0.0', description: 'Loaded from URL', author: 'Unknown' },
      code: text,
    }
  }

  // ── Scene management ─────────────────────────────────────────────────────────

  /**
   * Lists all scenes stored on the server.
   * Expects `GET /api/scenes` returning `Array<{ id, name, updatedAt }>`.
   */
  async listScenes(): Promise<{ id: string; name: string; updatedAt: string }[]> {
    const res = await this.fetch('/api/scenes')
    return res.json() as Promise<{ id: string; name: string; updatedAt: string }[]>
  }

  /**
   * Downloads a scene from the server as a raw binary buffer.
   * Expects `GET /api/scenes/:id` returning the `.crab` binary.
   */
  async getScene(id: string): Promise<ArrayBuffer> {
    const res = await this.fetch(`/api/scenes/${id}`, { headers: { ...this.headers, Accept: 'application/octet-stream' } })
    return res.arrayBuffer()
  }

  /**
   * Uploads a scene binary to the server.
   * Expects `PUT /api/scenes/:id` with the `.crab` binary body.
   */
  async saveScene(id: string, name: string, data: ArrayBuffer): Promise<void> {
    await this.fetch(`/api/scenes/${id}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'application/octet-stream', 'X-Scene-Name': name },
      body: data,
    })
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    if (!this.apiUrl) throw new Error('CrabCADClient: apiUrl is required for server operations')
    const res = await globalThis.fetch(`${this.apiUrl}${path}`, { headers: this.headers, ...init })
    if (!res.ok) throw new Error(`CrabCAD API error: ${res.status} ${res.statusText}`)
    return res
  }
}
