import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import type { Vec3 } from '../../types'

const DEFAULT_COLOR = '#facc15'
const DEFAULT_SIZE = 12

export function AnnotationPanel() {
  const { annotations, addAnnotation, removeAnnotation, updateAnnotation, objects, selectedIds } = useSceneStore()
  const [text, setText] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [fontSize, setFontSize] = useState(DEFAULT_SIZE)
  const [pos, setPos] = useState<Vec3>({ x: 0, y: 1, z: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)

  const annList = Array.from(annotations.values())

  const getSelectedPos = (): Vec3 | null => {
    const id = Array.from(selectedIds)[0]
    const obj = id ? objects.get(id) : undefined
    return obj ? { ...obj.position, y: obj.position.y + 0.5 } : null
  }

  const handleAdd = () => {
    if (!text.trim()) return
    addAnnotation({ type: 'label', text: text.trim(), position: pos, color, fontSize })
    setText('')
  }

  const handlePickFromSelected = () => {
    const p = getSelectedPos()
    if (p) setPos(p)
  }

  const handleSaveEdit = (id: string, newText: string) => {
    updateAnnotation(id, { text: newText })
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Annotations</div>
      <div className="panel-body p-2 space-y-3">

        {/* Add new */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">New Label</div>
          <input
            className="prop-input mb-1.5"
            placeholder="Label text…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="grid grid-cols-3 gap-1 mb-1.5">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis}>
                <div className="text-xs text-slate-600 text-center mb-0.5">{axis.toUpperCase()}</div>
                <input
                  type="number"
                  className="prop-input text-center"
                  value={pos[axis]}
                  step={0.1}
                  onChange={e => setPos(p => ({ ...p, [axis]: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
              type="number"
              className="prop-input w-16 text-center"
              title="Font size"
              value={fontSize}
              min={8}
              max={32}
              onChange={e => setFontSize(parseInt(e.target.value) || 12)}
            />
            <button
              className="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
              onClick={handlePickFromSelected}
              title="Use selected object's position"
            >
              Pick Selected
            </button>
          </div>
          <button
            className="w-full text-xs py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-white transition-colors disabled:opacity-40"
            disabled={!text.trim()}
            onClick={handleAdd}
          >
            Add Label
          </button>
        </div>

        {annList.length > 0 && <div className="border-t border-slate-700" />}

        {/* List */}
        <div className="space-y-1">
          {annList.map(ann => (
            <div key={ann.id} className="flex items-center gap-1 group">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: ann.color }}
              />
              {editingId === ann.id ? (
                <input
                  className="prop-input flex-1 text-xs"
                  defaultValue={ann.text}
                  autoFocus
                  onBlur={e => handleSaveEdit(ann.id, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit(ann.id, (e.target as HTMLInputElement).value)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span
                  className="flex-1 text-xs text-slate-300 truncate cursor-pointer hover:text-white"
                  onClick={() => setEditingId(ann.id)}
                  title={ann.text}
                >
                  {ann.text}
                </span>
              )}
              <button
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all text-xs px-1"
                onClick={() => removeAnnotation(ann.id)}
              >
                ✕
              </button>
            </div>
          ))}
          {annList.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-4">
              No annotations yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
