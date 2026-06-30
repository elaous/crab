import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import { useCollabStore } from '../../store/collabStore'
import {
  serialize, deserialize, downloadSTL, downloadCSV, autosave,
} from '../../lib/io/sceneSerializer'
import { downloadBinary, loadBinaryFromFile } from '../../lib/io/capnpSerializer'
import { performBoolean } from '../../lib/csg/BooleanOps'
import { viewportBus } from '../../lib/viewportBus'
import { useUIStore } from '../../store/uiStore'
import type { BooleanOp } from '../../types'

function randomRoomId() {
  const words = ['atlas', 'birch', 'cedar', 'delta', 'ember', 'fjord', 'grove', 'haven', 'inlet', 'jetty']
  return words[Math.floor(Math.random() * words.length)] + '-' + Math.floor(Math.random() * 9000 + 1000)
}

type MenuItem =
  | { type: 'sep' }
  | { label: string; shortcut?: string; action?: () => void; disabled?: boolean; type?: undefined }

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [collabOpen, setCollabOpen] = useState(false)
  const [roomInput, setRoomInput] = useState(() => randomRoomId())
  const { setShortcutsOpen, setOnboardingOpen } = useUIStore()
  const barRef = useRef<HTMLDivElement>(null)
  const store = useSceneStore()
  const collab = useCollabStore()

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (menu: string) => setOpenMenu(open => open === menu ? null : menu)
  const close = () => setOpenMenu(null)

  const handleSave = () => {
    const data = serialize(
      store.sceneName, store.objects, store.layers,
      store.layerOrder, store.settings, store.snapshots, store.annotations, store.assemblies, store.componentDefs,
    )
    downloadBinary(data, store.sceneName)
    autosave(data)
    store.setDirty(false)
    close()
  }

  const handleOpen = async () => {
    const data = await loadBinaryFromFile()
    if (!data) return
    const { objects, layers, layerOrder, settings, annotations, assemblies, componentDefs } = deserialize(data)
    store.loadScene(objects, layers, layerOrder, settings, annotations, assemblies, componentDefs)
    store.setSceneName(data.name)
    close()
  }

  const handleExportSTL = () => {
    downloadSTL(store.objects, store.sceneName)
    close()
  }

  const handleExportGLTF = () => {
    viewportBus.emit({ type: 'exportGLTF', sceneName: store.sceneName })
    close()
  }

  const handleExportOBJ = () => {
    viewportBus.emit({ type: 'exportOBJ', sceneName: store.sceneName })
    close()
  }

  const handleExportCSV = () => {
    downloadCSV(store.objects, store.sceneName)
    close()
  }

  const handleNew = () => {
    if (store.isDirty && !confirm('Discard unsaved changes?')) return
    store.newScene()
    close()
  }

  const handleBoolean = (op: BooleanOp) => {
    const ids = Array.from(store.selectedIds)
    if (ids.length !== 2) return
    const objA = store.objects.get(ids[0])
    const objB = store.objects.get(ids[1])
    if (!objA || !objB) return
    const csgData = performBoolean(objA, objB, op)
    if (csgData) {
      store.booleanOp(ids[0], ids[1], op, csgData)
    }
    close()
  }

  const hasTwoSelected = store.selectedIds.size === 2

  const menus: { id: string; label: string; items: MenuItem[] }[] = [
    {
      id: 'file', label: 'File', items: [
        { label: 'New', shortcut: 'Ctrl+N', action: handleNew },
        { label: 'Open…', shortcut: 'Ctrl+O', action: handleOpen },
        { type: 'sep' as const },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
        { label: 'Export STL', action: handleExportSTL },
        { label: 'Export GLTF', action: handleExportGLTF },
        { label: 'Export OBJ', action: handleExportOBJ },
        { label: 'Export CSV (BOM)', action: handleExportCSV },
      ],
    },
    {
      id: 'edit', label: 'Edit', items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { store.undo(); close() } },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => { store.redo(); close() } },
        { type: 'sep' as const },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => { store.selectAll(); close() } },
        { label: 'Deselect All', shortcut: 'Esc', action: () => { store.deselectAll(); close() } },
        { type: 'sep' as const },
        {
          label: 'Delete Selected', shortcut: 'Del', action: () => {
            store.removeObjects(Array.from(store.selectedIds))
            close()
          }
        },
        {
          label: 'Duplicate Selected', shortcut: 'Ctrl+D', action: () => {
            store.duplicateObjects(Array.from(store.selectedIds))
            close()
          }
        },
        { type: 'sep' as const },
        {
          label: 'Group Selected',
          shortcut: 'Ctrl+G',
          disabled: store.selectedIds.size === 0,
          action: () => {
            if (store.selectedIds.size > 0) store.createAssembly(undefined, [...store.selectedIds])
            close()
          },
        },
        {
          label: 'Ungroup',
          disabled: store.selectedIds.size === 0,
          action: () => {
            const obj = store.objects.get([...store.selectedIds][0])
            if (obj?.assemblyId) store.dissolveAssembly(obj.assemblyId)
            close()
          },
        },
        { type: 'sep' as const },
        {
          label: `Boolean Union${!hasTwoSelected ? ' (select 2)' : ''}`,
          disabled: !hasTwoSelected,
          action: () => handleBoolean('union'),
        },
        {
          label: `Boolean Subtract${!hasTwoSelected ? ' (select 2)' : ''}`,
          disabled: !hasTwoSelected,
          action: () => handleBoolean('subtract'),
        },
        {
          label: `Boolean Intersect${!hasTwoSelected ? ' (select 2)' : ''}`,
          disabled: !hasTwoSelected,
          action: () => handleBoolean('intersect'),
        },
      ],
    },
    {
      id: 'view', label: 'View', items: [
        {
          label: 'Perspective',
          action: () => { store.setViewMode('perspective'); close() }
        },
        {
          label: 'Orthographic',
          action: () => { store.setViewMode('orthographic'); close() }
        },
        { type: 'sep' as const },
        { label: 'Front', action: () => { store.setViewPreset('front'); close() } },
        { label: 'Top', action: () => { store.setViewPreset('top'); close() } },
        { label: 'Right', action: () => { store.setViewPreset('right'); close() } },
        { label: 'Isometric', action: () => { store.setViewPreset('iso'); close() } },
        { type: 'sep' as const },
        {
          label: store.settings.gridVisible ? 'Hide Grid' : 'Show Grid',
          action: () => { store.updateSettings({ gridVisible: !store.settings.gridVisible }); close() }
        },
        {
          label: store.settings.axesVisible ? 'Hide Axes' : 'Show Axes',
          action: () => { store.updateSettings({ axesVisible: !store.settings.axesVisible }); close() }
        },
      ],
    },
    {
      id: 'display', label: 'Display', items: [
        { label: 'Shaded', action: () => { store.updateSettings({ displayMode: 'shaded' }); close() } },
        { label: 'Wireframe', action: () => { store.updateSettings({ displayMode: 'wireframe' }); close() } },
        { label: 'Rendered', action: () => { store.updateSettings({ displayMode: 'rendered' }); close() } },
        { type: 'sep' as const },
        {
          label: store.settings.shadowsEnabled ? 'Disable Shadows' : 'Enable Shadows',
          action: () => { store.updateSettings({ shadowsEnabled: !store.settings.shadowsEnabled }); close() }
        },
      ],
    },
    {
      id: 'help', label: 'Help', items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', action: () => { setShortcutsOpen(true); close() } },
        { label: 'Getting Started', action: () => { setOnboardingOpen(true); close() } },
        { type: 'sep' as const },
        { label: 'About CrabCAD', action: () => { alert('CrabCAD — Open-source 3D modeling suite\nBuilt with Three.js, React, TypeScript'); close() } },
      ],
    },
  ]

  return (
    <div
      ref={barRef}
      className="menu-bar flex items-center h-8 bg-slate-900 border-b border-slate-800 px-2 gap-1 flex-shrink-0"
    >
      {/* Logo */}
      <span className="text-blue-400 font-bold text-sm mr-2 select-none">🦀 CrabCAD</span>

      {menus.map(menu => (
        <div key={menu.id} className="menu-item">
          <button
            className={`px-3 py-1 text-xs rounded cursor-pointer transition-colors
              ${openMenu === menu.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
            onMouseDown={() => toggle(menu.id)}
          >
            {menu.label}
          </button>
          {openMenu === menu.id && (
            <div className="menu-dropdown">
              {menu.items.map((item, i) =>
                item.type === 'sep' ? (
                  <div key={i} className="menu-dropdown-sep" />
                ) : (
                  <div
                    key={i}
                    className={`menu-dropdown-item ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onMouseDown={(!item.disabled && item.action) ? item.action : undefined}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-slate-500 text-xs ml-4">{item.shortcut}</span>}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}

      <div className="flex-1" />

      {/* Scene name */}
      <span className="text-slate-400 text-xs">
        {store.sceneName}{store.isDirty ? ' *' : ''}
      </span>

      {/* Live collaboration button */}
      <button
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium transition-colors
          ${collab.isConnected
            ? 'bg-green-700 text-green-100 hover:bg-green-600'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        onClick={() => setCollabOpen(true)}
        title={collab.isConnected ? `Room: ${collab.roomId}` : 'Start live collaboration'}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${collab.isConnected ? 'bg-green-300 animate-pulse' : 'bg-slate-500'}`} />
        {collab.isConnected ? `Live · ${1 + collab.peers.size}` : 'Live'}
      </button>

      {/* Collab modal */}
      {collabOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setCollabOpen(false) }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-80 shadow-2xl">
            <div className="text-sm font-semibold text-white mb-4">
              {collab.isConnected ? 'Live Session' : 'Start Live Collaboration'}
            </div>

            {collab.isConnected ? (
              <>
                <div className="text-xs text-slate-400 mb-1">Room code</div>
                <div className="font-mono text-sm text-green-400 bg-slate-800 rounded px-3 py-2 mb-3 select-all">
                  {collab.roomId}
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  Share this code with collaborators. Anyone who enters it joins your session.
                </div>
                <div className="text-xs text-slate-400 mb-2">Online ({1 + collab.peers.size})</div>
                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: collab.localColor }} />
                    <span className="text-xs text-white">{collab.localName} (you)</span>
                  </div>
                  {Array.from(collab.peers.values()).map(p => (
                    <div key={p.clientId} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs text-slate-300">{p.name}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full text-xs py-1.5 rounded bg-red-800 text-red-200 hover:bg-red-700 transition-colors"
                  onClick={() => { collab.leave(); setCollabOpen(false) }}
                >
                  Leave Session
                </button>
              </>
            ) : (
              <>
                <div className="text-xs text-slate-400 mb-1">Your name</div>
                <input
                  className="prop-input w-full mb-3 text-sm"
                  value={collab.localName}
                  onChange={e => collab.setLocalName(e.target.value)}
                  placeholder="Display name"
                />
                <div className="text-xs text-slate-400 mb-1">Room code</div>
                <input
                  className="prop-input w-full mb-1 text-sm font-mono"
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="room-code"
                />
                <div className="text-xs text-slate-500 mb-4">
                  Create a new room or enter an existing code to join.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 text-xs py-1.5 rounded bg-blue-700 text-white hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      if (roomInput.trim()) {
                        collab.join(roomInput.trim())
                        setCollabOpen(false)
                      }
                    }}
                  >
                    Join / Create
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    onClick={() => setCollabOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
