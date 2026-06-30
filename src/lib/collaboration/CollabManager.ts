import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import type { SceneObject } from '../../types'
import { useSceneStore } from '../../store/sceneStore'

export interface PeerInfo {
  clientId: number
  name: string
  color: string
  cursor: { xPct: number; yPct: number } | null
}

export interface CollabCallbacks {
  onConnected: (roomId: string) => void
  onDisconnected: () => void
  onPeersChanged: (peers: Map<number, PeerInfo>) => void
}

// Module-level flag — set true while applying remote Y.js updates so the
// store subscriber doesn't echo them back.
let _applying = false

export class CollabManager {
  private _doc: Y.Doc | null = null
  private _provider: WebrtcProvider | null = null
  private _yObjects: Y.Map<SceneObject> | null = null
  private _unsubStore: (() => void) | null = null
  private _lastSeen = new Map<string, string>()   // id → JSON snapshot
  private _cb: CollabCallbacks

  // These are set by collabStore so it can read them for initial push
  localName = 'User'
  localColor = '#60a5fa'
  localId = Math.random().toString(36).slice(2, 8)

  constructor(callbacks: CollabCallbacks) {
    this._cb = callbacks
  }

  join(roomId: string, name: string, color: string) {
    this.leave()
    this.localName = name
    this.localColor = color

    const doc = new Y.Doc()
    this._doc = doc
    const yObjects = doc.getMap<SceneObject>('objects')
    this._yObjects = yObjects

    const provider = new WebrtcProvider(roomId, doc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling.fly.dev'],
    })
    this._provider = provider

    // Set local user info in awareness
    provider.awareness.setLocalStateField('user', { name, color, id: this.localId })
    provider.awareness.setLocalStateField('cursor', null)

    // Push current scene objects into Y.js (let CRDT merge on join)
    const { objects } = useSceneStore.getState()
    objects.forEach((obj, id) => {
      yObjects.set(id, obj)
      this._lastSeen.set(id, JSON.stringify(obj))
    })

    // Listen for remote object changes
    yObjects.observe(() => {
      if (_applying) return
      _applying = true
      const store = useSceneStore.getState()
      const current = store.objects

      yObjects.forEach((obj, id) => {
        const existing = current.get(id)
        if (!existing) {
          store._remoteSetObject(id, obj)
        } else if (JSON.stringify(existing) !== JSON.stringify(obj)) {
          store._remoteSetObject(id, obj)
        }
        this._lastSeen.set(id, JSON.stringify(obj))
      })

      // Deletions: keys in store but not in yObjects
      current.forEach((_, id) => {
        if (!yObjects.has(id)) {
          store._remoteDeleteObject(id)
          this._lastSeen.delete(id)
        }
      })

      _applying = false
    })

    // Subscribe to local store changes → push to Y.js
    this._unsubStore = useSceneStore.subscribe((state, prev) => {
      if (_applying) return
      if (state.objects === prev.objects) return
      this._syncToYjs(state.objects)
    })

    // Awareness — peer list
    const updatePeers = () => {
      const peers = new Map<number, PeerInfo>()
      provider.awareness.getStates().forEach((state: Record<string, unknown>, clientId: number) => {
        if (clientId === doc.clientID) return
        const user = state.user as { name?: string; color?: string } | undefined
        const cursor = state.cursor as { xPct: number; yPct: number } | null | undefined
        if (user?.name) {
          peers.set(clientId, {
            clientId,
            name: user.name,
            color: user.color ?? '#60a5fa',
            cursor: cursor ?? null,
          })
        }
      })
      this._cb.onPeersChanged(peers)
    }
    provider.awareness.on('change', updatePeers)
    provider.on('synced', () => this._cb.onConnected(roomId))
    // Treat the provider as connected immediately (synced fires after first peer)
    setTimeout(() => this._cb.onConnected(roomId), 100)
  }

  leave() {
    this._unsubStore?.()
    this._unsubStore = null
    this._provider?.destroy()
    this._provider = null
    this._doc?.destroy()
    this._doc = null
    this._yObjects = null
    this._lastSeen.clear()
    this._cb.onDisconnected()
  }

  publishCursor(pos: { xPct: number; yPct: number } | null) {
    this._provider?.awareness.setLocalStateField('cursor', pos)
  }

  private _syncToYjs(objects: Map<string, SceneObject>) {
    const yObjects = this._yObjects
    if (!yObjects) return

    const newSeen = new Map<string, string>()
    this._doc!.transact(() => {
      objects.forEach((obj, id) => {
        const snap = JSON.stringify(obj)
        newSeen.set(id, snap)
        if (this._lastSeen.get(id) !== snap) {
          yObjects.set(id, obj)
        }
      })
      this._lastSeen.forEach((_, id) => {
        if (!newSeen.has(id)) yObjects.delete(id)
      })
    })
    this._lastSeen = newSeen
  }
}
