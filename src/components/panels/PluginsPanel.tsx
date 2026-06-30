import { useRef, useState } from 'react'
import { usePluginStore } from '../../store/pluginStore'
import type { PluginManifest } from '../../lib/plugins/types'

// ── built-in example plugins ────────────────────────────────────────────────

const BUILTIN_PLUGINS: { manifest: PluginManifest; code: string }[] = [
  {
    manifest: { name: 'Object Counter', version: '1.0.0', description: 'Counts objects in the scene', author: 'Facet 3D' },
    code: `
api.registerTool({
  id: 'count-objects',
  label: 'Count Objects',
  icon: '#',
  description: 'Logs total object count to the console',
});
`,
  },
  {
    manifest: { name: 'Grid Duplicator', version: '1.0.0', description: 'Duplicates selected objects in a grid', author: 'Facet 3D' },
    code: `
api.registerTool({
  id: 'grid-duplicate',
  label: 'Grid Duplicate',
  icon: '⊞',
  description: 'Creates a 3×3 grid of selected objects',
});
`,
  },
]

// Tool invocation shim — at TOOL_INVOKED time we have full api access
const TOOL_SHIM: Record<string, string> = {
  'count-objects': `
api.registerTool({
  id: 'count-objects',
  label: 'Count Objects',
  icon: '#',
  description: 'Logs total object count to the console',
  run: function() {
    return api.scene.getObjects().then(function(objs) {
      api.log('Scene contains ' + objs.length + ' object(s).');
    });
  },
});
`,
  'grid-duplicate': `
api.registerTool({
  id: 'grid-duplicate',
  label: 'Grid Duplicate',
  icon: '⊞',
  description: 'Creates a 3×3 grid of selected objects',
  run: function() {
    var spacing = 3;
    var promises = [];
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        if (row === 1 && col === 1) continue;
        promises.push(api.scene.addObject('box', { x: (col - 1) * spacing, y: 0, z: (row - 1) * spacing }));
      }
    }
    return Promise.all(promises).then(function() {
      api.log('Grid duplicate: created 8 copies.');
    });
  },
});
`,
}

// ── component ────────────────────────────────────────────────────────────────

export function PluginsPanel() {
  const { plugins, installPlugin, uninstallPlugin, enablePlugin, disablePlugin, invokeTool, clearLogs } = usePluginStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pluginList = Array.from(plugins.values())
  const selected = selectedId ? plugins.get(selectedId) : null

  const handleInstallBuiltin = (entry: typeof BUILTIN_PLUGINS[number]) => {
    const code = TOOL_SHIM[Object.keys(TOOL_SHIM).find(k => entry.code.includes(k)) ?? ''] ?? entry.code
    const id = installPlugin(entry.manifest, code)
    setSelectedId(id)
  }

  const handleFileInstall = () => fileRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    let manifest: PluginManifest
    let code: string
    try {
      // Try to parse as JSON bundle { manifest, code }
      const parsed = JSON.parse(text) as { manifest: PluginManifest; code: string }
      manifest = parsed.manifest
      code = parsed.code
    } catch {
      // Treat as raw JS with a default manifest
      manifest = {
        name: file.name.replace(/\.[^.]+$/, ''),
        version: '1.0.0',
        description: 'Loaded from file',
        author: 'Unknown',
      }
      code = text
    }
    const id = installPlugin(manifest, code)
    setSelectedId(id)
    e.target.value = ''
  }

  const statusColor = (status: string) => {
    if (status === 'active') return 'text-green-400'
    if (status === 'error') return 'text-red-400'
    if (status === 'disabled') return 'text-slate-500'
    return 'text-yellow-400'
  }

  return (
    <div className="p-3 space-y-3 text-xs text-slate-300">
      {/* Install buttons */}
      <div>
        <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-2 font-medium">Built-in</div>
        <div className="space-y-1">
          {BUILTIN_PLUGINS.map(bp => (
            <button
              key={bp.manifest.name}
              className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-xs"
              onClick={() => handleInstallBuiltin(bp)}
            >
              + {bp.manifest.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          className="w-full text-left px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors text-xs"
          onClick={handleFileInstall}
        >
          + Install from file…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".js,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Plugin list */}
      {pluginList.length > 0 && (
        <div>
          <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-2 font-medium">Installed</div>
          <div className="space-y-1">
            {pluginList.map(p => (
              <button
                key={p.id}
                className={`w-full text-left px-2 py-1.5 rounded transition-colors text-xs
                  ${selectedId === p.id ? 'bg-slate-700' : 'bg-slate-800/60 hover:bg-slate-800'}`}
                onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{p.manifest.name}</span>
                  <span className={`text-[10px] ${statusColor(p.status)}`}>{p.status}</span>
                </div>
                <div className="text-slate-500 truncate">{p.manifest.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detail panel for selected plugin */}
      {selected && (
        <div className="border border-slate-700 rounded p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{selected.manifest.name}</span>
            <span className="text-slate-500">v{selected.manifest.version}</span>
          </div>

          {selected.error && (
            <div className="text-red-400 text-[10px] bg-red-950/30 rounded px-2 py-1 break-all">
              {selected.error}
            </div>
          )}

          {/* Tools */}
          {selected.tools.length > 0 && (
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Tools</div>
              <div className="space-y-1">
                {selected.tools.map(tool => (
                  <button
                    key={tool.id}
                    disabled={selected.status !== 'active'}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded bg-blue-900/40 hover:bg-blue-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs text-blue-200"
                    onClick={() => invokeTool(selected.id, tool.id)}
                    title={tool.description}
                  >
                    {tool.icon && <span className="font-mono">{tool.icon}</span>}
                    <span>{tool.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {selected.logs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider">Log</span>
                <button
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                  onClick={() => clearLogs(selected.id)}
                >
                  clear
                </button>
              </div>
              <div className="bg-slate-950 rounded p-1.5 max-h-28 overflow-y-auto space-y-0.5 font-mono">
                {selected.logs.map((line, i) => (
                  <div key={i} className={`text-[10px] break-all ${line.startsWith('[error]') ? 'text-red-400' : 'text-slate-400'}`}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5 pt-1">
            {selected.status === 'disabled' ? (
              <button
                className="flex-1 py-1 rounded bg-green-800/60 text-green-300 hover:bg-green-800 text-xs transition-colors"
                onClick={() => enablePlugin(selected.id)}
              >
                Enable
              </button>
            ) : (
              <button
                className="flex-1 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs transition-colors"
                onClick={() => disablePlugin(selected.id)}
              >
                Disable
              </button>
            )}
            <button
              className="py-1 px-2 rounded bg-red-900/50 text-red-300 hover:bg-red-900 text-xs transition-colors"
              onClick={() => { uninstallPlugin(selected.id); setSelectedId(null) }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {pluginList.length === 0 && (
        <div className="text-slate-600 text-center py-4">No plugins installed</div>
      )}
    </div>
  )
}
