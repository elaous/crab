import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'

export function LayerPanel() {
  const {
    layers, layerOrder, activeLayerId,
    addLayer, removeLayer, updateLayer, setActiveLayer,
    selectedIds, assignToLayer,
  } = useSceneStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Layers
        <button
          className="text-blue-400 hover:text-blue-300 text-lg leading-none"
          title="Add Layer"
          onClick={() => addLayer()}
        >+</button>
      </div>
      <div className="panel-body p-1">
        {layerOrder.map(id => {
          const layer = layers.get(id)
          if (!layer) return null
          const isActive = id === activeLayerId

          return (
            <div
              key={id}
              className={`layer-item group ${isActive ? 'active' : ''}`}
              onClick={() => setActiveLayer(id)}
            >
              {/* Visibility toggle */}
              <button
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={e => { e.stopPropagation(); updateLayer(id, { visible: !layer.visible }) }}
              >
                {layer.visible ? '👁' : '🚫'}
              </button>

              {/* Color dot */}
              <input
                type="color"
                value={layer.color}
                className="w-4 h-4 rounded-full border-0 cursor-pointer bg-transparent p-0"
                title="Layer color"
                onClick={e => e.stopPropagation()}
                onChange={e => updateLayer(id, { color: e.target.value })}
                style={{ WebkitAppearance: 'none', width: 14, height: 14 }}
              />

              {/* Name */}
              {editingId === id ? (
                <input
                  autoFocus
                  className="prop-input flex-1 py-0 text-xs"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => { updateLayer(id, { name: editName }); setEditingId(null) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateLayer(id, { name: editName }); setEditingId(null) }
                    if (e.key === 'Escape') setEditingId(null)
                    e.stopPropagation()
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 text-xs truncate cursor-text"
                  onDoubleClick={e => { e.stopPropagation(); setEditName(layer.name); setEditingId(id) }}
                >
                  {layer.name}
                </span>
              )}

              {/* Active badge */}
              {isActive && <span className="text-xs text-blue-400">✓</span>}

              {/* Assign / Delete */}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {selectedIds.size > 0 && (
                  <button
                    className="text-xs text-slate-500 hover:text-blue-400 px-1"
                    title="Assign selected to this layer"
                    onClick={e => { e.stopPropagation(); assignToLayer(Array.from(selectedIds), id) }}
                  >
                    ←
                  </button>
                )}
                {id !== 'default' && (
                  <button
                    className="text-xs text-slate-500 hover:text-red-400 px-1"
                    title="Delete layer"
                    onClick={e => { e.stopPropagation(); removeLayer(id) }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
