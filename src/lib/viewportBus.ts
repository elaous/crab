export type ViewportAction =
  | { type: 'exportGLTF'; sceneName: string }
  | { type: 'exportOBJ'; sceneName: string }
  | { type: 'captureImage'; callback: (dataUrl: string) => void }
  | { type: 'saveSnapshot'; name: string }
  | { type: 'restoreSnapshot'; snapshotId: string }

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
