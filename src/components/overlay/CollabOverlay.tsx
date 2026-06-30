import { useCollabStore } from '../../store/collabStore'

export function CollabCursors() {
  const peers = useCollabStore(s => s.peers)

  return (
    <>
      {Array.from(peers.values()).map(peer => {
        if (!peer.cursor) return null
        return (
          <div
            key={peer.clientId}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${peer.cursor.xPct * 100}%`,
              top: `${peer.cursor.yPct * 100}%`,
              transform: 'translate(0, 0)',
            }}
          >
            {/* Cursor dot */}
            <div
              className="w-3 h-3 rounded-full border-2 border-white/60 shadow-md"
              style={{ background: peer.color }}
            />
            {/* Name tag */}
            <div
              className="text-[10px] px-1 py-0.5 rounded mt-0.5 text-white font-medium whitespace-nowrap shadow"
              style={{ background: peer.color }}
            >
              {peer.name}
            </div>
          </div>
        )
      })}
    </>
  )
}

export function CollabPresence() {
  const { roomId, peers, localName, localColor, isConnected } = useCollabStore()

  if (!isConnected) return null

  return (
    <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
      {/* Room badge */}
      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="font-mono">{roomId}</span>
        <span className="text-slate-500">·</span>
        <span>{1 + peers.size} online</span>
      </div>

      {/* User list */}
      <div className="flex flex-col items-end gap-0.5">
        {/* Local user */}
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
          <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ background: localColor }} />
          <span className="text-[10px] text-white">{localName} (you)</span>
        </div>
        {/* Remote peers */}
        {Array.from(peers.values()).map(peer => (
          <div key={peer.clientId} className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded">
            <div className="w-2.5 h-2.5 rounded-full border border-white/40" style={{ background: peer.color }} />
            <span className="text-[10px] text-white">{peer.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
