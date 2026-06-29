import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import type { SceneObject } from '../../types'

const TYPE_ICONS: Record<string, string> = {
  box: '⬛',
  sphere: '⬤',
  cylinder: '⬭',
  cone: '△',
}

function ObjectRow({ obj, selected }: { obj: SceneObject; selected: boolean }) {
  const { selectObject, updateObject, removeObjects } = useSceneStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(obj.name)

  return (
    <div
      className={`tree-item ${selected ? 'selected' : ''}`}
      onClick={(e) => selectObject(obj.id, e.ctrlKey || e.metaKey || e.shiftKey)}
    >
      <span className="text-sm">{TYPE_ICONS[obj.type] ?? '○'}</span>

      {editing ? (
        <input
          autoFocus
          className="prop-input flex-1 py-0"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => { updateObject(obj.id, { name }); setEditing(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') { updateObject(obj.id, { name }); setEditing(false) }
            if (e.key === 'Escape') { setName(obj.name); setEditing(false) }
            e.stopPropagation()
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-xs" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>
          {obj.name}
        </span>
      )}

      <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100">
        <button
          className="text-xs hover:text-white text-slate-500 px-1"
          title={obj.visible ? 'Hide' : 'Show'}
          onClick={e => { e.stopPropagation(); updateObject(obj.id, { visible: !obj.visible }) }}
        >
          {obj.visible ? '👁' : '🚫'}
        </button>
        <button
          className="text-xs hover:text-red-400 text-slate-500 px-1"
          title="Delete"
          onClick={e => { e.stopPropagation(); removeObjects([obj.id]) }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function ObjectTree() {
  const { objects, layers, selectedIds } = useSceneStore()
  const objList = Array.from(objects.values())

  const grouped = new Map<string, SceneObject[]>()
  objList.forEach(obj => {
    const key = obj.layerId
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(obj)
  })

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Objects
        <span className="text-slate-600 text-xs">{objList.length}</span>
      </div>
      <div className="panel-body p-1">
        {objList.length === 0 ? (
          <div className="text-center text-slate-600 text-xs py-4">
            No objects yet.<br />
            <span className="text-slate-500">Use the right panel to add primitives.</span>
          </div>
        ) : (
          Array.from(grouped.entries()).map(([layerId, objs]) => {
            const layer = layers.get(layerId)
            return (
              <div key={layerId} className="mb-1">
                {layer && (
                  <div className="flex items-center gap-1 px-2 py-0.5">
                    <div className="color-dot" style={{ background: layer.color }} />
                    <span className="text-xs text-slate-500">{layer.name}</span>
                  </div>
                )}
                <div className="group">
                  {objs.map(obj => (
                    <ObjectRow key={obj.id} obj={obj} selected={selectedIds.has(obj.id)} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
