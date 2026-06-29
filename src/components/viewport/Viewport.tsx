import { useEffect, useRef, useCallback, useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { useToolStore } from '../../store/toolStore'
import { SceneManager } from '../../lib/scene/SceneManager'
import type { MousePosition3D, BoxDims } from '../../types'

interface CtxMenu { visible: boolean; x: number; y: number; targetId: string | null }
interface BoxSelect { start: { x: number; y: number }; end: { x: number; y: number } }

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<SceneManager | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>({ visible: false, x: 0, y: 0, targetId: null })
  const [boxSel, setBoxSel] = useState<BoxSelect | null>(null)
  const [dimInput, setDimInput] = useState('')
  const dimInputRef = useRef<HTMLInputElement>(null)

  const store = useSceneStore()
  const toolStore = useToolStore()
  const {
    objects, layers, selectedIds,
    viewMode, viewPreset, settings,
    selectObject, deselectAll, setMousePos3D,
    removeObjects, duplicateObjects, updateObject, selectAll,
  } = store
  const { activeTool, isPushPullDragging, setDimensionDisplay, setIsPushPullDragging } = toolStore

  // Current push/pull target
  const pushPullRef = useRef<{
    objectId: string
    originalDims: BoxDims
    originalPos: { x: number; y: number; z: number }
  } | null>(null)

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

  const onTransformChange = useCallback((change: {
    id: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    scale: { x: number; y: number; z: number }
  }) => {
    store.updateObject(change.id, {
      position: change.position,
      rotation: change.rotation,
      scale: change.scale,
    })
  }, [store])

  const onPushPullProgress = useCallback((p: { objectId: string; distance: number; snapped: boolean }) => {
    const mgr = managerRef.current
    if (!mgr) return
    const obj = store.objects.get(p.objectId)
    if (!obj || obj.type !== 'box') return

    // Begin push/pull tracking if not already
    if (!pushPullRef.current || pushPullRef.current.objectId !== p.objectId) {
      pushPullRef.current = {
        objectId: p.objectId,
        originalDims: { ...(obj.dimensions as BoxDims) },
        originalPos: { ...obj.position },
      }
      mgr.beginPushPull(obj)
      setIsPushPullDragging(true)
    }

    // Apply using original dims
    const baseObj = {
      ...obj,
      dimensions: pushPullRef.current.originalDims,
      position: pushPullRef.current.originalPos,
    }
    const result = mgr.applyPushPull(baseObj, p.distance)
    if (result) {
      store.updateObject(p.objectId, { dimensions: result.dims, position: result.pos })
    }
    setDimensionDisplay(`${p.distance >= 0 ? '+' : ''}${p.distance.toFixed(3)} m`)
  }, [store, setIsPushPullDragging, setDimensionDisplay])

  const onPushPullCommit = useCallback(() => {
    store.pushHistory()
    pushPullRef.current = null
    setIsPushPullDragging(false)
    setDimensionDisplay(null)
    setDimInput('')
  }, [store, setIsPushPullDragging, setDimensionDisplay])

  const onBoxSelect = useCallback((ids: string[]) => {
    ids.forEach((id, i) => selectObject(id, i > 0))
    if (ids.length === 0) deselectAll()
  }, [selectObject, deselectAll])

  // Init SceneManager
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const mgr = new SceneManager(canvas, {
      onSelect, onMouseMove3D, onContextMenu,
      onTransformChange, onPushPullProgress, onPushPullCommit, onBoxSelect,
    })
    managerRef.current = mgr

    // Box select overlay from custom events
    const onBoxSelectEvt = (e: Event) => {
      const { start, end } = (e as CustomEvent).detail
      setBoxSel({ start, end })
    }
    const onBoxSelectEnd = () => setBoxSel(null)
    canvas.addEventListener('boxselect', onBoxSelectEvt)
    canvas.addEventListener('boxselectend', onBoxSelectEnd)

    const ro = new ResizeObserver(() => mgr.resize())
    if (containerRef.current) ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      mgr.destroy()
      canvas.removeEventListener('boxselect', onBoxSelectEvt)
      canvas.removeEventListener('boxselectend', onBoxSelectEnd)
      managerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state changes
  useEffect(() => {
    managerRef.current?.syncObjects(objects, layers, selectedIds)
  }, [objects, layers, selectedIds])

  useEffect(() => {
    managerRef.current?.setTool(activeTool)
  }, [activeTool])

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

  useEffect(() => {
    managerRef.current?.setSnapSettings(settings.snapEnabled, settings.snapDistance / 100)
  }, [settings.snapEnabled, settings.snapDistance])

  useEffect(() => {
    managerRef.current?.setSunDirection(settings.sunAzimuth, settings.sunElevation, settings.sunIntensity)
  }, [settings.sunAzimuth, settings.sunElevation, settings.sunIntensity])

  useEffect(() => {
    managerRef.current?.setOutline(settings.outlineEnabled)
  }, [settings.outlineEnabled])

  useEffect(() => {
    managerRef.current?.setSobel(settings.sobelEnabled)
  }, [settings.sobelEnabled])

  // Handle exact dimension input during push/pull
  const applyExactDim = () => {
    const val = parseFloat(dimInput)
    if (isNaN(val) || !pushPullRef.current) return
    const mgr = managerRef.current
    if (!mgr) return
    const obj = store.objects.get(pushPullRef.current.objectId)
    if (!obj) return
    const baseObj = {
      ...obj,
      dimensions: pushPullRef.current.originalDims,
      position: pushPullRef.current.originalPos,
    }
    const result = mgr.applyPushPull(baseObj, val)
    if (result) {
      store.updateObject(pushPullRef.current.objectId, { dimensions: result.dims, position: result.pos })
      store.pushHistory()
    }
    pushPullRef.current = null
    setIsPushPullDragging(false)
    setDimensionDisplay(null)
    setDimInput('')
  }

  const closeCtxMenu = () => setCtxMenu(m => ({ ...m, visible: false }))

  const toolCursor = {
    select: 'crosshair',
    move: 'move',
    rotate: 'cell',
    scale: 'se-resize',
    pushpull: 'cell',
  }[activeTool]

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onClick={() => ctxMenu.visible && closeCtxMenu()}
    >
      <canvas
        ref={canvasRef}
        className="viewport-canvas"
        style={{ cursor: toolCursor }}
      />

      {/* View mode / preset badge */}
      <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
        <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-slate-300 backdrop-blur-sm">
          {viewMode === 'perspective' ? 'Persp' : 'Ortho'} · {viewPreset}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-slate-300 backdrop-blur-sm capitalize">
          {activeTool}
        </span>
      </div>

      {/* Push/pull hints */}
      {activeTool === 'pushpull' && !isPushPullDragging && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded bg-black/60 text-slate-300 pointer-events-none">
          Click a face and drag to push/pull. Only works on boxes.
        </div>
      )}

      {/* Dimension overlay during push/pull */}
      {isPushPullDragging && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="dimension-overlay">
            {toolStore.dimensionDisplay ?? '0.000 m'}
          </div>
          <input
            ref={dimInputRef}
            className="prop-input w-28 text-center text-sm"
            placeholder="Type exact…"
            value={dimInput}
            onChange={e => setDimInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applyExactDim()
              if (e.key === 'Escape') {
                setDimInput('')
                setIsPushPullDragging(false)
                setDimensionDisplay(null)
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Box selection overlay */}
      {boxSel && (
        <div
          className="absolute border border-blue-400/60 bg-blue-500/10 pointer-events-none"
          style={{
            left: Math.min(boxSel.start.x, boxSel.end.x),
            top: Math.min(boxSel.start.y, boxSel.end.y),
            width: Math.abs(boxSel.end.x - boxSel.start.x),
            height: Math.abs(boxSel.end.y - boxSel.start.y),
          }}
        />
      )}

      {/* Context menu */}
      {ctxMenu.visible && (
        <div className="context-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          {ctxMenu.targetId ? (
            <>
              <div className="context-menu-item" onClick={() => { duplicateObjects([ctxMenu.targetId!]); closeCtxMenu() }}>
                ⧉ Duplicate <span className="ml-auto text-slate-500">Ctrl+D</span>
              </div>
              <div className="context-menu-item" onClick={() => {
                const obj = objects.get(ctxMenu.targetId!)
                if (obj) updateObject(ctxMenu.targetId!, { visible: !obj.visible })
                closeCtxMenu()
              }}>
                👁 {objects.get(ctxMenu.targetId!)?.visible ? 'Hide' : 'Show'}
                <span className="ml-auto text-slate-500">H</span>
              </div>
              <div className="context-menu-item" onClick={() => {
                const obj = objects.get(ctxMenu.targetId!)
                if (obj) updateObject(ctxMenu.targetId!, { locked: !obj.locked })
                closeCtxMenu()
              }}>
                🔒 {objects.get(ctxMenu.targetId!)?.locked ? 'Unlock' : 'Lock'}
              </div>
              <div className="context-menu-sep" />
              <div className="context-menu-item" onClick={() => {
                // Frame on selected object
                managerRef.current?.frameAll()
                closeCtxMenu()
              }}>
                ⊙ Frame Object
              </div>
              <div className="context-menu-sep" />
              <div className="context-menu-item danger" onClick={() => {
                removeObjects([ctxMenu.targetId!])
                closeCtxMenu()
              }}>
                🗑 Delete <span className="ml-auto text-slate-500">Del</span>
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => { selectAll(); closeCtxMenu() }}>
                Select All <span className="ml-auto text-slate-500">Ctrl+A</span>
              </div>
              <div className="context-menu-item" onClick={() => { deselectAll(); closeCtxMenu() }}>
                Deselect All <span className="ml-auto text-slate-500">Esc</span>
              </div>
              <div className="context-menu-sep" />
              <div className="context-menu-item" onClick={() => { managerRef.current?.frameAll(); closeCtxMenu() }}>
                ⊙ Frame All
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
