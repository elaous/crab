import { useEffect, useState } from 'react'
import type { SceneEntry } from '../../lib/storage/types'
import { storage } from '../../lib/storage'

interface Props {
  onSelect: (entry: SceneEntry) => void
  onClose: () => void
}

export function ScenePickerModal({ onSelect, onClose }: Props) {
  const [scenes, setScenes] = useState<SceneEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    storage.list()
      .then(setScenes)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-96 shadow-2xl">
        <div className="text-sm font-semibold text-white mb-4">Open Scene</div>

        {loading && <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>}
        {error && <div className="text-xs text-red-400 py-2">{error}</div>}

        {!loading && !error && scenes.length === 0 && (
          <div className="text-xs text-slate-500 py-4 text-center">No scenes saved yet.</div>
        )}

        {!loading && scenes.length > 0 && (
          <div className="space-y-1 max-h-72 overflow-y-auto mb-4">
            {scenes.map(s => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                onClick={() => onSelect(s)}
              >
                <div className="text-xs text-white font-medium">{s.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(s.updatedAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          className="w-full text-xs py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
