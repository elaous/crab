import { useSceneStore } from '../../store/sceneStore'
import { useCollabStore } from '../../store/collabStore'

function formatTs(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const ACTION_COLORS: Record<string, string> = {
  add: 'text-green-400',
  delete: 'text-red-400',
  move: 'text-blue-400',
  update: 'text-yellow-400',
  import: 'text-purple-400',
  undo: 'text-slate-500',
  redo: 'text-slate-500',
}

export function CollabHistoryPanel() {
  const collabLog = useSceneStore(s => s.collabLog)
  const isConnected = useCollabStore(s => s.isConnected)
  const localName = useCollabStore(s => s.localName)
  const peers = useCollabStore(s => s.peers)

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Change Log</div>

      {/* Session info */}
      <div className="px-2 py-1.5 border-b border-slate-800 text-xs">
        {isConnected ? (
          <span className="text-green-400">
            Live · {1 + peers.size} user{peers.size > 0 ? 's' : ''}
          </span>
        ) : (
          <span className="text-slate-500">Local session · {localName}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {collabLog.length === 0 && (
          <div className="text-xs text-slate-600 text-center mt-4">
            Changes appear here as you work.
          </div>
        )}
        {collabLog.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-slate-800/50">
            <span className="text-slate-600 text-xs shrink-0 mt-0.5">{formatTs(entry.ts)}</span>
            <span className="text-slate-500 text-xs shrink-0">{entry.user}</span>
            <span className={`text-xs shrink-0 ${ACTION_COLORS[entry.action] ?? 'text-slate-400'}`}>
              {entry.action}
            </span>
            <span className="text-xs text-slate-500 truncate">{entry.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
