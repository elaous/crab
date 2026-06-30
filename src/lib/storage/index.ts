import { localAdapter } from './localAdapter'
import { dbAdapter } from './dbAdapter'

export type { StorageAdapter, SceneEntry } from './types'

const mode = (import.meta.env.VITE_STORAGE as string | undefined) ?? 'local'

export const storage = mode === 'db' ? dbAdapter : localAdapter

export const storageMode = mode
