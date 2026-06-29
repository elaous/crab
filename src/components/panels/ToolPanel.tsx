import { useSceneStore } from '../../store/sceneStore'
import { useToolStore } from '../../store/toolStore'
import type { ToolMode } from '../../store/toolStore'
import type { PrimitiveType } from '../../types'

const primitives: Array<{ type: PrimitiveType; icon: string; label: string }> = [
  { type: 'box', icon: '⬛', label: 'Box' },
  { type: 'sphere', icon: '⬤', label: 'Sphere' },
  { type: 'cylinder', icon: '⬭', label: 'Cylinder' },
  { type: 'cone', icon: '△', label: 'Cone' },
]

const tools: Array<{ mode: ToolMode; icon: string; label: string; key: string }> = [
  { mode: 'select',   icon: '↖',  label: 'Select',    key: 'S' },
  { mode: 'move',     icon: '✥',  label: 'Move',      key: 'M' },
  { mode: 'rotate',   icon: '↻',  label: 'Rotate',    key: 'R' },
  { mode: 'scale',    icon: '⤢',  label: 'Scale',     key: 'E' },
  { mode: 'pushpull', icon: '⬆↕', label: 'Push/Pull', key: 'P' },
]

const viewPresets = [
  { preset: 'front' as const, label: 'Front' },
  { preset: 'top' as const, label: 'Top' },
  { preset: 'right' as const, label: 'Right' },
  { preset: 'iso' as const, label: 'Iso' },
]

export function ToolPanel() {
  const { addObject, setViewPreset, setViewMode, viewMode, settings, updateSettings } = useSceneStore()
  const { activeTool, setActiveTool } = useToolStore()

  return (
    <div className="flex flex-col gap-3 p-2">

      {/* Tool modes */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Tools</div>
        <div className="flex flex-col gap-0.5">
          {tools.map(({ mode, icon, label, key }) => (
            <button
              key={mode}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors border
                ${activeTool === mode
                  ? 'bg-blue-700 border-blue-600 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              onClick={() => setActiveTool(mode)}
              title={`${label} (${key})`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              <span className="flex-1">{label}</span>
              <span className="text-slate-600 text-xs">{key}</span>
            </button>
          ))}
        </div>
        {activeTool === 'pushpull' && (
          <div className="mt-1 text-xs text-blue-400/80 px-1">
            Boxes only. Click face + drag.
          </div>
        )}
      </section>

      <div className="border-t border-slate-700" />

      {/* Primitives */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Add Primitive</div>
        <div className="grid grid-cols-2 gap-1">
          {primitives.map(({ type, icon, label }) => (
            <button
              key={type}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 hover:border-blue-500"
              title={`Add ${label}`}
              onClick={() => addObject(type)}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* Camera views */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Views</div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          {viewPresets.map(({ preset, label }) => (
            <button
              key={preset}
              className="text-xs py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              onClick={() => setViewPreset(preset)}
            >{label}</button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            className={`flex-1 text-xs py-1 rounded border transition-colors
              ${viewMode === 'perspective' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            onClick={() => setViewMode('perspective')}
          >Persp</button>
          <button
            className={`flex-1 text-xs py-1 rounded border transition-colors
              ${viewMode === 'orthographic' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            onClick={() => setViewMode('orthographic')}
          >Ortho</button>
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* Display modes */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Display</div>
        <div className="flex flex-col gap-1">
          {(['shaded', 'wireframe', 'rendered'] as const).map(mode => (
            <button
              key={mode}
              className={`text-xs py-1 px-2 rounded border text-left transition-colors
                ${settings.displayMode === mode ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              onClick={() => updateSettings({ displayMode: mode })}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* Scene settings */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Scene</div>
        {[
          { key: 'gridVisible', label: 'Grid' },
          { key: 'axesVisible', label: 'Axes' },
          { key: 'shadowsEnabled', label: 'Shadows' },
          { key: 'snapEnabled', label: 'Snap to Grid' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 px-1 text-xs text-slate-400 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={settings[key as keyof typeof settings] as boolean}
              onChange={e => updateSettings({ [key]: e.target.checked })}
              className="accent-blue-500"
            />
            {label}
          </label>
        ))}

        <div className="mt-2 px-1">
          <div className="text-xs text-slate-500 mb-1">Snap size (m)</div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={settings.snapDistance}
              className="flex-1 accent-blue-500"
              onChange={e => updateSettings({ snapDistance: parseInt(e.target.value) })}
            />
            <span className="text-xs text-slate-400 w-10 text-right">
              {(settings.snapDistance / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
