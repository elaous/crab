import { useMemo } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { MATERIAL_PRESETS, loadCustomPresets } from '../../lib/materials/materialLibrary'
import type { SceneObject, MaterialPreset, BoxDims, SphereDims, CylinderDims, ConeDims } from '../../types'

// Compute dominant surface area for flat objects (floor coverings) or total surface area
function computeArea(obj: SceneObject): number {
  const s = obj.scale
  switch (obj.type) {
    case 'box': {
      const d = obj.dimensions as BoxDims
      const w = d.width * Math.abs(s.x)
      const h = d.height * Math.abs(s.y)
      const dp = d.depth * Math.abs(s.z)
      // For very flat boxes (floor coverings), use top face area
      if (h < 0.05) return w * dp
      return 2 * (w * h + h * dp + w * dp)
    }
    case 'sphere': {
      const d = obj.dimensions as SphereDims
      const r = d.radius * Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z))
      return 4 * Math.PI * r * r
    }
    case 'cylinder': {
      const d = obj.dimensions as CylinderDims
      const r = d.radius * Math.max(Math.abs(s.x), Math.abs(s.z))
      const h = d.height * Math.abs(s.y)
      return 2 * Math.PI * r * (r + h)
    }
    case 'cone': {
      const d = obj.dimensions as ConeDims
      const r = d.radius * Math.max(Math.abs(s.x), Math.abs(s.z))
      const h = d.height * Math.abs(s.y)
      const slant = Math.sqrt(r * r + h * h)
      return Math.PI * r * (r + slant)
    }
    default:
      return 1
  }
}

interface BOMRow {
  presetId: string
  name: string
  sku: string
  manufacturer: string
  totalArea: number      // sqm
  objectCount: number
  unitCost: number
  unitOfMeasure: string
  coveragePerUnit: number
  unitsNeeded: number
  totalCost: number
  color: string
}

function formatUOM(uom: string): string {
  const map: Record<string, string> = {
    sqm: 'm²', sqft: 'ft²', unit: 'units', linear_m: 'lm', linear_ft: 'lft',
  }
  return map[uom] ?? uom
}

export function BOMPanel() {
  const { objects, componentDefs } = useSceneStore()

  const allPresets: MaterialPreset[] = useMemo(() => {
    const customs = loadCustomPresets()
    const customIds = new Set(customs.map(p => p.id))
    // Custom presets take priority — allows price sheet overrides of built-in presets
    return [...customs, ...MATERIAL_PRESETS.filter(p => !customIds.has(p.id))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const map = new Map<string, BOMRow>()

    Array.from(objects.values())
      .filter(obj => obj.visible && obj.type !== 'line')
      .forEach(obj => {
        // Material-based rows
        const presetId = obj.materialPresetId
        if (presetId) {
          const preset = allPresets.find(p => p.id === presetId)
          if (preset && preset.unitCost !== undefined) {
            const area = computeArea(obj)
            const uom = preset.unitOfMeasure ?? 'sqm'
            const coverage = preset.coveragePerUnit ?? 1
            if (!map.has(presetId)) {
              map.set(presetId, {
                presetId,
                name: preset.name,
                sku: preset.sku ?? '—',
                manufacturer: preset.manufacturer ?? '—',
                totalArea: 0,
                objectCount: 0,
                unitCost: preset.unitCost,
                unitOfMeasure: uom,
                coveragePerUnit: coverage,
                unitsNeeded: 0,
                totalCost: 0,
                color: preset.color,
              })
            }
            const row = map.get(presetId)!
            row.totalArea += area
            row.objectCount += 1
          }
        }

        // Component-based rows (count instances)
        if (obj.type === 'component-instance' && obj.componentDefId) {
          const def = componentDefs.get(obj.componentDefId)
          if (def && def.unitCost !== undefined) {
            const key = `comp:${def.id}`
            if (!map.has(key)) {
              map.set(key, {
                presetId: key,
                name: def.name,
                sku: def.sku ?? '—',
                manufacturer: def.manufacturer ?? '—',
                totalArea: 0,
                objectCount: 0,
                unitCost: def.unitCost,
                unitOfMeasure: 'unit',
                coveragePerUnit: 1,
                unitsNeeded: 0,
                totalCost: 0,
                color: def.color,
              })
            }
            map.get(key)!.objectCount += 1
          }
        }
      })

    // Finalize quantities and costs (add 10% waste factor for area-based materials)
    return Array.from(map.values()).map(row => {
      if (row.unitOfMeasure === 'unit') {
        row.unitsNeeded = row.objectCount
      } else {
        // 10% waste / cutting factor
        row.unitsNeeded = Math.ceil((row.totalArea * 1.1) / row.coveragePerUnit)
      }
      row.totalCost = row.unitsNeeded * row.unitCost
      return row
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [objects, componentDefs, allPresets])

  const grandTotal = rows.reduce((s, r) => s + r.totalCost, 0)

  const exportCSV = () => {
    const header = 'Material/Component,SKU,Manufacturer,Area (m²),Qty,Unit,Unit Cost ($),Total Cost ($)'
    const lines = rows.map(r =>
      `"${r.name}","${r.sku}","${r.manufacturer}",${r.unitOfMeasure !== 'unit' ? r.totalArea.toFixed(2) : r.objectCount},${r.unitsNeeded},${formatUOM(r.unitOfMeasure)},${r.unitCost.toFixed(2)},${r.totalCost.toFixed(2)}`
    )
    lines.push(`"TOTAL","","","","","","",${grandTotal.toFixed(2)}`)
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'takeoff.csv'
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        Takeoff
        <button
          onClick={exportCSV}
          className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
          title="Export CSV"
        >
          CSV
        </button>
      </div>

      <div className="panel-body p-2 overflow-y-auto flex-1">
        {rows.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-6">
            Apply Smart Materials with cost data to objects to generate a quantity takeoff.
          </div>
        ) : (
          <>
            <div className="space-y-1.5 mb-3">
              {rows.map(row => (
                <div key={row.presetId} className="bg-slate-800 rounded p-2 text-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                    <span className="font-medium text-slate-200 flex-1 truncate">{row.name}</span>
                    <span className="text-slate-400 font-mono">${row.totalCost.toFixed(0)}</span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>
                      {row.unitOfMeasure !== 'unit'
                        ? `${row.totalArea.toFixed(2)} m² → `
                        : `${row.objectCount}× → `}
                      {row.unitsNeeded} {formatUOM(row.unitOfMeasure)}
                      {row.unitOfMeasure !== 'unit' && <span className="text-slate-600"> (+10%)</span>}
                    </span>
                    <span>${row.unitCost}/{formatUOM(row.unitOfMeasure)}</span>
                  </div>
                  {row.sku !== '—' && (
                    <div className="text-slate-600 mt-0.5">SKU: {row.sku}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-2">
              <div className="flex justify-between text-sm font-semibold text-slate-200">
                <span>Estimated Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Includes 10% waste factor on area-based materials. Costs are estimates only.
              </div>
            </div>
          </>
        )}

        <div className="mt-4 border-t border-slate-700 pt-3">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">How it works</div>
          <div className="text-xs text-slate-600 space-y-1">
            <p>Apply materials from the <span className="text-slate-400">Materials</span> panel. Smart materials with cost/coverage data auto-calculate quantities from object surface areas.</p>
            <p>Component instances with unit cost defined in the Component panel count as individual units.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
