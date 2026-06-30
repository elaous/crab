import { useSceneStore } from '../../store/sceneStore'

export function LightingPanel() {
  const { settings, updateSettings } = useSceneStore()

  const sliders: {
    label: string
    key: 'sunAzimuth' | 'sunElevation' | 'sunIntensity'
    min: number; max: number; step: number
    format: (v: number) => string
  }[] = [
    { label: 'Azimuth', key: 'sunAzimuth', min: 0, max: 360, step: 1, format: v => `${Math.round(v)}°` },
    { label: 'Elevation', key: 'sunElevation', min: 0, max: 90, step: 1, format: v => `${Math.round(v)}°` },
    { label: 'Intensity', key: 'sunIntensity', min: 0, max: 3, step: 0.05, format: v => v.toFixed(2) },
  ]

  const toggles: { label: string; key: 'shadowsEnabled' | 'outlineEnabled' | 'sobelEnabled' | 'aoEnabled' }[] = [
    { label: 'Shadows', key: 'shadowsEnabled' },
    { label: 'Selection Outline', key: 'outlineEnabled' },
    { label: 'Sobel Edge', key: 'sobelEnabled' },
    { label: 'Ambient Occlusion', key: 'aoEnabled' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Lighting</div>
      <div className="panel-body p-2 space-y-3">

        {/* Sun direction */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Sun Direction</div>
          {sliders.map(({ label, key, min, max, step, format }) => (
            <div key={key} className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{label}</span>
                <span className="font-mono">{format(settings[key])}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step}
                value={settings[key]}
                className="w-full accent-blue-500"
                onChange={e => updateSettings({ [key]: parseFloat(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700" />

        {/* Render toggles */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Render Options</div>
          {toggles.map(({ label, key }) => (
            <label key={key} className="flex items-center justify-between py-1 cursor-pointer group">
              <span className="text-xs text-slate-300 group-hover:text-white">{label}</span>
              <div
                className={`relative w-8 h-4 rounded-full transition-colors ${settings[key] ? 'bg-blue-600' : 'bg-slate-700'}`}
                onClick={() => updateSettings({ [key]: !settings[key] })}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow
                  ${settings[key] ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </div>
            </label>
          ))}
        </div>

        <div className="border-t border-slate-700" />

        {/* Display mode */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Display Mode</div>
          {(['shaded', 'wireframe', 'rendered'] as const).map(mode => (
            <button
              key={mode}
              className={`w-full text-left text-xs px-2 py-1 rounded mb-0.5 capitalize transition-colors
                ${settings.displayMode === mode
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              onClick={() => updateSettings({ displayMode: mode })}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="border-t border-slate-700" />

        {/* Tone mapping */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Tone Mapping</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {(['none', 'linear', 'reinhard', 'cineon', 'aces'] as const).map(tm => (
              <button
                key={tm}
                className={`px-2 py-0.5 text-xs rounded capitalize transition-colors
                  ${settings.toneMapping === tm
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                onClick={() => updateSettings({ toneMapping: tm })}
              >
                {tm}
              </button>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Exposure</span>
              <span className="font-mono">{settings.exposure.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0.1} max={3} step={0.05}
              value={settings.exposure}
              className="w-full accent-blue-500"
              onChange={e => updateSettings({ exposure: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Bloom */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Bloom</div>
          <label className="flex items-center justify-between py-1 cursor-pointer group mb-1">
            <span className="text-xs text-slate-300 group-hover:text-white">Enable Bloom</span>
            <div
              className={`relative w-8 h-4 rounded-full transition-colors ${settings.bloomEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              onClick={() => updateSettings({ bloomEnabled: !settings.bloomEnabled })}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow
                ${settings.bloomEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </div>
          </label>
          {settings.bloomEnabled && (
            <>
              {([
                { label: 'Strength', key: 'bloomStrength' as const, min: 0, max: 3, step: 0.05 },
                { label: 'Radius',   key: 'bloomRadius'   as const, min: 0, max: 1, step: 0.01 },
                { label: 'Threshold',key: 'bloomThreshold'as const, min: 0, max: 1, step: 0.01 },
              ] as const).map(({ label, key, min, max, step }) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{label}</span>
                    <span className="font-mono">{(settings[key] as number).toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step}
                    value={settings[key] as number}
                    className="w-full accent-blue-500"
                    onChange={e => updateSettings({ [key]: parseFloat(e.target.value) })}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-slate-700" />

        {/* Environment */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Environment</div>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {(['none', 'studio', 'outdoor', 'sunset', 'city'] as const).map(preset => (
              <button
                key={preset}
                className={`text-xs py-1 rounded capitalize transition-colors
                  ${settings.envPreset === preset
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                onClick={() => updateSettings({ envPreset: preset })}
              >
                {preset}
              </button>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Intensity</span>
              <span className="font-mono">{settings.envIntensity.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={2} step={0.05}
              value={settings.envIntensity}
              className="w-full accent-blue-500"
              onChange={e => updateSettings({ envIntensity: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Background */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Background</div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.bgColor}
              className="w-8 h-8 rounded cursor-pointer border-0"
              style={{ padding: 1 }}
              onChange={e => updateSettings({ bgColor: e.target.value })}
            />
            <span className="text-xs text-slate-400 font-mono">{settings.bgColor}</span>
          </div>
        </div>

        <div className="border-t border-slate-700" />

        {/* Section cut */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Section Cut</div>
          <label className="flex items-center justify-between py-1 cursor-pointer group mb-2">
            <span className="text-xs text-slate-300 group-hover:text-white">Enable Section</span>
            <div
              className={`relative w-8 h-4 rounded-full transition-colors ${settings.sectionEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
              onClick={() => updateSettings({ sectionEnabled: !settings.sectionEnabled })}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow
                ${settings.sectionEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </div>
          </label>

          {settings.sectionEnabled && (
            <>
              <div className="flex gap-1 mb-2">
                {(['x', 'y', 'z'] as const).map(ax => (
                  <button
                    key={ax}
                    className={`flex-1 text-xs py-1 rounded uppercase font-mono transition-colors
                      ${settings.sectionAxis === ax
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    onClick={() => updateSettings({ sectionAxis: ax })}
                  >
                    {ax}
                  </button>
                ))}
              </div>
              <div className="mb-1">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Offset</span>
                  <span className="font-mono">{settings.sectionOffset.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min={-10} max={10} step={0.05}
                  value={settings.sectionOffset}
                  className="w-full accent-blue-500"
                  onChange={e => updateSettings({ sectionOffset: parseFloat(e.target.value) })}
                />
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
