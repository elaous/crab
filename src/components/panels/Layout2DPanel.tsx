import { useRef, useState, useCallback } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import type { SceneObject } from '../../types'

const SCALE_OPTIONS = [0.25, 0.5, 1, 2, 4, 8]

function objectBounds(obj: SceneObject) {
  const w = (obj.dimensions as Record<string, number>).width ?? 1
  const d = (obj.dimensions as Record<string, number>).depth ?? 1
  return { w: w * obj.scale.x, d: d * obj.scale.z }
}

export function Layout2DPanel() {
  const objects = useSceneStore(s => s.objects)
  const selectedIds = useSceneStore(s => s.selectedIds)
  const selectObject = useSceneStore(s => s.selectObject)
  const [scale, setScale] = useState(2)         // px per meter
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [showDims, setShowDims] = useState(true)
  const [dragging, setDragging] = useState(false)
  const lastDrag = useRef({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 1 && e.button !== 2) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    lastDrag.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const dx = e.clientX - lastDrag.current.x
    const dy = e.clientY - lastDrag.current.y
    lastDrag.current = { x: e.clientX, y: e.clientY }
    setPanX(p => p + dx)
    setPanY(p => p + dy)
  }, [dragging])

  const onPointerUp = useCallback(() => setDragging(false), [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.max(0.25, Math.min(32, s * (e.deltaY < 0 ? 1.15 : 1 / 1.15))))
  }, [])

  const visibleObjects = Array.from(objects.values()).filter(o => o.visible)

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between pr-2">
        <span>2D Layout</span>
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showDims} onChange={e => setShowDims(e.target.checked)} className="accent-blue-500" />
            Dims
          </label>
          <select
            className="text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded px-1 py-0.5"
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
          >
            {SCALE_OPTIONS.map(s => (
              <option key={s} value={s}>{s * 50}:1</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-950 relative">
        <svg
          ref={svgRef}
          className="w-full h-full select-none"
          style={{ cursor: dragging ? 'grabbing' : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid-minor" width={scale} height={scale} patternUnits="userSpaceOnUse"
              x={panX % scale} y={panY % scale}>
              <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <pattern id="grid-major" width={scale * 5} height={scale * 5} patternUnits="userSpaceOnUse"
              x={panX % (scale * 5)} y={panY % (scale * 5)}>
              <rect width={scale * 5} height={scale * 5} fill="url(#grid-minor)" />
              <path d={`M ${scale * 5} 0 L 0 0 0 ${scale * 5}`} fill="none" stroke="#334155" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#grid-major)" />

          {/* Objects */}
          <g transform={`translate(${panX}, ${panY})`}>
            {visibleObjects.map(obj => {
              const { w, d } = objectBounds(obj)
              const x = obj.position.x * scale - (w * scale) / 2
              const z = obj.position.z * scale - (d * scale) / 2
              const isSelected = selectedIds.has(obj.id)

              return (
                <g key={obj.id} onClick={() => selectObject(obj.id, false)}>
                  <rect
                    x={x}
                    y={z}
                    width={w * scale}
                    height={d * scale}
                    fill={obj.color}
                    fillOpacity={obj.opacity * 0.7}
                    stroke={isSelected ? '#60a5fa' : '#475569'}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                    style={{ cursor: 'pointer' }}
                  />
                  {/* Name label */}
                  {w * scale > 20 && (
                    <text
                      x={x + (w * scale) / 2}
                      y={z + (d * scale) / 2 + 3}
                      textAnchor="middle"
                      fontSize={Math.max(6, Math.min(10, scale * 0.8))}
                      fill="#94a3b8"
                      style={{ pointerEvents: 'none' }}
                    >
                      {obj.name}
                    </text>
                  )}
                  {/* Dimension labels */}
                  {showDims && w * scale > 24 && (
                    <>
                      <text
                        x={x + (w * scale) / 2}
                        y={z - 3}
                        textAnchor="middle"
                        fontSize="7"
                        fill="#64748b"
                        style={{ pointerEvents: 'none' }}
                      >
                        {w.toFixed(2)}m
                      </text>
                      <text
                        x={x - 3}
                        y={z + (d * scale) / 2 + 3}
                        textAnchor="end"
                        fontSize="7"
                        fill="#64748b"
                        style={{ pointerEvents: 'none' }}
                      >
                        {d.toFixed(2)}m
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* Origin crosshair */}
            <line x1={-8} y1={0} x2={8} y2={0} stroke="#475569" strokeWidth="0.5" />
            <line x1={0} y1={-8} x2={0} y2={8} stroke="#475569" strokeWidth="0.5" />
          </g>
        </svg>

        <div className="absolute bottom-2 right-2 text-xs text-slate-600">
          {scale.toFixed(1)} px/m · scroll to zoom · middle-drag to pan
        </div>
      </div>
    </div>
  )
}
