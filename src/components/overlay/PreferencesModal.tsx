import { useSceneStore, DEFAULT_SETTINGS } from '../../store/sceneStore'
import type { SceneSettings } from '../../types'

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-4 first:mt-0">{title}</div>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
      <span className="text-xs text-slate-300">{label}</span>
      {children}
    </div>
  )
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

function ButtonGroup<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex rounded overflow-hidden border border-slate-700">
      {options.map(o => (
        <button
          key={o}
          className={`text-xs px-2 py-0.5 transition-colors
            ${value === o ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          onClick={() => onChange(o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}

export function PreferencesModal({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useSceneStore()

  const upd = (patch: Partial<SceneSettings>) => updateSettings(patch)

  const resetDefaults = () => upd(DEFAULT_SETTINGS)

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'facet3d-config.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        upd(JSON.parse(text) as Partial<SceneSettings>)
      } catch { alert('Invalid config file') }
    }
    input.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-96 shadow-2xl max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-white">Preferences</div>
          <button className="text-slate-400 hover:text-white text-lg leading-none" onClick={onClose}>×</button>
        </div>

        {/* General */}
        <SectionHeader title="General" />
        <Row label="Units">
          <ButtonGroup
            options={['metric', 'imperial'] as const}
            value={settings.units as 'metric' | 'imperial'}
            onChange={v => upd({ units: v })}
          />
        </Row>
        <Row label="Decimal places">
          <input
            type="number" min={0} max={6}
            value={settings.precision}
            onChange={e => upd({ precision: Math.max(0, Math.min(6, parseInt(e.target.value) || 0)) })}
            className="prop-input w-14 text-center text-xs"
          />
        </Row>

        {/* Snap & Grid */}
        <SectionHeader title="Snap & Grid" />
        <Row label="Snap to grid">
          <Toggle on={settings.snapEnabled} onClick={() => upd({ snapEnabled: !settings.snapEnabled })} />
        </Row>
        <Row label="Snap distance (px)">
          <input
            type="number" min={1} max={50}
            value={settings.snapDistance}
            onChange={e => upd({ snapDistance: Math.max(1, parseFloat(e.target.value) || 1) })}
            className="prop-input w-14 text-center text-xs"
          />
        </Row>
        <Row label="Grid">
          <Toggle on={settings.gridVisible} onClick={() => upd({ gridVisible: !settings.gridVisible })} />
        </Row>
        <Row label="Axes">
          <Toggle on={settings.axesVisible} onClick={() => upd({ axesVisible: !settings.axesVisible })} />
        </Row>

        {/* Rendering */}
        <SectionHeader title="Rendering" />
        <Row label="Shadows">
          <Toggle on={settings.shadowsEnabled} onClick={() => upd({ shadowsEnabled: !settings.shadowsEnabled })} />
        </Row>
        <Row label="Selection outline">
          <Toggle on={settings.outlineEnabled} onClick={() => upd({ outlineEnabled: !settings.outlineEnabled })} />
        </Row>
        <Row label="Sobel edge detection">
          <Toggle on={settings.sobelEnabled} onClick={() => upd({ sobelEnabled: !settings.sobelEnabled })} />
        </Row>
        <Row label="Display mode">
          <ButtonGroup
            options={['shaded', 'wireframe', 'rendered'] as const}
            value={settings.displayMode}
            onChange={v => upd({ displayMode: v })}
            labels={{ shaded: 'Shaded', wireframe: 'Wire', rendered: 'PBR' }}
          />
        </Row>
        <Row label="Tone mapping">
          <ButtonGroup
            options={['none', 'aces', 'reinhard', 'cineon'] as const}
            value={settings.toneMapping as 'none' | 'aces' | 'reinhard' | 'cineon'}
            onChange={v => upd({ toneMapping: v })}
            labels={{ none: 'None', aces: 'ACES', reinhard: 'RH', cineon: 'Cin' }}
          />
        </Row>

        {/* Storage */}
        <SectionHeader title="Data" />
        <div className="text-xs text-slate-500 mb-2">
          Preferences are saved automatically to your browser's local storage.
        </div>
        <div className="flex gap-2">
          <button
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            onClick={exportConfig}
          >
            Export Config
          </button>
          <button
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            onClick={importConfig}
          >
            Import Config
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 pt-3 mt-4 flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded transition-colors"
            onClick={resetDefaults}
          >
            Reset to Defaults
          </button>
          <div className="flex-1" />
          <button
            className="text-xs px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
