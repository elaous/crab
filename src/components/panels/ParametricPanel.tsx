import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { evaluateFormula } from '../../lib/formula/evaluator'

export function ParametricPanel() {
  const {
    parameters, parameterOrder,
    addParameter, removeParameter, updateParameter,
  } = useSceneStore()

  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Parameters
        <button
          className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
          onClick={() => {
            const id = addParameter()
            setEditingId(id)
          }}
        >
          + Add
        </button>
      </div>

      <div className="panel-body p-2 space-y-1 overflow-y-auto">
        {parameterOrder.length === 0 && (
          <div className="text-xs text-slate-600 text-center py-4">
            No parameters yet.<br />Add one to drive dimensions with formulas.
          </div>
        )}

        {parameterOrder.map(id => {
          const p = parameters.get(id)
          if (!p) return null
          const ctx = Object.fromEntries(
            parameterOrder.slice(0, parameterOrder.indexOf(id))
              .map(pid => [parameters.get(pid)!.name, parameters.get(pid)!.value])
          )
          let evalError = ''
          let evalVal = p.value
          try { evalVal = evaluateFormula(p.expression, ctx) }
          catch (e) { evalError = e instanceof Error ? e.message : String(e) }

          return (
            <div
              key={id}
              className="bg-slate-800/60 rounded p-2 border border-slate-700/50"
            >
              <div className="flex items-center gap-1 mb-1.5">
                {/* Name */}
                <input
                  className="prop-input flex-1 text-xs font-mono"
                  value={p.name}
                  placeholder="param_name"
                  onChange={e => {
                    const name = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_')
                    updateParameter(id, { name })
                  }}
                />
                {/* Evaluated value badge */}
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${evalError ? 'bg-red-900/60 text-red-400' : 'bg-slate-700 text-green-400'}`}>
                  {evalError ? '!' : evalVal.toFixed(3)}
                </span>
                {/* Delete */}
                <button
                  className="text-slate-600 hover:text-red-400 transition-colors text-xs px-1"
                  onClick={() => removeParameter(id)}
                  title="Delete parameter"
                >
                  ×
                </button>
              </div>

              {/* Expression */}
              <div>
                <input
                  className={`prop-input w-full text-xs font-mono ${evalError ? 'border-red-600 bg-red-900/10' : ''}`}
                  value={p.expression}
                  placeholder="e.g. 3.0 or wall_height * 0.5"
                  onChange={e => updateParameter(id, { expression: e.target.value })}
                  onFocus={() => setEditingId(id)}
                  onBlur={() => setEditingId(null)}
                />
                {evalError && editingId === id && (
                  <div className="text-xs text-red-400 mt-0.5 px-1">{evalError}</div>
                )}
              </div>
            </div>
          )
        })}

        {parameterOrder.length > 0 && (
          <>
            <div className="border-t border-slate-700 my-2" />
            <div className="text-xs text-slate-600 space-y-0.5 pb-2">
              <div className="text-slate-500 font-medium mb-1">Usage in dimensions</div>
              <div>Type <span className="font-mono text-amber-400">= </span> to enter a formula</div>
              <div className="font-mono text-slate-500 text-[10px]">= wall_height * 2</div>
              <div className="font-mono text-slate-500 text-[10px]">= sqrt(PI) + 1</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
