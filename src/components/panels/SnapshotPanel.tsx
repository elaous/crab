import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { viewportBus } from '../../lib/viewportBus'

export function SnapshotPanel() {
  const { snapshots, removeSnapshot } = useSceneStore()
  const [newName, setNewName] = useState('')
  const [capturedUrls, setCapturedUrls] = useState<Record<string, string>>({})

  const handleSave = () => {
    const name = newName.trim() || `View ${snapshots.length + 1}`
    viewportBus.emit({ type: 'saveSnapshot', name })
    setNewName('')
  }

  const handleRestore = (id: string) => {
    viewportBus.emit({ type: 'restoreSnapshot', snapshotId: id })
  }

  const handleCapture = (id: string) => {
    viewportBus.emit({
      type: 'captureImage',
      callback: (url) => setCapturedUrls(prev => ({ ...prev, [id]: url })),
    })
  }

  const handleDownload = (id: string, name: string) => {
    const url = capturedUrls[id]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}.png`
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Snapshots</div>
      <div className="panel-body p-2 space-y-3">

        {/* Save current view */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Save View</div>
          <div className="flex gap-1">
            <input
              className="prop-input flex-1"
              placeholder="View name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
              className="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white transition-colors"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>

        {snapshots.length > 0 && <div className="border-t border-slate-700" />}

        {/* Snapshot list */}
        <div className="space-y-2">
          {snapshots.map(snap => (
            <div key={snap.id} className="border border-slate-700 rounded-md overflow-hidden group">
              {/* Preview thumbnail */}
              {capturedUrls[snap.id] ? (
                <img
                  src={capturedUrls[snap.id]}
                  alt={snap.name}
                  className="w-full h-24 object-cover bg-slate-800"
                />
              ) : (
                <div
                  className="w-full h-16 flex items-center justify-center bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors text-slate-600 text-xs"
                  onClick={() => handleCapture(snap.id)}
                >
                  Click to capture
                </div>
              )}

              <div className="px-2 py-1.5 flex items-center gap-1">
                <span className="flex-1 text-xs text-slate-300 truncate" title={snap.name}>
                  {snap.name}
                </span>
                <button
                  className="text-xs px-1.5 py-0.5 bg-blue-800 hover:bg-blue-700 rounded text-blue-300 transition-colors"
                  title="Restore view"
                  onClick={() => handleRestore(snap.id)}
                >
                  ↩
                </button>
                {capturedUrls[snap.id] && (
                  <button
                    className="text-xs px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
                    title="Download PNG"
                    onClick={() => handleDownload(snap.id, snap.name)}
                  >
                    ↓
                  </button>
                )}
                <button
                  className="opacity-0 group-hover:opacity-100 text-xs px-1 text-slate-500 hover:text-red-400 transition-all"
                  onClick={() => removeSnapshot(snap.id)}
                  title="Delete snapshot"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {snapshots.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-4">
              No saved views yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
