import { useSceneStore } from '../../store/sceneStore'
import type { Vec3 } from '../../types'

export function UVPanel() {
  const { objects, selectedIds, updateObject } = useSceneStore()

  const selectedObjs = Array.from(selectedIds)
    .map(id => objects.get(id))
    .filter(Boolean)

  if (selectedObjs.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="panel-header">UV / Texture</div>
        <div className="p-3 text-xs text-slate-600">Select an object with a texture to edit its UV mapping.</div>
      </div>
    )
  }

  const obj = selectedObjs[0]!
  const offset = obj.uvOffset ?? { x: 0, y: 0, z: 0 }
  const scale  = obj.uvScale  ?? { x: 1, y: 1, z: 1 }
  const rot    = obj.uvRotation ?? 0

  function patchAll(patch: Partial<{ uvOffset: Vec3; uvScale: Vec3; uvRotation: number }>) {
    Array.from(selectedIds).forEach(id => updateObject(id, patch))
  }

  const numInput = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    step = 0.1,
  ) => (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <input
        type="number"
        step={step}
        className="prop-input w-full text-xs"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">UV / Texture</div>
      <div className="p-2 space-y-3 overflow-y-auto">
        {!obj.textureDataUrl && (
          <div className="text-xs text-yellow-600 border border-yellow-800/40 rounded p-2 bg-yellow-900/10">
            No texture assigned. Apply a texture in Materials first.
          </div>
        )}

        <section>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Offset (0–1)</div>
          <div className="grid grid-cols-2 gap-1">
            {numInput('U', offset.x, v => patchAll({ uvOffset: { ...offset, x: v } }))}
            {numInput('V', offset.y, v => patchAll({ uvOffset: { ...offset, y: v } }))}
          </div>
        </section>

        <section>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Repeat / Scale</div>
          <div className="grid grid-cols-2 gap-1">
            {numInput('U', scale.x, v => patchAll({ uvScale: { ...scale, x: v } }))}
            {numInput('V', scale.y, v => patchAll({ uvScale: { ...scale, y: v } }))}
          </div>
        </section>

        <section>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Rotation (°)</div>
          {numInput('Angle', rot, v => patchAll({ uvRotation: v }), 5)}
        </section>

        <button
          className="w-full text-xs py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          onClick={() => patchAll({ uvOffset: { x: 0, y: 0, z: 0 }, uvScale: { x: 1, y: 1, z: 1 }, uvRotation: 0 })}
        >
          Reset UV
        </button>

        <section>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Set Origin</div>
          <div className="text-xs text-slate-500 mb-1">Tile from corner / center of object</div>
          <div className="grid grid-cols-2 gap-1">
            <button className="text-xs py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              onClick={() => patchAll({ uvOffset: { x: 0, y: 0, z: 0 } })}>
              Corner
            </button>
            <button className="text-xs py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              onClick={() => patchAll({ uvOffset: { x: 0.5, y: 0.5, z: 0 } })}>
              Center
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
