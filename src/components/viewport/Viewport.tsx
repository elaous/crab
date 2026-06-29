import { useEffect, useRef, useCallback, useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { SceneManager } from '../../lib/scene/SceneManager'
import type { MousePosition3D } from '../../types'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetId: string | null
}

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<SceneManager | null>(null)
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null })

  const store = useSceneStore()
  const {
    objects, layers, selectedIds,
    viewMode, viewPreset, settings,
    selectObject, deselectAll, setMousePos3D,
    removeObjects, duplicateObjects, updateObject,
  } = store

  const onSelect = useCallback((id: string | null, additive: boolean) => {
    if (id) selectObject(id, additive)
    else deselectAll()
    setCtxMenu(m => ({ ...m, visible: false }))
  }, [selectObject, deselectAll])

  const onMouseMove3D = useCallback((pos: MousePosition3D) => {
    setMousePos3D(pos)
  }, [setMousePos3D])

  const onContextMenu = useCallback((x: number, y: number, id: string | null) => {
    if (id) selectObject(id, false)
    setCtxMenu({ visible: true, x, y, targetId: id })
  }, [selectObject])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const mgr = new SceneManager(canvas, { onSelect, onMouseMove3D, onContextMenu })
    managerRef.current = mgr

    const ro = new ResizeObserver(() => mgr.resize())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      mgr.destroy()
      managerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    managerRef.current?.syncObjects(objects, layers, selectedIds)
  }, [objects, layers, selectedIds])

  useEffect(() => {
    managerRef.current?.setViewMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    managerRef.current?.setViewPreset(viewPreset)
  }, [viewPreset])

  useEffect(() => {
    managerRef.current?.setDisplayMode(settings.displayMode)
  }, [settings.displayMode])

  useEffect(() => {
    managerRef.current?.setGrid(settings.gridVisible)
  }, [settings.gridVisible])

  useEffect(() => {
    managerRef.current?.setAxes(settings.axesVisible)
  }, [settings.axesVisible])

  useEffect(() => {
    managerRef.current?.setShadows(settings.shadowsEnabled)
  }, [settings.shadowsEnabled])

  const closeCtxMenu = () => setCtxMenu(m => ({ ...m, visible: false }))

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onClick={() => ctxMenu.visible && closeCtxMenu()}
    >
      <canvas
        ref={canvasRef}
        className="viewport-canvas"
        style={{ cursor: 'crosshair' }}
      />

      {/* View mode badge */}
      <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
        <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-slate-300 backdrop-blur-sm">
          {viewMode === 'perspective' ? 'Perspective' : 'Orthographic'}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-black/40 text-slate-300 backdrop-blur-sm capitalize">
          {viewPreset}
        </span>
      </div>

      {/* Context menu */}
      {ctxMenu.visible && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          {ctxMenu.targetId ? (
            <>
              <div className="context-menu-item" onClick={() => {
                duplicateObjects([ctxMenu.targetId!])
                closeCtxMenu()
              }}>
                <span>⧉</span> Duplicate
                <span className="ml-auto text-slate-500">Ctrl+D</span>
              </div>
              <div className="context-menu-item" onClick={() => {
                const obj = objects.get(ctxMenu.targetId!)
                if (obj) updateObject(ctxMenu.targetId!, { visible: !obj.visible })
                closeCtxMenu()
              }}>
                <span>👁</span> {objects.get(ctxMenu.targetId!)?.visible ? 'Hide' : 'Show'}
                <span className="ml-auto text-slate-500">H</span>
              </div>
              <div className="context-menu-sep" />
              <div className="context-menu-item danger" onClick={() => {
                removeObjects([ctxMenu.targetId!])
                closeCtxMenu()
              }}>
                <span>🗑</span> Delete
                <span className="ml-auto text-slate-500">Del</span>
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => {
                store.selectAll()
                closeCtxMenu()
              }}>Select All <span className="ml-auto text-slate-500">Ctrl+A</span></div>
              <div className="context-menu-item" onClick={() => {
                managerRef.current?.frameAll()
                closeCtxMenu()
              }}>Frame All</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
