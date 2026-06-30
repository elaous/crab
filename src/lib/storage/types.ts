export interface SceneEntry {
  id: string
  name: string
  updatedAt: string
}

export interface StorageAdapter {
  save(id: string, name: string, bytes: Uint8Array): Promise<void>
  load(id: string): Promise<{ name: string; bytes: Uint8Array } | null>
  list(): Promise<SceneEntry[]>
  delete(id: string): Promise<void>
}
