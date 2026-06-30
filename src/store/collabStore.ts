import { create } from 'zustand'
import { CollabManager, type PeerInfo } from '../lib/collaboration/CollabManager'

const PEER_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#4ade80',
  '#34d399', '#38bdf8', '#818cf8', '#e879f9',
]

function randomColor() {
  return PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)]
}

function randomName() {
  const adj = ['Swift', 'Bold', 'Calm', 'Dark', 'Fair', 'Gold', 'Iron', 'Jade']
  const noun = ['Hawk', 'Wolf', 'Fox', 'Bear', 'Lynx', 'Stag', 'Crow', 'Owl']
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)]
}

interface CollabState {
  roomId: string | null
  isConnected: boolean
  localName: string
  localColor: string
  peers: Map<number, PeerInfo>

  join: (roomId: string, name?: string) => void
  leave: () => void
  publishCursor: (pos: { xPct: number; yPct: number } | null) => void
  setLocalName: (name: string) => void
}

const _manager = new CollabManager({
  onConnected: (roomId) => useCollabStore.setState({ isConnected: true, roomId }),
  onDisconnected: () => useCollabStore.setState({ isConnected: false, roomId: null, peers: new Map() }),
  onPeersChanged: (peers) => useCollabStore.setState({ peers: new Map(peers) }),
})

export const useCollabStore = create<CollabState>(() => ({
  roomId: null,
  isConnected: false,
  localName: randomName(),
  localColor: randomColor(),
  peers: new Map(),

  join: (roomId, name) => {
    const state = useCollabStore.getState()
    const n = name ?? state.localName
    useCollabStore.setState({ localName: n })
    _manager.localName = n
    _manager.localColor = state.localColor
    _manager.join(roomId, n, state.localColor)
  },

  leave: () => _manager.leave(),

  publishCursor: (pos) => _manager.publishCursor(pos),

  setLocalName: (name) => useCollabStore.setState({ localName: name }),
}))
