import { useEffect, useRef, useCallback, useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { useToolStore } from '../../store/toolStore'
import { useCollabStore } from '../../store/collabStore'
import { SceneManager } from '../../lib/scene/SceneManager'
import { viewportBus } from '../../lib/viewportBus'
import { exportSVG2D, downloadSVG } from '../../lib/io/svgExporter'
import { CollabCursors, CollabPresence } from '../overlay/CollabOverlay'
import type { MousePosition3D, BoxDims, Vec3 } from '../../types'

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

  // New overlay states
  const [drawHint, setDrawHint] = useState<number>(0) // count of placed draw points
  const [measureInfo, setMeasureInfo] = useState<{ distance: number } | null>(null)
  const [protractorInfo, setProtractorInfo] = useState<{ angle: number } | null>(null)

  const [followMeState, setFollowMeState] = useState<{ profileId: string | null; pts: number }>({ profileId: null, pts: 0 })
  const store = useSceneStore()
  const toolStore = useToolStore()
  const publishCursor = useCollabStore(s => s.publishCursor)
  const collabConnected = useCollabStore(s => s.isConnected)
  const {
    objects, layers, selectedIds, annotations, componentDefs,
    viewMode, viewPreset, settings,
    selectObject, deselectAll, setMousePos3D,
    removeObjects, duplicateObjects, updateObject, selectAll,
    addSnapshot,
  } = store
  const { activeTool, isPushPullDragging, setDimensionDisplay, setIsPushPullDragging, setMeasureDistance, setMeasureAngle, setDrawPoints } = toolStore

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

  const onMeasureComplete = useCallback((distance: number, _points: [Vec3, Vec3]) => {
    setMeasureDistance(distance)
    setMeasureInfo({ distance })
  }, [setMeasureDistance])

  const onProtractorComplete = useCallback((angle: number, _points: [Vec3, Vec3, Vec3]) => {
    setMeasureAngle(angle)
    setProtractorInfo({ angle })
  }, [setMeasureAngle])

  const onErase = useCallback((id: string) => {
    removeObjects([id])
  }, [removeObjects])

  const onDrawPoint = useCallback((pts: Vec3[]) => {
    setDrawPoints(pts)
    setDrawHint(pts.length)
  }, [setDrawPoints])

  const onFollowMeCommit = useCallback((profileId: string, pathPoints: Vec3[]) => {
    store.sweepFollowMe(profileId, pathPoints)
    toolStore.setActiveTool('select')
  }, [store, toolStore])

  const onFollowMePoint = useCallback((profileId: string | null, pts: Vec3[]) => {
    setFollowMeState({ profileId, pts: pts.length })
  }, [])

  // Init SceneManager
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const mgr = new SceneManager(canvas, {
      onSelect, onMouseMove3D, onContextMenu,
      onTransformChange, onPushPullProgress, onPushPullCommit, onBoxSelect,
      onMeasureComplete, onProtractorComplete, onErase, onDrawPoint,
      onFollowMeCommit, onFollowMePoint,
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
    managerRef.current?.syncObjects(objects, layers, selectedIds, componentDefs)
  }, [objects, layers, selectedIds, componentDefs])

  useEffect(() => {
    managerRef.current?.setTool(activeTool)
    // Clear overlays on tool change
    if (activeTool !== 'measure') setMeasureInfo(null)
    if (activeTool !== 'protractor') setProtractorInfo(null)
    if (activeTool !== 'draw') setDrawHint(0)
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

  useEffect(() => {
    managerRef.current?.setSectionCut(settings.sectionEnabled, settings.sectionAxis, settings.sectionOffset, settings.sectionAngle)
  }, [settings.sectionEnabled, settings.sectionAxis, settings.sectionOffset, settings.sectionAngle])

  useEffect(() => {
    managerRef.current?.setToneMapping(settings.toneMapping, settings.exposure)
  }, [settings.toneMapping, settings.exposure])

  useEffect(() => {
    managerRef.current?.setBloom(settings.bloomEnabled, settings.bloomStrength, settings.bloomRadius, settings.bloomThreshold)
  }, [settings.bloomEnabled, settings.bloomStrength, settings.bloomRadius, settings.bloomThreshold])

  useEffect(() => {
    managerRef.current?.setEnvironment(settings.envPreset, settings.envIntensity)
  }, [settings.envPreset, settings.envIntensity])

  useEffect(() => {
    managerRef.current?.setBackgroundGradient(settings.bgGradient, settings.bgColor, settings.bgColorTop)
  }, [settings.bgGradient, settings.bgColor, settings.bgColorTop])

  useEffect(() => {
    managerRef.current?.setEdgeStyle(settings.edgesVisible, settings.edgeColor)
  }, [settings.edgesVisible, settings.edgeColor])

  useEffect(() => {
    managerRef.current?.setFlatShading(settings.flatShading)
  }, [settings.flatShading])

  useEffect(() => {
    managerRef.current?.setXrayMode(settings.xrayMode)
  }, [settings.xrayMode])

  useEffect(() => {
    managerRef.current?.syncAnnotations(annotations)
  }, [annotations])

  // Viewport bus — handle actions from panels & menu
  useEffect(() => {
    const off = viewportBus.on((action) => {
      const mgr = managerRef.current
      if (!mgr) return
      switch (action.type) {
        case 'exportGLTF':
          mgr.exportGLTF(action.sceneName)
          break
        case 'exportOBJ':
          mgr.exportOBJ(action.sceneName)
          break
        case 'captureImage':
          action.callback(mgr.captureImage())
          break
        case 'captureHighRes':
          action.callback(mgr.captureHighRes(action.scale))
          break
        case 'saveSnapshot': {
          const state = mgr.getCameraState()
          addSnapshot({ ...state, name: action.name })
          break
        }
        case 'restoreSnapshot': {
          const snap = store.snapshots.find(s => s.id === action.snapshotId)
          if (snap) mgr.restoreSnapshot(snap)
          break
        }
        case 'setHDRI':
          mgr.setHDRI(action.url)
          break
        case 'exportSVG': {
          const svgStr = exportSVG2D(store.objects, action.view)
          downloadSVG(store.objects, action.view, action.sceneName + '_' + action.view)
          void svgStr
          break
        }
        case 'enterXR':
          mgr.enterXR(action.mode)
          break
        case 'alignToFace': {
          const face = mgr.getLastHoveredFace()
          if (!face) break
          const ids = Array.from(store.selectedIds)
          if (ids.length === 0) break
          ids.forEach(id => {
            const obj = store.objects.get(id)
            if (!obj) return
            // Move object so its bottom sits on the hovered face plane
            const newPos = {
              x: face.point.x,
              y: face.point.y,
              z: face.point.z,
            }
            store.updateObject(id, { position: newPos })
          })
          break
        }
      }
    })
    return off
  }, [addSnapshot, store.snapshots, store.objects, store.selectedIds, store.updateObject])

  // Esc key handler to cancel draw/clear measure
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const mgr = managerRef.current
        if (!mgr) return
        mgr.commitDraw() // cancel (returns empty if needed)
        setDrawHint(0)
        setMeasureInfo(null)
        setProtractorInfo(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

  const toolCursorMap: Record<string, string> = {
    select: 'crosshair',
    move: 'move',
    rotate: 'cell',
    scale: 'se-resize',
    pushpull: 'cell',
    draw: 'crosshair',
    arc: 'crosshair',
    polygon: 'crosshair',
    eraser: 'cell',
    measure: 'crosshair',
    protractor: 'crosshair',
  }
  const toolCursor = toolCursorMap[activeTool] ?? 'default'

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!collabConnected) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    publishCursor({ xPct: (e.clientX - rect.left) / rect.width, yPct: (e.clientY - rect.top) / rect.height })
  }, [collabConnected, publishCursor])

  const handlePointerLeave = useCallback(() => {
    if (collabConnected) publishCursor(null)
  }, [collabConnected, publishCursor])

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
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
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

      {/* Draw hint overlay */}
      {activeTool === 'draw' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded bg-black/60 text-slate-300 pointer-events-none">
          {drawHint === 0
            ? 'Click to start drawing a line'
            : `${drawHint} point${drawHint !== 1 ? 's' : ''} placed — Double-click to finish · Esc to cancel`
          }
        </div>
      )}

      {/* Measure overlay */}
      {activeTool === 'measure' && measureInfo && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded bg-black/70 text-yellow-300 pointer-events-none font-mono">
          Distance: {measureInfo.distance.toFixed(3)} m
        </div>
      )}
      {activeTool === 'measure' && !measureInfo && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded bg-black/60 text-slate-300 pointer-events-none">
          Click two points to measure distance
        </div>
      )}

      {/* Protractor overlay */}
      {activeTool === 'protractor' && protractorInfo && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded bg-black/70 text-yellow-300 pointer-events-none font-mono">
          Angle: {protractorInfo.angle.toFixed(1)}°
        </div>
      )}
      {activeTool === 'protractor' && !protractorInfo && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded bg-black/60 text-slate-300 pointer-events-none">
          Click 3 points: center, then two arms
        </div>
      )}

      {/* Eraser hint */}
      {activeTool === 'eraser' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded bg-black/60 text-slate-300 pointer-events-none">
          Click an object to erase it
        </div>
      )}

      {/* Walk mode hint */}
      {activeTool === 'walk' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded bg-black/70 text-slate-200 pointer-events-none">
          Click viewport to lock cursor · WASD to walk · Q/E up/down · Esc to exit
        </div>
      )}

      {/* Follow Me hint */}
      {activeTool === 'followme' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded bg-black/70 text-slate-200 pointer-events-none">
          {!followMeState.profileId
            ? 'Click a box to use as sweep profile'
            : followMeState.pts === 0
              ? 'Profile selected — click to place path points · Double-click to sweep'
              : `${followMeState.pts} path point${followMeState.pts !== 1 ? 's' : ''} — Double-click to commit sweep`
          }
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

      {/* Collab cursors + presence */}
      <CollabCursors />
      <CollabPresence />

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
