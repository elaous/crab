import { useSceneStore } from '../../store/sceneStore'
import type { SceneObject, BoxDims, SphereDims, CylinderDims, ConeDims, Vec3 } from '../../types'

function Vec3Input({ label, value, onChange, step = 0.1 }: {
  label: string
  value: Vec3
  onChange: (v: Vec3) => void
  step?: number
}) {
  const fmt = (n: number) => parseFloat(n.toFixed(4))
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="grid grid-cols-3 gap-1">
        {(['x', 'y', 'z'] as const).map(axis => (
          <div key={axis}>
            <div className="text-xs text-slate-600 text-center mb-0.5">{axis.toUpperCase()}</div>
            <input
              type="number"
              className="prop-input text-center"
              value={fmt(value[axis])}
              step={step}
              onChange={e => onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function DimensionsEditor({ obj }: { obj: SceneObject }) {
  const { updateObject } = useSceneStore()

  const set = (patch: Partial<typeof obj.dimensions>) =>
    updateObject(obj.id, { dimensions: { ...obj.dimensions, ...patch } })

  if (obj.type === 'box') {
    const d = obj.dimensions as BoxDims
    return (
      <div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">Dimensions</div>
        <div className="grid grid-cols-3 gap-1">
          {(['width', 'height', 'depth'] as const).map(k => (
            <div key={k}>
              <div className="text-xs text-slate-600 text-center mb-0.5">{k[0].toUpperCase()}</div>
              <input
                type="number"
                className="prop-input text-center"
                value={d[k]}
                min={0.001}
                step={0.1}
                onChange={e => set({ [k]: parseFloat(e.target.value) || 0.001 })}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (obj.type === 'sphere') {
    const d = obj.dimensions as SphereDims
    return (
      <div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">Dimensions</div>
        <div>
          <div className="text-xs text-slate-600 mb-0.5">Radius</div>
          <input
            type="number"
            className="prop-input"
            value={d.radius}
            min={0.001}
            step={0.1}
            onChange={e => set({ radius: parseFloat(e.target.value) || 0.001 })}
          />
        </div>
      </div>
    )
  }

  if (obj.type === 'cylinder' || obj.type === 'cone') {
    const d = obj.dimensions as CylinderDims | ConeDims
    return (
      <div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">Dimensions</div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <div className="text-xs text-slate-600 mb-0.5">Radius</div>
            <input
              type="number"
              className="prop-input"
              value={d.radius}
              min={0.001}
              step={0.1}
              onChange={e => set({ radius: parseFloat(e.target.value) || 0.001 })}
            />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-0.5">Height</div>
            <input
              type="number"
              className="prop-input"
              value={d.height}
              min={0.001}
              step={0.1}
              onChange={e => set({ height: parseFloat(e.target.value) || 0.001 })}
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function PropertiesPanel() {
  const { objects, selectedIds, updateObject, setObjectPosition, setObjectRotation, setObjectScale, layers } = useSceneStore()

  const selArray = Array.from(selectedIds)
  const obj = selArray.length === 1 ? objects.get(selArray[0]) : undefined

  if (!obj) {
    return (
      <div className="flex flex-col h-full">
        <div className="panel-header">Properties</div>
        <div className="text-center text-slate-600 text-xs py-6">
          {selArray.length > 1
            ? `${selArray.length} objects selected`
            : 'Select an object to see properties'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Properties
        <span className="text-slate-600 text-xs">{obj.type}</span>
      </div>
      <div className="panel-body p-2 overflow-y-auto">
        {/* Name */}
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Name</div>
          <input
            className="prop-input"
            value={obj.name}
            onChange={e => updateObject(obj.id, { name: e.target.value })}
          />
        </div>

        {/* Color */}
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Color</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={obj.color}
              onChange={e => updateObject(obj.id, { color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              className="prop-input flex-1"
              value={obj.color}
              onChange={e => updateObject(obj.id, { color: e.target.value })}
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Opacity — {Math.round(obj.opacity * 100)}%</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={obj.opacity}
            className="w-full accent-blue-500"
            onChange={e => updateObject(obj.id, { opacity: parseFloat(e.target.value) })}
          />
        </div>

        {/* Layer */}
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Layer</div>
          <select
            className="prop-input"
            value={obj.layerId}
            onChange={e => updateObject(obj.id, { layerId: e.target.value })}
          >
            {Array.from(layers.values()).map(layer => (
              <option key={layer.id} value={layer.id}>{layer.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-slate-700 my-2" />

        {/* Dimensions */}
        <DimensionsEditor obj={obj} />

        <div className="border-t border-slate-700 my-2" />

        {/* Transform */}
        <Vec3Input
          label="Position"
          value={obj.position}
          onChange={v => setObjectPosition(obj.id, v)}
        />
        <Vec3Input
          label="Rotation (°)"
          value={obj.rotation}
          onChange={v => setObjectRotation(obj.id, v)}
          step={1}
        />
        <Vec3Input
          label="Scale"
          value={obj.scale}
          onChange={v => setObjectScale(obj.id, v)}
          step={0.01}
        />

        <div className="border-t border-slate-700 my-2" />

        {/* Metadata */}
        <div className="mb-2">
          <div className="text-xs text-slate-500 mb-1">Metadata</div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <div className="text-xs text-slate-600 mb-0.5">Material</div>
              <input
                className="prop-input"
                value={obj.metadata.material as string ?? ''}
                onChange={e => updateObject(obj.id, { metadata: { ...obj.metadata, material: e.target.value } })}
              />
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-0.5">Cost</div>
              <input
                type="number"
                className="prop-input"
                value={obj.metadata.cost as number ?? ''}
                onChange={e => updateObject(obj.id, { metadata: { ...obj.metadata, cost: parseFloat(e.target.value) } })}
              />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-xs text-slate-600 mb-0.5">Notes</div>
            <textarea
              className="prop-input resize-none"
              rows={2}
              value={obj.metadata.notes as string ?? ''}
              onChange={e => updateObject(obj.id, { metadata: { ...obj.metadata, notes: e.target.value } })}
            />
          </div>
        </div>

        <div className="flex gap-1 mt-3">
          <button
            className="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
            onClick={() => updateObject(obj.id, { visible: !obj.visible })}
          >
            {obj.visible ? 'Hide' : 'Show'}
          </button>
          <button
            className="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
            onClick={() => updateObject(obj.id, { locked: !obj.locked })}
          >
            {obj.locked ? 'Unlock' : 'Lock'}
          </button>
        </div>
      </div>
    </div>
  )
}
