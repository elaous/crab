import { useSceneStore } from '../../store/sceneStore'
import { useToolStore } from '../../store/toolStore'

function fmt(n: number) { return n.toFixed(3) }

export function StatusBar() {
  const { mousePos3D, selectedIds, objects, settings, viewMode, viewPreset } = useSceneStore()
  const { activeTool, dimensionDisplay, isPushPullDragging } = useToolStore()

  const selCount = selectedIds.size

  return (
    <div className="status-bar">
      {/* 3D cursor */}
      <span className="font-mono">
        {mousePos3D.valid
          ? `X ${fmt(mousePos3D.x)}  Y ${fmt(mousePos3D.y)}  Z ${fmt(mousePos3D.z)}`
          : 'X —  Y —  Z —'}
      </span>

      <span className="text-slate-700">│</span>

      {/* Selection */}
      <span className={selCount > 0 ? 'text-blue-400' : ''}>
        {selCount > 0 ? `${selCount} selected` : `${objects.size} object${objects.size !== 1 ? 's' : ''}`}
      </span>

      <span className="text-slate-700">│</span>

      {/* Active tool */}
      <span className="capitalize text-slate-400">
        Tool: <span className="text-white">{activeTool}</span>
      </span>

      {/* Push/pull dimension */}
      {isPushPullDragging && dimensionDisplay && (
        <>
          <span className="text-slate-700">│</span>
          <span className="text-blue-300 font-mono">{dimensionDisplay}</span>
        </>
      )}

      <span className="text-slate-700">│</span>

      <span className="text-slate-500 capitalize">{viewMode} · {viewPreset}</span>

      <span className="text-slate-700">│</span>

      <span className="text-slate-500 capitalize">{settings.displayMode}</span>

      <div className="flex-1" />

      <span className={settings.snapEnabled ? 'text-green-500' : 'text-slate-600'}>
        {settings.snapEnabled ? `⊡ Snap ${(settings.snapDistance / 100).toFixed(2)}m` : '⊡ Snap OFF'}
      </span>

      <span className="text-slate-700">│</span>

      <span className="text-slate-600">{settings.units === 'metric' ? 'Metric (m)' : 'Imperial (ft)'}</span>

      <span className="text-slate-700">│</span>

      <span className="text-slate-700">Facet 3D v1.0</span>
    </div>
  )
}
