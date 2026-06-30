import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useSceneStore } from '../../store/sceneStore'
import { MATERIAL_PRESETS, MATERIAL_CATEGORIES, loadCustomPresets, saveCustomPreset, deleteCustomPreset } from '../../lib/materials/materialLibrary'
import type { MaterialPreset } from '../../types'

function Swatch({ preset, selected, onClick, onDelete }: {
  preset: MaterialPreset
  selected: boolean
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <div className="relative group">
      <button
        title={preset.name}
        onClick={onClick}
        className={`relative rounded-md overflow-hidden border-2 transition-all cursor-pointer
          ${selected ? 'border-blue-400 scale-105' : 'border-transparent hover:border-slate-500'}`}
        style={{ width: 44, height: 44 }}
      >
        {preset.textureDataUrl ? (
          <img src={preset.textureDataUrl} alt={preset.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: preset.color, opacity: preset.opacity }} />
        )}
        {preset.metalness > 0.5 && !preset.textureDataUrl && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />
        )}
        {preset.roughness < 0.2 && !preset.textureDataUrl && (
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 40%)' }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 text-center text-white"
          style={{ fontSize: 9, lineHeight: '14px', background: 'rgba(0,0,0,0.5)', padding: '1px 2px' }}>
          {preset.name}
        </div>
      </button>
      {onDelete && (
        <button
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-700 text-white text-xs leading-none hidden group-hover:flex items-center justify-center"
          onClick={e => { e.stopPropagation(); onDelete() }}
          title="Delete"
        >×</button>
      )}
    </div>
  )
}

const ALL_CATEGORIES = [...MATERIAL_CATEGORIES, 'Custom']

export function MaterialPanel() {
  const { objects, selectedIds, updateObject } = useSceneStore()
  const [activeCategory, setActiveCategory] = useState('Wood')
  const [customPresets, setCustomPresets] = useState<MaterialPreset[]>(() => loadCustomPresets())

  // Custom material creator state
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#a07850')
  const [newOpacity, setNewOpacity] = useState(1)
  const [newRoughness, setNewRoughness] = useState(0.7)
  const [newMetalness, setNewMetalness] = useState(0)
  const [newTextureUrl, setNewTextureUrl] = useState<string | null>(null)
  const [newTextureThumb, setNewTextureThumb] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        textureDataUrl: preset.textureDataUrl,
      })
    })
  }

  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      setNewTextureUrl(dataUrl)
      setNewTextureThumb(dataUrl)
      if (!newName) setNewName(file.name.replace(/\.[^.]+$/, ''))
    }
    reader.readAsDataURL(file)
  }

  const createCustomMaterial = () => {
    const preset: MaterialPreset = {
      id: `custom-${uuidv4()}`,
      name: newName || 'Custom Material',
      category: 'Custom',
      color: newColor,
      roughness: newRoughness,
      metalness: newMetalness,
      opacity: newOpacity,
      textureDataUrl: newTextureUrl ?? undefined,
      custom: true,
    }
    saveCustomPreset(preset)
    const updated = loadCustomPresets()
    setCustomPresets(updated)
    // Reset form
    setNewName('')
    setNewColor('#a07850')
    setNewOpacity(1)
    setNewRoughness(0.7)
    setNewMetalness(0)
    setNewTextureUrl(null)
    setNewTextureThumb(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setActiveCategory('Custom')
  }

  const handleDeleteCustom = (id: string) => {
    deleteCustomPreset(id)
    setCustomPresets(loadCustomPresets())
  }

  const categoryPresets = activeCategory === 'Custom'
    ? customPresets
    : MATERIAL_PRESETS.filter(p => p.category === activeCategory)

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Materials
        {selIds.length > 0 && <span className="text-slate-500">{selIds.length} selected</span>}
      </div>
      <div className="panel-body p-2 overflow-y-auto">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {ALL_CATEGORIES.map(cat => (
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
              onDelete={preset.custom ? () => handleDeleteCustom(preset.id) : undefined}
            />
          ))}
          {categoryPresets.length === 0 && (
            <div className="text-xs text-slate-600 py-2">No custom materials yet. Create one below.</div>
          )}
        </div>

        {/* Manual PBR controls */}
        {firstObj && (
          <>
            <div className="border-t border-slate-700 my-2" />
            <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">PBR Properties</div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Roughness</span><span className="font-mono">{(firstObj.roughness ?? 0.7).toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={firstObj.roughness ?? 0.7}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { roughness: parseFloat(e.target.value), materialPresetId: undefined }))} />
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Metalness</span><span className="font-mono">{(firstObj.metalness ?? 0.1).toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={firstObj.metalness ?? 0.1}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { metalness: parseFloat(e.target.value), materialPresetId: undefined }))} />
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Opacity</span><span className="font-mono">{Math.round(firstObj.opacity * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={firstObj.opacity}
                className="w-full accent-blue-500"
                onChange={e => selIds.forEach(id => updateObject(id, { opacity: parseFloat(e.target.value) }))} />
            </div>
            <div className="mb-2">
              <div className="text-xs text-slate-500 mb-1">Base Color</div>
              <div className="flex items-center gap-2">
                <input type="color" value={firstObj.color}
                  onChange={e => selIds.forEach(id => updateObject(id, { color: e.target.value, materialPresetId: undefined }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                <input className="prop-input flex-1" value={firstObj.color}
                  onChange={e => selIds.forEach(id => updateObject(id, { color: e.target.value }))} />
              </div>
            </div>
            {firstObj.textureDataUrl && (
              <div className="mb-2">
                <div className="text-xs text-slate-500 mb-1">Texture</div>
                <div className="flex items-center gap-2">
                  <img src={firstObj.textureDataUrl} alt="texture" className="w-10 h-10 rounded object-cover border border-slate-700" />
                  <button className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => selIds.forEach(id => updateObject(id, { textureDataUrl: undefined, materialPresetId: undefined }))}>
                    Remove texture
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!firstObj && (
          <div className="text-center text-slate-600 text-xs py-2">Select an object to apply materials.</div>
        )}

        {/* ── Custom Material Creator ─────────────────────────── */}
        <div className="border-t border-slate-700 mt-3 pt-3">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Create Material</div>

          {/* Image import */}
          <div className="mb-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageImport} />
            <div
              className="flex items-center gap-2 cursor-pointer rounded border border-dashed border-slate-600 hover:border-blue-500 p-2 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {newTextureThumb ? (
                <img src={newTextureThumb} alt="preview" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <span className="text-lg">+</span>
                </div>
              )}
              <span className="text-xs text-slate-400">{newTextureThumb ? 'Change image…' : 'Import texture image…'}</span>
              {newTextureThumb && (
                <button className="ml-auto text-xs text-red-400 hover:text-red-300"
                  onClick={e => { e.stopPropagation(); setNewTextureUrl(null); setNewTextureThumb(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <input className="prop-input w-full text-xs mb-2" placeholder="Material name…"
            value={newName} onChange={e => setNewName(e.target.value)} />

          {/* Color + opacity */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <div className="text-xs text-slate-500 mb-1">Color tint</div>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer border border-slate-700 bg-transparent" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Opacity</span><span className="font-mono">{Math.round(newOpacity * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={newOpacity}
                className="w-full accent-blue-500" onChange={e => setNewOpacity(parseFloat(e.target.value))} />
            </div>
          </div>

          {/* Roughness + metalness */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Rough</span><span className="font-mono">{newRoughness.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={newRoughness}
                className="w-full accent-blue-500" onChange={e => setNewRoughness(parseFloat(e.target.value))} />
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Metal</span><span className="font-mono">{newMetalness.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={newMetalness}
                className="w-full accent-blue-500" onChange={e => setNewMetalness(parseFloat(e.target.value))} />
            </div>
          </div>

          <button
            className="w-full text-xs py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
            onClick={createCustomMaterial}
          >
            Add to library
          </button>
        </div>
      </div>
    </div>
  )
}
