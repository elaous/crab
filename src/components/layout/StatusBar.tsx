import { useSceneStore } from '../../store/sceneStore'

function fmt(n: number, p = 3) {
  return n.toFixed(p)
}

export function StatusBar() {
  const { mousePos3D, selectedIds, objects, settings, viewMode, viewPreset } = useSceneStore()

  return (
    <div className="status-bar">
      <span>
        {mousePos3D.valid
          ? `X: ${fmt(mousePos3D.x)}  Y: ${fmt(mousePos3D.y)}  Z: ${fmt(mousePos3D.z)}`
          : 'X: —  Y: —  Z: —'}
      </span>

      <span className="text-slate-700">|</span>

      <span>
        {selectedIds.size > 0
          ? `${selectedIds.size} selected`
          : `${objects.size} object${objects.size !== 1 ? 's' : ''}`}
      </span>

      <span className="text-slate-700">|</span>

      <span className="capitalize">{viewMode} · {viewPreset}</span>

      <span className="text-slate-700">|</span>

      <span>{settings.displayMode}</span>

      <span className="text-slate-700">|</span>

      <span>{settings.units === 'metric' ? 'm' : 'ft'}</span>

      <div className="flex-1" />

      <span className="text-slate-600">
        {settings.snapEnabled ? '⊡ Snap ON' : '⊡ Snap OFF'}
      </span>

      <span className="text-slate-700">|</span>

      <span className="text-slate-600 select-none">
        CrabCAD v1.0 · Phase 1
      </span>
    </div>
  )
}
