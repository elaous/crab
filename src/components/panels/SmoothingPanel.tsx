import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import {
  creaseSmooth, flattenNormals, loopSubdivide, laplacianSmooth,
  geoToCsgData, csgDataToGeo,
} from '../../lib/tools/SmoothingEngine'
import { createGeometry } from '../../lib/geometry/primitives'
import type { SceneObject } from '../../types'

type NormalMode = 'crease' | 'smooth' | 'flat'

function getGeometryForObject(obj: SceneObject) {
  if ((obj.type === 'csg' || obj.type === 'imported') && obj.csgData) {
    return csgDataToGeo(obj.csgData)
  }
  if (obj.type === 'component-instance' || obj.type === 'line') return null
  try {
    return createGeometry(
      obj.type as Exclude<typeof obj.type, 'csg' | 'imported' | 'component-instance' | 'line'>,
      obj.dimensions,
    )
  } catch {
    return null
  }
}

export function SmoothingPanel() {
  const { objects, selectedIds, updateObject } = useSceneStore()
  const [normalMode, setNormalMode] = useState<NormalMode>('crease')
  const [creaseAngle, setCreaseAngle] = useState(30)
  const [subdivIterations, setSubdivIterations] = useState(1)
  const [lapIterations, setLapIterations] = useState(3)
  const [lapFactor, setLapFactor] = useState(0.5)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const selectedObjects = Array.from(selectedIds)
    .map(id => objects.get(id))
    .filter((o): o is SceneObject => !!o)

  const applyNormals = () => {
    setBusy(true)
    setLastResult(null)
    let count = 0
    setTimeout(() => {
      for (const obj of selectedObjects) {
        const geo = getGeometryForObject(obj)
        if (!geo) continue
        let result
        if (normalMode === 'flat') result = flattenNormals(geo)
        else if (normalMode === 'smooth') {
          result = creaseSmooth(geo, 180)
        } else {
          result = creaseSmooth(geo, creaseAngle)
        }
        const csgData = geoToCsgData(result)
        updateObject(obj.id, { csgData, type: 'imported' })
        count++
      }
      setLastResult(`Normals updated on ${count} object(s)`)
      setBusy(false)
    }, 0)
  }

  const applySubdivide = () => {
    setBusy(true)
    setLastResult(null)
    let count = 0
    setTimeout(() => {
      for (const obj of selectedObjects) {
        const geo = getGeometryForObject(obj)
        if (!geo) continue
        const subdivided = loopSubdivide(geo, subdivIterations)
        const csgData = geoToCsgData(subdivided)
        updateObject(obj.id, { csgData, type: 'imported' })
        count++
      }
      setLastResult(`Subdivided ${count} object(s) (×${subdivIterations})`)
      setBusy(false)
    }, 0)
  }

  const applyLaplacian = () => {
    setBusy(true)
    setLastResult(null)
    let count = 0
    setTimeout(() => {
      for (const obj of selectedObjects) {
        const geo = getGeometryForObject(obj)
        if (!geo) continue
        const smoothed = laplacianSmooth(geo, lapIterations, lapFactor)
        const csgData = geoToCsgData(smoothed)
        updateObject(obj.id, { csgData, type: 'imported' })
        count++
      }
      setLastResult(`Laplacian smooth applied to ${count} object(s)`)
      setBusy(false)
    }, 0)
  }

  const noSelection = selectedObjects.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Smoothing</div>
      <div className="panel-body p-2 space-y-4">

        {noSelection && (
          <div className="text-xs text-slate-500 text-center py-4">
            Select one or more objects to smooth.
          </div>
        )}

        {/* ── Soften / Smooth Edges ── */}
        <section>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Soften / Smooth Edges
          </div>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            Edges below the crease angle share smoothed normals; edges above stay hard.
            Like SketchUp's Soften Edges dialog.
          </p>

          <div className="flex gap-1 mb-3">
            {(['flat', 'crease', 'smooth'] as NormalMode[]).map(m => (
              <button
                key={m}
                className={`flex-1 text-xs py-1 rounded border transition-colors ${
                  normalMode === m
                    ? 'bg-blue-700 border-blue-600 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                onClick={() => setNormalMode(m)}
              >
                {m === 'flat' ? 'Flat' : m === 'crease' ? 'By Angle' : 'Full Smooth'}
              </button>
            ))}
          </div>

          {normalMode === 'crease' && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Crease angle</span>
                <span className="text-slate-300 font-mono">{creaseAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                step={1}
                value={creaseAngle}
                onChange={e => setCreaseAngle(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                <span>0° (all hard)</span>
                <span>180° (all soft)</span>
              </div>
            </div>
          )}

          <button
            className="w-full text-xs py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-white transition-colors disabled:opacity-40"
            disabled={noSelection || busy}
            onClick={applyNormals}
          >
            Apply Normals
          </button>
        </section>

        <div className="border-t border-slate-700" />

        {/* ── Loop Subdivision ── */}
        <section>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Subdivide (Loop)
          </div>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            Splits each triangle into 4 and applies Loop weights. Increases mesh
            density for smoother curved results. Like SketchUp's SubD plugin.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-500 flex-1">Iterations</span>
            <input
              type="number"
              min={1}
              max={4}
              value={subdivIterations}
              onChange={e => setSubdivIterations(Math.max(1, Math.min(4, Number(e.target.value))))}
              className="prop-input w-16 text-center text-xs"
            />
          </div>
          <div className="text-xs text-slate-600 mb-2">
            ×{subdivIterations} → ~{Math.pow(4, subdivIterations)}× more triangles per face
          </div>
          <button
            className="w-full text-xs py-1.5 bg-violet-700 hover:bg-violet-600 rounded text-white transition-colors disabled:opacity-40"
            disabled={noSelection || busy}
            onClick={applySubdivide}
          >
            Subdivide
          </button>
        </section>

        <div className="border-t border-slate-700" />

        {/* ── Laplacian Smoothing ── */}
        <section>
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            Laplacian Smooth
          </div>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            Moves each vertex toward the centroid of its neighbors. Reduces noise
            without changing topology.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Iterations</div>
              <input
                type="number"
                min={1}
                max={20}
                value={lapIterations}
                onChange={e => setLapIterations(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="prop-input w-full text-center text-xs"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-0.5">Factor (0–1)</div>
              <input
                type="number"
                min={0.01}
                max={1}
                step={0.05}
                value={lapFactor}
                onChange={e => setLapFactor(Math.max(0.01, Math.min(1, Number(e.target.value))))}
                className="prop-input w-full text-center text-xs"
              />
            </div>
          </div>
          <button
            className="w-full text-xs py-1.5 bg-teal-700 hover:bg-teal-600 rounded text-white transition-colors disabled:opacity-40"
            disabled={noSelection || busy}
            onClick={applyLaplacian}
          >
            Smooth Positions
          </button>
        </section>

        {lastResult && (
          <div className="text-xs text-green-400 text-center py-1 bg-green-900/20 rounded">
            {lastResult}
          </div>
        )}

        {busy && (
          <div className="text-xs text-slate-500 text-center py-1 animate-pulse">
            Processing…
          </div>
        )}
      </div>
    </div>
  )
}
