import { PLUGIN_WORKER_TEMPLATE } from './workerTemplate'
import type { PluginManifest, RegisteredTool } from './types'
import { useSceneStore } from '../../store/sceneStore'

export interface PluginHostCallbacks {
  onReady: () => void
  onError: (msg: string) => void
  onToolRegistered: (tool: RegisteredTool) => void
  onLog: (args: string[]) => void
}

export class PluginHost {
  private worker: Worker | null = null
  private blobUrl: string | null = null

  private code: string
  private callbacks: PluginHostCallbacks

  constructor(code: string, _manifest: PluginManifest, callbacks: PluginHostCallbacks) {
    this.code = code
    this.callbacks = callbacks
  }

  start() {
    const src = PLUGIN_WORKER_TEMPLATE.replace('__PLUGIN_CODE__', this.code)
    const blob = new Blob([src], { type: 'application/javascript' })
    this.blobUrl = URL.createObjectURL(blob)
    this.worker = new Worker(this.blobUrl)
    this.worker.onmessage = (e) => this.handleMessage(e.data)
    this.worker.onerror = (e) => this.callbacks.onError(e.message ?? 'Worker error')
    this.worker.postMessage({ type: 'INIT' })
  }

  invokeToolHandler(toolId: string) {
    this.worker?.postMessage({ type: 'TOOL_INVOKED', toolId })
  }

  stop() {
    this.worker?.terminate()
    this.worker = null
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }
  }

  private handleMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'PLUGIN_READY':
        this.callbacks.onReady()
        break
      case 'PLUGIN_ERROR':
        this.callbacks.onError(String(msg.error ?? 'Unknown error'))
        break
      case 'REGISTER_TOOL':
        this.callbacks.onToolRegistered(msg.tool as RegisteredTool)
        break
      case 'LOG':
        this.callbacks.onLog(msg.args as string[])
        break
      case 'SCENE_GET_OBJECTS':
        this.respond(msg, () => {
          const objs = Array.from(useSceneStore.getState().objects.values())
          return objs.map(o => ({
            id: o.id, type: o.type, name: o.name,
            position: o.position, rotation: o.rotation, scale: o.scale,
          }))
        })
        break
      case 'SCENE_GET_SELECTED':
        this.respond(msg, () => Array.from(useSceneStore.getState().selectedIds))
        break
      case 'SCENE_ADD_OBJECT': {
        const payload = msg.payload as { type: string; position: { x?: number; y?: number; z?: number } }
        this.respond(msg, () => {
          const store = useSceneStore.getState()
          const pos = payload.position ?? {}
          store.addObject(payload.type as never, {
            x: Number(pos.x ?? 0),
            y: Number(pos.y ?? 0),
            z: Number(pos.z ?? 0),
          })
          const ids = Array.from(store.objects.keys())
          return ids[ids.length - 1]
        })
        break
      }
      case 'SCENE_UPDATE_OBJECT': {
        const payload = msg.payload as { id: string; patch: Record<string, unknown> }
        this.respond(msg, () => {
          useSceneStore.getState().updateObject(payload.id, payload.patch as never)
          return true
        })
        break
      }
      case 'SCENE_REMOVE_OBJECTS': {
        const payload = msg.payload as { ids: string[] }
        this.respond(msg, () => {
          useSceneStore.getState().removeObjects(payload.ids)
          return true
        })
        break
      }
    }
  }

  private respond(msg: Record<string, unknown>, fn: () => unknown) {
    try {
      const result = fn()
      this.worker?.postMessage({ type: 'RESPONSE', callId: msg.callId, result })
    } catch (err) {
      this.worker?.postMessage({
        type: 'RESPONSE', callId: msg.callId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
