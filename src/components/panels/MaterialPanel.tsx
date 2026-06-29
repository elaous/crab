import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES } from '../../lib/materials/materialLibrary'
import type { MaterialPreset } from '../../types'

function Swatch({ preset, selected, onClick }: {
  preset: MaterialPreset
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      title={preset.name}
      onClick={onClick}
      className={`relative rounded-md overflow-hidden border-2 transition-all cursor-pointer
        ${selected ? 'border-blue-400 scale-105' : 'border-transparent hover:border-slate-500'}`}
      style={{ width: 44, height: 44 }}
    >
      <div
        className="w-full h-full"
        style={{
          background: preset.color,
          opacity: preset.opacity,
        }}
      />
      {/* Metalness sheen */}
      {preset.metalness > 0.5 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />
      )}
      {/* Low roughness highlight */}
      {preset.roughness < 0.2 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 40%)',
          }}
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 text-center text-white text-xs"
        style={{ fontSize: 9, lineHeight: '14px', background: 'rgba(0,0,0,0.5)', padding: '1px 2px' }}>
        {preset.name}
      </div>
    </button>
  )
}

export function MaterialPanel() {
  const { objects, selectedIds, updateObject } = useSceneStore()
  const [activeCategory, setActiveCategory] = useState('Wood')

  const selIds = Array.from(selectedIds)
  const firstObj = selIds.length > 0 ? objects.get(selIds[0]) : undefined

  const applyPreset = (preset: MaterialPreset) => {
    selIds.forEach(id => {
      updateObject(id, {
        color: preset.color,
        roughness: preset.roughness,
        metalness: preset.metalness,
        opacity: preset.opacity,
        materialPresetId: preset.id,
      })
    })
  }

  const categoryPresets = MATERIAL_PRESETS.filter(p => p.category === activeCategory)

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Materials
        {selIds.length > 0 && <span className="text-slate-500">{selIds.length} selected</span>}
      </div>
      <div className="panel-body p-2">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {MATERIAL_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`text-xs px-2 py-0.5 rounded border transition-colors
                ${activeCategory === cat
                  ? 'bg-blue-700 border-blue-600 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Swatches */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {categoryPresets.map(preset => (
            <Swatch
              key={preset.id}
              preset={preset}
              selected={firstObj?.materialPresetId === preset.id}
              onClick={() => applyPreset(preset)}
            />
          ))}
        </div>

        {/* Manual PBR controls (shown when object selected) */}
        {firstObj && (
          <>
            <div className="border-t border-slate-700 my-2" />
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">PBR Properties</div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Roughness</span>
                <span className="font-mono">{(firstObj.roughness ?? 0.7).toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={firstObj.roughness ?? 0.7}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { roughness: parseFloat(e.target.value), materialPresetId: undefined }))}
              />
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Metalness</span>
                <span className="font-mono">{(firstObj.metalness ?? 0.1).toFixed(2)}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={firstObj.metalness ?? 0.1}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { metalness: parseFloat(e.target.value), materialPresetId: undefined }))}
              />
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Opacity</span>
                <span className="font-mono">{Math.round(firstObj.opacity * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.01}
                value={firstObj.opacity}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { opacity: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="mb-2">
              <div className="text-xs text-slate-500 mb-1">Base Color</div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={firstObj.color}
                  onChange={e => selIds.forEach(id => updateObject(id, { color: e.target.value, materialPresetId: undefined }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  className="prop-input flex-1"
                  value={firstObj.color}
                  onChange={e => selIds.forEach(id => updateObject(id, { color: e.target.value }))}
                />
              </div>
            </div>
          </>
        )}

        {!firstObj && (
          <div className="text-center text-slate-600 text-xs py-4">
            Select an object to apply materials.
          </div>
        )}
      </div>
    </div>
  )
}
