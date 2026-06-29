import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'

export function AssemblyPanel() {
  const {
    assemblies, assemblyOrder, objects, selectedIds,
    createAssembly, dissolveAssembly, renameAssembly,
    addToAssembly, removeFromAssembly,
    selectAssemblyObjects, moveAssembly,
  } = useSceneStore()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [moveDelta, setMoveDelta] = useState({ x: 0, y: 0, z: 0 })
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null)

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
    if (editName.trim()) renameAssembly(id, editName.trim())
    setEditingId(null)
  }

  const handleGroupSelected = () => {
    if (selectedIds.size === 0) return
    createAssembly(undefined, [...selectedIds])
  }

  const handleAddSelected = (assemblyId: string) => {
    if (selectedIds.size === 0) return
    addToAssembly(assemblyId, [...selectedIds])
  }

  return (
    <div className="flex flex-col h-full text-xs text-slate-300">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800">
        <button
          onClick={handleGroupSelected}
          disabled={selectedIds.size === 0}
          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-white font-medium transition-colors"
          title="Group selected objects into a new assembly"
        >
          Group Selected
        </button>
        <button
          onClick={() => createAssembly()}
          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          title="Create empty assembly"
        >
          + Empty
        </button>
      </div>

      {/* Assembly list */}
      <div className="flex-1 overflow-y-auto">
        {assemblyOrder.length === 0 && (
          <div className="p-4 text-slate-500 text-center">
            No groups yet.<br />Select objects and click "Group Selected".
          </div>
        )}

        {assemblyOrder.map(asmId => {
          const asm = assemblies.get(asmId)
          if (!asm) return null
          const isOpen = expanded.has(asmId)

          return (
            <div key={asmId} className="border-b border-slate-800/50">
              {/* Assembly header */}
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-800/50 group">
                <button
                  onClick={() => toggleExpand(asmId)}
                  className="text-slate-500 hover:text-slate-300 w-4 flex-shrink-0"
                >
                  {isOpen ? '▾' : '▸'}
                </button>

                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: asm.color }}
                />

                {/* Name / rename */}
                {editingId === asmId ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitRename(asmId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename(asmId)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="flex-1 bg-slate-700 border border-blue-500 rounded px-1 outline-none"
                  />
                ) : (
                  <span
                    className="flex-1 truncate cursor-pointer"
                    onDoubleClick={() => startRename(asmId, asm.name)}
                    onClick={() => selectAssemblyObjects(asmId)}
                    title="Click to select all, double-click to rename"
                  >
                    {asm.name}
                  </span>
                )}

                <span className="text-slate-600 flex-shrink-0">{asm.childIds.length}</span>

                {/* Context actions */}
                <div className="hidden group-hover:flex gap-1 ml-1 flex-shrink-0">
                  <button
                    onClick={() => handleAddSelected(asmId)}
                    disabled={selectedIds.size === 0}
                    className="text-slate-400 hover:text-green-400 disabled:opacity-30"
                    title="Add selected to this group"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setActiveMoveId(activeMoveId === asmId ? null : asmId)}
                    className="text-slate-400 hover:text-blue-400"
                    title="Move group"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => dissolveAssembly(asmId)}
                    className="text-slate-400 hover:text-red-400"
                    title="Dissolve group"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Move controls */}
              {activeMoveId === asmId && (
                <div className="px-3 py-2 bg-slate-800/60 border-t border-slate-700/50">
                  <div className="text-slate-500 mb-1">Move delta</div>
                  <div className="flex gap-1 mb-1">
                    {(['x', 'y', 'z'] as const).map(axis => (
                      <div key={axis} className="flex items-center gap-0.5 flex-1">
                        <span className="text-slate-500">{axis.toUpperCase()}</span>
                        <input
                          type="number"
                          step="0.1"
                          value={moveDelta[axis]}
                          onChange={e => setMoveDelta(d => ({ ...d, [axis]: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-700 rounded px-1 text-xs outline-none border border-slate-600 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { moveAssembly(asmId, moveDelta); setMoveDelta({ x: 0, y: 0, z: 0 }) }}
                    className="w-full py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Children */}
              {isOpen && (
                <div className="ml-6 border-l border-slate-700/50">
                  {asm.childIds.length === 0 && (
                    <div className="px-3 py-1 text-slate-600">Empty</div>
                  )}
                  {asm.childIds.map(oid => {
                    const obj = objects.get(oid)
                    const isSel = selectedIds.has(oid)
                    return (
                      <div
                        key={oid}
                        className={`flex items-center justify-between px-2 py-1 hover:bg-slate-800/50 group/child
                          ${isSel ? 'bg-blue-900/30 text-blue-300' : ''}`}
                      >
                        <span className="truncate flex-1">{obj?.name ?? oid}</span>
                        <button
                          onClick={() => removeFromAssembly(asmId, [oid])}
                          className="hidden group-hover/child:block text-slate-600 hover:text-red-400 ml-1"
                          title="Remove from group"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
