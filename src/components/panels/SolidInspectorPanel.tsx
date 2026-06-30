import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { inspectScene, type InspectionResult } from '../../lib/tools/SolidInspector'

const ISSUE_COLORS: Record<string, string> = {
  'non-manifold-edge': 'text-red-400',
  'degenerate-triangle': 'text-yellow-400',
  'open-surface': 'text-orange-400',
  'duplicate-vertex': 'text-slate-400',
}

export function SolidInspectorPanel() {
  const objects = useSceneStore(s => s.objects)
  const selectObject = useSceneStore(s => s.selectObject)
  const [results, setResults] = useState<InspectionResult[] | null>(null)
  const [running, setRunning] = useState(false)

  const run = () => {
    setRunning(true)
    // defer to next tick so React re-renders the "running" state first
    setTimeout(() => {
      setResults(inspectScene(objects))
      setRunning(false)
    }, 0)
  }

  const total = results?.length ?? 0
  const issues = results?.filter(r => !r.isManifold || r.issues.length > 0).length ?? 0
  const clean = total - issues

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Solid Inspector</div>
      <div className="p-2 space-y-2">
        <p className="text-xs text-slate-500">
          Checks imported / CSG meshes for non-manifold edges, open surfaces, and degenerate triangles.
        </p>
        <button
          className={`w-full text-xs py-1.5 rounded transition-colors ${
            running ? 'bg-blue-800 text-blue-300 cursor-wait' : 'bg-blue-700 text-white hover:bg-blue-600'
          }`}
          onClick={run}
          disabled={running}
        >
          {running ? 'Inspecting…' : 'Run Inspection'}
        </button>
        {results && (
          <div className="text-xs text-slate-400">
            {total} mesh{total !== 1 ? 'es' : ''} — <span className="text-green-400">{clean} solid</span>
            {issues > 0 && <>, <span className="text-red-400">{issues} with issues</span></>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {results?.map(r => (
          <div
            key={r.objectId}
            className={`rounded border p-2 cursor-pointer hover:border-blue-500 transition-colors ${
              r.isManifold && r.issues.length === 0
                ? 'border-slate-700 bg-slate-800/30'
                : 'border-orange-800 bg-orange-900/10'
            }`}
            onClick={() => selectObject(r.objectId)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300 font-medium truncate flex-1">{r.name}</span>
              {r.isManifold && r.issues.length === 0
                ? <span className="text-xs text-green-400 ml-2">✓ solid</span>
                : <span className="text-xs text-red-400 ml-2">✗</span>
              }
            </div>
            <div className="text-xs text-slate-500">
              {r.triangleCount} tri · {r.vertexCount} vert
            </div>
            {r.issues.map((issue, i) => (
              <div key={i} className={`text-xs mt-0.5 ${ISSUE_COLORS[issue.type] ?? 'text-slate-400'}`}>
                {issue.description}
              </div>
            ))}
          </div>
        ))}
        {results?.length === 0 && (
          <div className="text-xs text-slate-600 text-center mt-4">
            No imported/CSG meshes found. Add geometry and run again.
          </div>
        )}
      </div>
    </div>
  )
}
