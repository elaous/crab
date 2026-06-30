import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { useToolStore } from '../../store/toolStore'
import type { ToolMode } from '../../store/toolStore'
import type { PrimitiveType } from '../../types'

const primitives: Array<{ type: PrimitiveType; icon: string; label: string }> = [
  { type: 'box', icon: '⬛', label: 'Box' },
  { type: 'sphere', icon: '⬤', label: 'Sphere' },
  { type: 'cylinder', icon: '⬭', label: 'Cylinder' },
  { type: 'cone', icon: '△', label: 'Cone' },
  { type: 'line', icon: '╱', label: 'Line' },
]

const tools: Array<{ mode: ToolMode; icon: string; label: string; shortcut: string }> = [
  { mode: 'select',   icon: '↖',  label: 'Select',    shortcut: 'S' },
  { mode: 'move',     icon: '✥',  label: 'Move',      shortcut: 'M' },
  { mode: 'rotate',   icon: '↻',  label: 'Rotate',    shortcut: 'R' },
  { mode: 'scale',    icon: '⤢',  label: 'Scale',     shortcut: 'E' },
  { mode: 'pushpull', icon: '⬆↕', label: 'Push/Pull', shortcut: 'P' },
]

const drawTools: Array<{ mode: ToolMode; icon: string; label: string; shortcut: string }> = [
  { mode: 'draw',    icon: '✏️', label: 'Draw',    shortcut: 'D' },
  { mode: 'arc',     icon: '⌒',  label: 'Arc',     shortcut: 'A' },
  { mode: 'polygon', icon: '⬡',  label: 'Polygon', shortcut: 'G' },
  { mode: 'eraser',  icon: '◻',  label: 'Eraser',  shortcut: 'X' },
]

const measureTools: Array<{ mode: ToolMode; icon: string; label: string; shortcut: string }> = [
  { mode: 'measure',    icon: '📏', label: 'Tape',       shortcut: 'T' },
  { mode: 'protractor', icon: '📐', label: 'Protractor', shortcut: 'Q' },
]

const viewPresets = [
  { preset: 'front' as const, label: 'Front' },
  { preset: 'top' as const, label: 'Top' },
  { preset: 'right' as const, label: 'Right' },
  { preset: 'iso' as const, label: 'Iso' },
]

interface ToolButtonProps {
  mode: ToolMode
  icon: string
  label: string
  shortcut: string
  activeTool: ToolMode
  onClick: () => void
}

function ToolButton({ mode, icon, label, shortcut, activeTool, onClick }: ToolButtonProps) {
  return (
    <button
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors border
        ${activeTool === mode
          ? 'bg-blue-700 border-blue-600 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
      onClick={onClick}
      title={`${label} (${shortcut})`}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-slate-600 text-xs">{shortcut}</span>
    </button>
  )
}

export function ToolPanel() {
  const { addObject, setViewPreset, setViewMode, viewMode, settings, updateSettings, selectedIds, mirrorObjects, arrayObjects, offsetSelectedFace } = useSceneStore()
  const { activeTool, setActiveTool } = useToolStore()
  const [offsetInput, setOffsetInput] = useState('')
  const [showOffsetInput, setShowOffsetInput] = useState(false)

  // Array tool state
  const [arrayCount, setArrayCount] = useState(3)
  const [arrayX, setArrayX] = useState(1.2)
  const [arrayY, setArrayY] = useState(0)
  const [arrayZ, setArrayZ] = useState(0)
  const [showArray, setShowArray] = useState(false)

  const hasSelection = selectedIds.size > 0

  return (
    <div className="flex flex-col gap-3 p-2">

      {/* Tool modes */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Tools</div>
        <div className="flex flex-col gap-0.5">
          {tools.map(({ mode, icon, label, shortcut }) => (
            <ToolButton
              key={mode}
              mode={mode}
              icon={icon}
              label={label}
              shortcut={shortcut}
              activeTool={activeTool}
              onClick={() => setActiveTool(mode)}
            />
          ))}
        </div>
        {activeTool === 'pushpull' && (
          <div className="mt-1 text-xs text-blue-400/80 px-1">
            Boxes only. Click face + drag.
          </div>
        )}
      </section>

      <div className="border-t border-slate-700" />

      {/* Drawing tools */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Drawing</div>
        <div className="flex flex-col gap-0.5">
          {drawTools.map(({ mode, icon, label, shortcut }) => (
            <ToolButton
              key={mode}
              mode={mode}
              icon={icon}
              label={label}
              shortcut={shortcut}
              activeTool={activeTool}
              onClick={() => setActiveTool(mode)}
            />
          ))}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* Measurement tools */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Measure</div>
        <div className="flex flex-col gap-0.5">
          {measureTools.map(({ mode, icon, label, shortcut }) => (
            <ToolButton
              key={mode}
              mode={mode}
              icon={icon}
              label={label}
              shortcut={shortcut}
              activeTool={activeTool}
              onClick={() => setActiveTool(mode)}
            />
          ))}
        </div>
      </section>

      <div className="border-t border-slate-700" />

      {/* Geometry Ops */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Geometry Ops</div>
        <div className="flex flex-col gap-1">
          {/* Offset Face */}
          {!showOffsetInput ? (
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              onClick={() => setShowOffsetInput(true)}
            >
              <span className="w-5 text-center">⊡</span>
              <span className="flex-1">Offset Face</span>
            </button>
          ) : (
            <div className="flex gap-1">
              <input
                className="prop-input flex-1 text-xs"
                placeholder="Distance…"
                value={offsetInput}
                autoFocus
                onChange={e => setOffsetInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const d = parseFloat(offsetInput)
                    if (!isNaN(d)) offsetSelectedFace(d)
                    setShowOffsetInput(false)
                    setOffsetInput('')
                  }
                  if (e.key === 'Escape') {
                    setShowOffsetInput(false)
                    setOffsetInput('')
                  }
                }}
              />
              <button
                className="text-xs px-2 py-1 rounded bg-blue-700 text-white"
                onClick={() => {
                  const d = parseFloat(offsetInput)
                  if (!isNaN(d)) offsetSelectedFace(d)
                  setShowOffsetInput(false)
                  setOffsetInput('')
                }}
              >OK</button>
            </div>
          )}

          {/* Follow Me */}
          <button
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs bg-slate-800 border border-slate-700 text-slate-600 cursor-not-allowed transition-colors"
            title="Select profile + path, then click"
            disabled
          >
            <span className="w-5 text-center">↪</span>
            <span className="flex-1">Follow Me</span>
            <span className="text-slate-700 text-xs">soon</span>
          </button>
        </div>
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

      {/* Mirror & Array */}
      <section>
        <div className="text-xs text-slate-500 mb-1 px-1 uppercase tracking-wider">Transform</div>

        <div className="mb-1">
          <div className="text-xs text-slate-400 mb-1">Mirror selection</div>
          <div className="grid grid-cols-3 gap-1">
            {(['x', 'y', 'z'] as const).map(ax => (
              <button
                key={ax}
                className={`text-xs py-1 rounded border transition-colors uppercase font-mono ${
                  hasSelection
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'bg-slate-800/40 border-slate-800 text-slate-700 cursor-not-allowed'
                }`}
                disabled={!hasSelection}
                onClick={() => mirrorObjects(Array.from(selectedIds), ax)}
                title={`Mirror across ${ax.toUpperCase()} axis`}
              >
                {ax}
              </button>
            ))}
          </div>
        </div>

        <div>
          <button
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white w-full mb-1"
            onClick={() => setShowArray(v => !v)}
          >
            <span>{showArray ? '▼' : '▶'}</span>
            <span>Array / Repeat</span>
          </button>
          {showArray && (
            <div className="pl-2">
              <div className="grid grid-cols-2 gap-1 mb-1">
                <div>
                  <div className="text-xs text-slate-600 mb-0.5">Count</div>
                  <input type="number" min={1} max={99} className="prop-input text-xs"
                    value={arrayCount} onChange={e => setArrayCount(parseInt(e.target.value) || 1)} />
                </div>
                <div />
              </div>
              <div className="text-xs text-slate-600 mb-0.5">Spacing (X Y Z)</div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {([['X', arrayX, setArrayX], ['Y', arrayY, setArrayY], ['Z', arrayZ, setArrayZ]] as const).map(([ax, val, set]) => (
                  <input key={ax as string} type="number" step={0.1} className="prop-input text-xs text-center"
                    value={val as number} onChange={e => (set as (v: number) => void)(parseFloat(e.target.value) || 0)} />
                ))}
              </div>
              <button
                className={`w-full text-xs py-1 rounded transition-colors ${
                  hasSelection
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-800/40 text-slate-700 cursor-not-allowed'
                }`}
                disabled={!hasSelection}
                onClick={() => arrayObjects(Array.from(selectedIds), arrayCount, { x: arrayX, y: arrayY, z: arrayZ })}
              >
                Create Array
              </button>
            </div>
          )}
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
