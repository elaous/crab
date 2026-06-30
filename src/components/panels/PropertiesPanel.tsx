import { useState, useEffect } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { evaluateFormula } from '../../lib/formula/evaluator'
import type { SceneObject, BoxDims, SphereDims, CylinderDims, ConeDims, LineDims, LineStyle, Vec3 } from '../../types'

function DimInput({
  dimKey, value, expression, paramCtx, objectId,
  min = 0.001, step = 0.1,
}: {
  dimKey: string
  value: number
  expression?: string
  paramCtx: Record<string, number>
  objectId: string
  min?: number
  step?: number
}) {
  const { updateObject, setDimensionExpression } = useSceneStore()
  const hasExpr = !!expression
  const [draft, setDraft] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Keep display in sync when not editing
  useEffect(() => { if (draft === null) setErr(null) }, [draft])

  const displayVal = draft !== null
    ? draft
    : hasExpr
      ? `=${expression}`
      : String(parseFloat(value.toFixed(4)))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)

    if (raw.startsWith('=')) {
      const expr = raw.slice(1)
      setDimensionExpression(objectId, dimKey, expr)
      try {
        evaluateFormula(expr, paramCtx)  // validate
        setErr(null)
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : String(ex))
      }
    } else {
      const num = parseFloat(raw)
      if (!isNaN(num) && num >= min) {
        updateObject(objectId, { dimensions: { [dimKey]: num } as never })
        setDimensionExpression(objectId, dimKey, null)
        setErr(null)
      }
    }
  }

  const handleBlur = () => setDraft(null)

  return (
    <div className="relative">
      <input
        type="text"
        className={`prop-input text-center text-xs w-full ${
          hasExpr
            ? err ? 'border-red-500 bg-red-900/10 text-red-300' : 'border-amber-500/60 bg-amber-900/10 text-amber-300'
            : ''
        }`}
        value={displayVal}
        step={step}
        onChange={handleChange}
        onFocus={() => setDraft(hasExpr ? `=${expression}` : String(parseFloat(value.toFixed(4))))}
        onBlur={handleBlur}
        title={err ?? (hasExpr ? `formula: ${expression} = ${value.toFixed(4)}` : undefined)}
        placeholder="0"
      />
      {err && draft !== null && (
        <div className="absolute top-full left-0 z-20 text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap max-w-40">
          {err}
        </div>
      )}
    </div>
  )
}

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
  const paramCtx = useSceneStore(s => s.getParamContext())
  const exprs = obj.dimensionExpressions ?? {}

  if (obj.type === 'box') {
    const d = obj.dimensions as BoxDims
    return (
      <div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">
          Dimensions
          <span className="text-slate-600 ml-1 font-normal">— type = for formula</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(['width', 'height', 'depth'] as const).map(k => (
            <div key={k}>
              <div className="text-xs text-slate-600 text-center mb-0.5">{k[0].toUpperCase()}</div>
              <DimInput dimKey={k} value={d[k]} expression={exprs[k]} paramCtx={paramCtx} objectId={obj.id} />
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
          <DimInput dimKey="radius" value={d.radius} expression={exprs['radius']} paramCtx={paramCtx} objectId={obj.id} />
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
            <DimInput dimKey="radius" value={d.radius} expression={exprs['radius']} paramCtx={paramCtx} objectId={obj.id} />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-0.5">Height</div>
            <DimInput dimKey="height" value={d.height} expression={exprs['height']} paramCtx={paramCtx} objectId={obj.id} />
          </div>
        </div>
      </div>
    )
  }

  if (obj.type === 'line') {
    const d = obj.dimensions as LineDims
    return (
      <div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">Dimensions</div>
        <div>
          <div className="text-xs text-slate-600 mb-0.5">Length</div>
          <DimInput dimKey="length" value={d.length} expression={exprs['length']} paramCtx={paramCtx} objectId={obj.id} />
        </div>
      </div>
    )
  }

  return null
}

const LINE_STYLES: LineStyle[] = ['solid', 'dashed', 'dotted', 'dot-dash', 'double']

function LineStyleEditor({ obj }: { obj: SceneObject }) {
  const { updateObject } = useSceneStore()
  if (obj.type !== 'line') return null
  return (
    <div className="mb-3">
      <div className="text-xs text-slate-500 mb-1">Line Style</div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {LINE_STYLES.map(style => (
          <button
            key={style}
            className={`text-xs py-1 px-1 rounded border transition-colors ${
              (obj.lineStyle ?? 'solid') === style
                ? 'bg-blue-700 border-blue-600 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            onClick={() => updateObject(obj.id, { lineStyle: style })}
          >
            {style}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Width</span>
        <input
          type="number"
          min={1} max={10} step={1}
          className="prop-input flex-1 text-xs"
          value={obj.lineWidth ?? 1}
          onChange={e => updateObject(obj.id, { lineWidth: parseInt(e.target.value) || 1 })}
        />
      </div>
    </div>
  )
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

        {/* Line style (only for line objects) */}
        {obj.type === 'line' && (
          <>
            <div className="border-t border-slate-700 my-2" />
            <LineStyleEditor obj={obj} />
          </>
        )}

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
