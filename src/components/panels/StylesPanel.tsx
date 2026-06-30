import { useSceneStore } from '../../store/sceneStore'
import type { StylePreset, SceneSettings } from '../../types'

const PRESETS: { id: StylePreset; label: string; icon: string }[] = [
  { id: 'default',   label: 'Default',    icon: '◼' },
  { id: 'sketchy',   label: 'Sketchy',    icon: '✏' },
  { id: 'flat',      label: 'Flat',       icon: '▲' },
  { id: 'xray',      label: 'X-Ray',      icon: '◎' },
  { id: 'blueprint', label: 'Blueprint',  icon: '⊞' },
]

const PRESET_PATCHES: Record<StylePreset, Partial<SceneSettings>> = {
  default: {
    stylePreset: 'default',
    edgesVisible: true, edgeColor: '#1e293b',
    flatShading: false, xrayMode: false,
    bgGradient: false, bgColor: '#16213e', bgColorTop: '#0f2027',
    displayMode: 'shaded',
  },
  sketchy: {
    stylePreset: 'sketchy',
    edgesVisible: true, edgeColor: '#1a1008',
    flatShading: false, xrayMode: false,
    bgGradient: true, bgColor: '#f5f0e8', bgColorTop: '#e8e4d8',
    displayMode: 'shaded',
  },
  flat: {
    stylePreset: 'flat',
    edgesVisible: true, edgeColor: '#1a1a1a',
    flatShading: true, xrayMode: false,
    bgGradient: true, bgColor: '#ffffff', bgColorTop: '#e8edf2',
    displayMode: 'shaded',
  },
  xray: {
    stylePreset: 'xray',
    edgesVisible: true, edgeColor: '#38bdf8',
    flatShading: false, xrayMode: true,
    bgGradient: false, bgColor: '#020617', bgColorTop: '#020617',
    displayMode: 'shaded',
  },
  blueprint: {
    stylePreset: 'blueprint',
    edgesVisible: true, edgeColor: '#a8c8f8',
    flatShading: true, xrayMode: false,
    bgGradient: true, bgColor: '#0d2040', bgColorTop: '#1a3a6a',
    displayMode: 'shaded',
  },
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      className={`text-xs px-2 py-0.5 rounded transition-colors
        ${on ? 'bg-blue-600/30 text-blue-400' : 'bg-slate-700 text-slate-400'}`}
      onClick={onClick}
    >
      {on ? 'On' : 'Off'}
    </button>
  )
}

export function StylesPanel() {
  const { settings, updateSettings } = useSceneStore()
  const { stylePreset, edgesVisible, edgeColor, flatShading, xrayMode, bgGradient, bgColor, bgColorTop } = settings

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Styles</div>
      <div className="panel-body p-2 space-y-3 overflow-y-auto">

        {/* Presets */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Preset</div>
          <div className="grid grid-cols-3 gap-1">
            {PRESETS.map(p => (
              <button
                key={p.id}
                className={`py-1.5 rounded text-xs font-medium transition-colors flex flex-col items-center gap-0.5
                  ${stylePreset === p.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                onClick={() => updateSettings(PRESET_PATCHES[p.id])}
              >
                <span>{p.icon}</span>
                <span className="text-[10px]">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Edges */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-slate-500">Edges</div>
            <Toggle
              on={edgesVisible}
              onClick={() => updateSettings({ edgesVisible: !edgesVisible })}
            />
          </div>
          {edgesVisible && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Color</span>
              <input
                type="color"
                value={edgeColor}
                onChange={e => updateSettings({ edgeColor: e.target.value })}
                className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-slate-500 font-mono">{edgeColor}</span>
            </div>
          )}
        </div>

        {/* Flat shading */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">Flat shading</div>
          <Toggle
            on={flatShading}
            onClick={() => updateSettings({ flatShading: !flatShading })}
          />
        </div>

        {/* X-Ray */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">X-Ray</div>
          <Toggle
            on={xrayMode}
            onClick={() => updateSettings({ xrayMode: !xrayMode })}
          />
        </div>

        <div className="border-t border-slate-700" />

        {/* Background */}
        <div>
          <div className="text-xs text-slate-500 mb-1.5">Background</div>
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="color"
              value={bgColor}
              onChange={e => updateSettings({ bgColor: e.target.value })}
              className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-slate-500">{bgGradient ? 'Bottom' : 'Color'}</span>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">Gradient</span>
            <Toggle
              on={bgGradient}
              onClick={() => updateSettings({ bgGradient: !bgGradient })}
            />
          </div>
          {bgGradient && (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="color"
                  value={bgColorTop}
                  onChange={e => updateSettings({ bgColorTop: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-slate-500">Top</span>
              </div>
              <div
                className="h-8 rounded border border-slate-700"
                style={{ background: `linear-gradient(to top, ${bgColor}, ${bgColorTop})` }}
              />
            </>
          )}
        </div>

        <div className="border-t border-slate-700" />

        {/* Clipping Volume */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Clip Volume</div>
            <Toggle
              on={settings.clipVolumeEnabled ?? false}
              onClick={() => updateSettings({ clipVolumeEnabled: !(settings.clipVolumeEnabled ?? false) })}
            />
          </div>
          {settings.clipVolumeEnabled && (
            <div className="space-y-1.5">
              {(['x', 'y', 'z'] as const).map(axis => {
                const minVal = (settings.clipVolumeMin ?? { x: -5, y: 0, z: -5 })[axis]
                const maxVal = (settings.clipVolumeMax ?? { x: 5, y: 5, z: 5 })[axis]
                return (
                  <div key={axis} className="grid grid-cols-3 gap-1 items-center">
                    <div className="text-xs text-slate-400 uppercase">{axis}</div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Min</div>
                      <input
                        type="number" step={0.5}
                        className="prop-input w-full text-xs"
                        value={minVal}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0
                          updateSettings({
                            clipVolumeMin: { ...(settings.clipVolumeMin ?? { x: -5, y: 0, z: -5 }), [axis]: v },
                          })
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-600 mb-0.5">Max</div>
                      <input
                        type="number" step={0.5}
                        className="prop-input w-full text-xs"
                        value={maxVal}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0
                          updateSettings({
                            clipVolumeMax: { ...(settings.clipVolumeMax ?? { x: 5, y: 5, z: 5 }), [axis]: v },
                          })
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
