import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'

export function ComponentPanel() {
  const {
    componentDefs, componentDefOrder, objects, selectedIds,
    createComponentFromSelected, instantiateComponent,
    deleteComponentDef, renameComponentDef, explodeInstance,
  } = useSceneStore()

  const selectAllInstances = (defId: string) => {
    const ids = Array.from(objects.values())
      .filter(o => o.componentDefId === defId)
      .map(o => o.id)
    useSceneStore.setState({ selectedIds: new Set(ids) })
  }

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startRename = (id: string, current: string) => {
    setEditingId(id)
    setEditName(current)
  }

  const commitRename = (id: string) => {
    if (editName.trim()) renameComponentDef(id, editName.trim())
    setEditingId(null)
  }

  // Count instances per def
  const instancesOf = (defId: string) =>
    Array.from(objects.values()).filter(o => o.componentDefId === defId)

  // Selected instances for "Explode" button
  const selectedInstances = Array.from(selectedIds).filter(id => {
    const obj = objects.get(id)
    return obj?.type === 'component-instance'
  })

  return (
    <div className="flex flex-col h-full text-xs text-slate-300">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800">
        <button
          onClick={() => createComponentFromSelected()}
          disabled={selectedIds.size === 0}
          className="flex-1 px-2 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
          title="Create a reusable component from selected objects"
        >
          Make Component
        </button>
        {selectedInstances.length > 0 && (
          <button
            onClick={() => selectedInstances.forEach(id => explodeInstance(id))}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            title="Explode instances back to individual objects"
          >
            Explode
          </button>
        )}
      </div>

      {/* Definition list */}
      <div className="flex-1 overflow-y-auto">
        {componentDefOrder.length === 0 && (
          <div className="p-4 text-slate-500 text-center">
            No components yet.<br />Select objects and click "Make Component".
          </div>
        )}

        {componentDefOrder.map(defId => {
          const def = componentDefs.get(defId)
          if (!def) return null
          const instances = instancesOf(defId)
          const isOpen = expanded.has(defId)

          return (
            <div key={defId} className="border-b border-slate-800/50">
              {/* Def header */}
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800/50 group">
                <button
                  onClick={() => toggleExpand(defId)}
                  className="text-slate-500 hover:text-slate-300 w-4 flex-shrink-0"
                >
                  {isOpen ? '▾' : '▸'}
                </button>

                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: def.color }}
                />

                {editingId === defId ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitRename(defId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(defId)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 bg-slate-700 border border-purple-500 rounded px-1 outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 truncate cursor-pointer"
                    onDoubleClick={() => startRename(defId, def.name)}
                    title="Double-click to rename"
                  >
                    {def.name}
                  </span>
                )}

                {/* Instance count badge */}
                <span className="text-slate-600 flex-shrink-0">{instances.length}×</span>

                {/* Actions */}
                <div className="hidden group-hover:flex gap-1 ml-1 flex-shrink-0">
                  <button
                    onClick={() => instantiateComponent(defId)}
                    className="text-slate-400 hover:text-purple-400"
                    title="Place a new instance"
                  >
                    +
                  </button>
                  <button
                    onClick={() => deleteComponentDef(defId)}
                    className="text-slate-400 hover:text-red-400"
                    title="Delete component and all instances"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Instances list */}
              {isOpen && (
                <div className="ml-6 border-l border-slate-700/50">
                  {/* Def geometry summary */}
                  <div className="px-2 py-1 text-slate-600 italic">
                    {def.objects.length} object{def.objects.length !== 1 ? 's' : ''} in definition
                  </div>

                  {instances.length === 0 && (
                    <div className="px-2 py-1 text-slate-600">No instances placed</div>
                  )}
                  {instances.map(inst => {
                    const isSel = selectedIds.has(inst.id)
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between px-2 py-1 hover:bg-slate-800/50 cursor-pointer group/inst
                          ${isSel ? 'bg-purple-900/30 text-purple-300' : ''}`}
                        onClick={() => {
                          useSceneStore.getState().selectObject(inst.id)
                        }}
                      >
                        <span className="truncate flex-1">
                          {inst.name} ({inst.position.x.toFixed(1)}, {inst.position.y.toFixed(1)}, {inst.position.z.toFixed(1)})
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); explodeInstance(inst.id) }}
                          className="hidden group-hover/inst:block text-slate-600 hover:text-orange-400 ml-1"
                          title="Explode this instance"
                        >
                          ⬡
                        </button>
                      </div>
                    )
                  })}

                  {instances.length > 1 && (
                    <button
                      onClick={() => selectAllInstances(defId)}
                      className="w-full text-left px-2 py-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                    >
                      Select all instances
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
