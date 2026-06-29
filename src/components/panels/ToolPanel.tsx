import { useSceneStore } from '../../store/sceneStore'
import type { PrimitiveType } from '../../types'

const primitives: Array<{ type: PrimitiveType; icon: string; label: string }> = [
  { type: 'box', icon: '⬛', label: 'Box' },
  { type: 'sphere', icon: '⬤', label: 'Sphere' },
  { type: 'cylinder', icon: '⬭', label: 'Cylinder' },
  { type: 'cone', icon: '△', label: 'Cone' },
]

const viewPresets = [
  { preset: 'front' as const, icon: '⬆', label: 'Front' },
  { preset: 'top' as const, icon: '⊙', label: 'Top' },
  { preset: 'right' as const, icon: '➡', label: 'Right' },
  { preset: 'iso' as const, icon: '◈', label: 'Iso' },
]

export function ToolPanel() {
  const { addObject, setViewPreset, setViewMode, viewMode, settings, updateSettings } = useSceneStore()

  return (
    <div className="flex flex-col gap-3 p-2">
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Primitives</div>
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

      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Views</div>
        <div className="grid grid-cols-2 gap-1">
          {viewPresets.map(({ preset, icon, label }) => (
            <button
              key={preset}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
              onClick={() => setViewPreset(preset)}
            >
              <span className="text-base">{icon}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          <button
            className={`flex-1 text-xs py-1 rounded border transition-colors ${viewMode === 'perspective' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            onClick={() => setViewMode('perspective')}
          >Persp</button>
          <button
            className={`flex-1 text-xs py-1 rounded border transition-colors ${viewMode === 'orthographic' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            onClick={() => setViewMode('orthographic')}
          >Ortho</button>
        </div>
      </section>

      <div className="border-t border-slate-700" />

      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Display</div>
        <div className="flex flex-col gap-1">
          {(['shaded', 'wireframe', 'rendered'] as const).map(mode => (
            <button
              key={mode}
              className={`text-xs py-1 px-2 rounded border text-left transition-colors ${settings.displayMode === mode ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              onClick={() => updateSettings({ displayMode: mode })}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Settings</div>
        <label className="flex items-center gap-2 px-1 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.gridVisible}
            onChange={e => updateSettings({ gridVisible: e.target.checked })}
            className="accent-blue-500"
          />
          Grid
        </label>
        <label className="flex items-center gap-2 px-1 text-xs text-slate-400 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={settings.axesVisible}
            onChange={e => updateSettings({ axesVisible: e.target.checked })}
            className="accent-blue-500"
          />
          Axes
        </label>
        <label className="flex items-center gap-2 px-1 text-xs text-slate-400 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={settings.shadowsEnabled}
            onChange={e => updateSettings({ shadowsEnabled: e.target.checked })}
            className="accent-blue-500"
          />
          Shadows
        </label>
        <label className="flex items-center gap-2 px-1 text-xs text-slate-400 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={settings.snapEnabled}
            onChange={e => updateSettings({ snapEnabled: e.target.checked })}
            className="accent-blue-500"
          />
          Snap
        </label>
      </section>
    </div>
  )
}
