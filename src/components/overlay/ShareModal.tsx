import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'

type Permission = 'viewer' | 'editor' | 'owner'

interface ShareEntry {
  id: string
  token: string
  permission: Permission
  expiresAt: string | null
  createdAt: string
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined ?? '').replace(/\/$/, '')

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('crabcad-api-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface Props {
  onClose: () => void
}

export function ShareModal({ onClose }: Props) {
  const store = useSceneStore()
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState<Permission>('viewer')
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isDb = (import.meta.env.VITE_STORAGE as string | undefined) === 'db'

  const loadShares = async () => {
    if (loaded || !isDb) return
    setLoading(true)
    try {
      const res = await fetch(`${BASE}/api/scenes/${store.sceneId}/shares`, { headers: authHeaders() })
      if (res.ok) setShares(await res.json() as ShareEntry[])
    } catch { /* ignore */ } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  useState(() => { void loadShares() })

  const createShare = async () => {
    if (!isDb) {
      setError('Sharing requires the db storage backend (VITE_STORAGE=db).')
      return
    }
    setError(null)
    try {
      const res = await fetch(`${BASE}/api/scenes/${store.sceneId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ permission }),
      })
      if (!res.ok) throw new Error(await res.text())
      const entry = await res.json() as ShareEntry
      setShares(prev => [entry, ...prev])
    } catch (e) {
      setError(String(e))
    }
  }

  const revokeShare = async (id: string) => {
    try {
      await fetch(`${BASE}/api/scenes/${store.sceneId}/shares/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      setShares(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      setError(String(e))
    }
  }

  const shareUrl = (token: string) => {
    const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL as string : window.location.origin
    return `${base.replace(/\/$/, '')}/?share=${token}`
  }

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(shareUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const exportShareFile = () => {
    const data = { sceneId: store.sceneId, sceneName: store.sceneName, sharedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.sceneName}-share.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-[420px] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">Share "{store.sceneName}"</div>
          <button className="text-slate-500 hover:text-white text-lg leading-none" onClick={onClose}>×</button>
        </div>

        {error && <div className="text-xs text-red-400 mb-3 bg-red-900/20 px-3 py-2 rounded">{error}</div>}

        {/* Create new share */}
        {isDb ? (
          <div className="flex items-center gap-2 mb-4">
            <select
              className="prop-input text-xs flex-1"
              value={permission}
              onChange={e => setPermission(e.target.value as Permission)}
            >
              <option value="viewer">Viewer — read only</option>
              <option value="editor">Editor — can edit</option>
              <option value="owner">Owner — edit, share, delete</option>
            </select>
            <button
              className="px-3 py-1.5 rounded bg-blue-700 text-white text-xs hover:bg-blue-600 transition-colors whitespace-nowrap"
              onClick={createShare}
            >
              Create link
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-2">
              Web sharing requires the db backend. In local/desktop mode, use Export to share files.
            </div>
            <button
              className="w-full text-xs py-2 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              onClick={exportShareFile}
            >
              Export share info (.json)
            </button>
          </div>
        )}

        {/* Active shares */}
        {isDb && (
          <>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Active Links</div>
            {loading && <div className="text-xs text-slate-500 text-center py-3">Loading…</div>}
            {!loading && shares.length === 0 && (
              <div className="text-xs text-slate-600 text-center py-3">No active share links.</div>
            )}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {shares.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-slate-800 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        s.permission === 'owner'  ? 'bg-red-900/50 text-red-300'
                      : s.permission === 'editor' ? 'bg-amber-900/50 text-amber-300'
                      : 'bg-slate-700 text-slate-400'
                      }`}>{s.permission}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">{shareUrl(s.token)}</div>
                  </div>
                  <button
                    className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      copied === s.token ? 'bg-green-700 text-green-100' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => copy(s.token)}
                  >
                    {copied === s.token ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors"
                    onClick={() => revokeShare(s.id)}
                    title="Revoke"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 mb-1">Publish & share (Electron)</div>
          {window.electronAPI ? (
            <div className="text-xs text-slate-400">
              Publish to a CrabCAD server, then share the link. Set <span className="font-mono text-blue-400">VITE_API_URL</span> in your desktop settings.
            </div>
          ) : (
            <div className="text-xs text-slate-600">Only available in the desktop app.</div>
          )}
        </div>
      </div>
    </div>
  )
}
