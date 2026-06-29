import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import {
  serialize, deserialize, downloadJSON, downloadSTL, downloadCSV,
  loadFromFile, autosave,
} from '../../lib/io/sceneSerializer'
import { performBoolean } from '../../lib/csg/BooleanOps'
import { viewportBus } from '../../lib/viewportBus'
import { useUIStore } from '../../store/uiStore'
import type { BooleanOp } from '../../types'

type MenuItem =
  | { type: 'sep' }
  | { label: string; shortcut?: string; action?: () => void; disabled?: boolean; type?: undefined }

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const { setShortcutsOpen, setOnboardingOpen } = useUIStore()
  const barRef = useRef<HTMLDivElement>(null)
  const store = useSceneStore()

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
      store.layerOrder, store.settings, store.snapshots, store.annotations,
    )
    downloadJSON(data, store.sceneName)
    autosave(data)
    store.setDirty(false)
    close()
  }

  const handleOpen = async () => {
    const data = await loadFromFile()
    if (!data) return
    const { objects, layers, layerOrder, settings, annotations } = deserialize(data)
    store.loadScene(objects, layers, layerOrder, settings, annotations)
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
    </div>
  )
}
