import { useState, useRef } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import type { SceneVersion, SceneObject } from '../../types'

function formatTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface DiffEntry {
  kind: 'added' | 'removed' | 'modified'
  name: string
  detail?: string
}

function computeDiff(current: Map<string, SceneObject>, version: SceneVersion): DiffEntry[] {
  const entries: DiffEntry[] = []
  const vMap = new Map(version.objects.map(o => [o.id, o]))

  // objects in current not in version → added since that version (would be removed on restore)
  current.forEach((obj, id) => {
    if (!vMap.has(id)) {
      entries.push({ kind: 'added', name: obj.name, detail: obj.type })
    }
  })

  // objects in version not in current → removed since that version (would be restored)
  vMap.forEach((obj, id) => {
    if (!current.has(id)) {
      entries.push({ kind: 'removed', name: obj.name, detail: obj.type })
    }
  })

  // objects in both — check for modifications
  vMap.forEach((vObj, id) => {
    const cur = current.get(id)
    if (!cur) return
    const changes: string[] = []
    if (JSON.stringify(cur.position) !== JSON.stringify(vObj.position)) changes.push('position')
    if (JSON.stringify(cur.dimensions) !== JSON.stringify(vObj.dimensions)) changes.push('size')
    if (JSON.stringify(cur.rotation) !== JSON.stringify(vObj.rotation)) changes.push('rotation')
    if (cur.color !== vObj.color) changes.push('color')
    if (cur.name !== vObj.name) changes.push('name')
    if (changes.length > 0) {
      entries.push({ kind: 'modified', name: cur.name, detail: changes.join(', ') })
    }
  })

  return entries
}

export function VersionsPanel() {
  const store = useSceneStore()
  const [diffId, setDiffId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const diffVersion = diffId ? store.versions.find(v => v.id === diffId) : null
  const diff = diffVersion ? computeDiff(store.objects, diffVersion) : []

  const handleCreate = () => {
    store.createVersion()
  }

  const startEdit = (v: SceneVersion) => {
    setEditingId(v.id)
    setEditName(v.name)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    if (editingId && editName.trim()) store.renameVersion(editingId, editName.trim())
    setEditingId(null)
  }

  const kindColor = (k: DiffEntry['kind']) => {
    if (k === 'added') return 'text-green-400'
    if (k === 'removed') return 'text-red-400'
    return 'text-yellow-400'
  }
  const kindLabel = (k: DiffEntry['kind']) => {
    if (k === 'added') return '+'
    if (k === 'removed') return '−'
    return '~'
  }

  return (
    <div className="p-3 space-y-3 text-xs text-slate-300">
      {/* Create checkpoint */}
      <button
        className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors font-medium"
        onClick={handleCreate}
      >
        + Save Checkpoint
      </button>

      {store.versions.length === 0 && (
        <div className="text-slate-600 text-center py-4">No checkpoints yet</div>
      )}

      {/* Version list */}
      <div className="space-y-1.5">
        {[...store.versions].reverse().map(v => (
          <div
            key={v.id}
            className={`rounded border transition-colors
              ${diffId === v.id ? 'border-blue-600 bg-slate-800' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}
          >
            <div className="px-2 py-1.5">
              {editingId === v.id ? (
                <input
                  ref={inputRef}
                  className="w-full bg-slate-700 rounded px-1.5 py-0.5 text-xs text-white outline-none border border-blue-500 mb-1"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <div
                  className="font-medium text-slate-200 cursor-text truncate"
                  onDoubleClick={() => startEdit(v)}
                  title="Double-click to rename"
                >
                  {v.name}
                </div>
              )}
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-slate-500 text-[10px]">{formatTime(v.createdAt)}</span>
                <span className="text-slate-500 text-[10px]">{v.objectCount} obj</span>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex border-t border-slate-700">
              <button
                className="flex-1 py-1 text-[10px] text-blue-400 hover:bg-blue-900/30 transition-colors"
                onClick={() => {
                  if (confirm(`Restore "${v.name}"? Current state will be pushed to undo history.`)) {
                    store.restoreVersion(v.id)
                    setDiffId(null)
                  }
                }}
              >
                Restore
              </button>
              <button
                className={`flex-1 py-1 text-[10px] transition-colors
                  ${diffId === v.id ? 'text-yellow-400 bg-yellow-900/20' : 'text-slate-400 hover:bg-slate-700'}`}
                onClick={() => setDiffId(diffId === v.id ? null : v.id)}
              >
                {diffId === v.id ? 'Hide diff' : 'Diff'}
              </button>
              <button
                className="flex-1 py-1 text-[10px] text-red-400 hover:bg-red-900/30 transition-colors"
                onClick={() => {
                  store.deleteVersion(v.id)
                  if (diffId === v.id) setDiffId(null)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Diff view */}
      {diffVersion && (
        <div className="border border-slate-700 rounded p-2 space-y-1.5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">
            Changes since "{diffVersion.name}"
          </div>
          {diff.length === 0 ? (
            <div className="text-slate-500 text-[10px]">No changes</div>
          ) : (
            <div className="space-y-0.5 font-mono">
              {diff.map((entry, i) => (
                <div key={i} className={`flex items-baseline gap-1.5 text-[10px] ${kindColor(entry.kind)}`}>
                  <span className="w-3 shrink-0">{kindLabel(entry.kind)}</span>
                  <span className="truncate">{entry.name}</span>
                  {entry.detail && (
                    <span className="text-slate-500 shrink-0 text-[9px]">({entry.detail})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
