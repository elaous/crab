export type ViewportAction =
  | { type: 'exportGLTF'; sceneName: string }
  | { type: 'exportOBJ'; sceneName: string }
  | { type: 'captureImage'; callback: (dataUrl: string) => void }
  | { type: 'saveSnapshot'; name: string }
  | { type: 'restoreSnapshot'; snapshotId: string }
  | { type: 'setHDRI'; url: string }
  | { type: 'captureHighRes'; scale: number; callback: (dataUrl: string) => void }
  | { type: 'exportSVG'; view: 'top' | 'front' | 'right' | 'all'; sceneName: string }
  | { type: 'enterXR'; mode: 'vr' | 'ar' }
  | { type: 'alignToFace' }

type Listener = (action: ViewportAction) => void
const listeners = new Set<Listener>()

export const viewportBus = {
  emit(action: ViewportAction) {
    listeners.forEach(l => l(action))
  },
  on(listener: Listener): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}
