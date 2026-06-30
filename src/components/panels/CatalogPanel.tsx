import { useState } from 'react'
import { useSceneStore } from '../../store/sceneStore'
import type { SceneObject, PrimitiveType, Vec3 } from '../../types'

interface CatalogActions {
  addObject: (type: PrimitiveType, position?: Partial<Vec3>) => string
  updateObject: (id: string, patch: Partial<SceneObject>) => void
  createAssembly: (name?: string, objectIds?: string[]) => string
}

interface CatalogItem {
  id: string
  name: string
  category: string
  icon: string
  addFn: (actions: CatalogActions) => void
}

function addBox(
  actions: CatalogActions,
  w: number,
  h: number,
  d: number,
  name: string,
  pos?: { x?: number; y?: number; z?: number },
): string {
  const id = actions.addObject('box', pos)
  actions.updateObject(id, {
    name,
    dimensions: { width: w, height: h, depth: d },
    position: { x: pos?.x ?? 0, y: pos?.y ?? (h / 2), z: pos?.z ?? 0 },
  })
  return id
}

function addCylinder(
  actions: CatalogActions,
  r: number,
  h: number,
  name: string,
  pos?: { x?: number; y?: number; z?: number },
): string {
  const id = actions.addObject('cylinder', pos)
  actions.updateObject(id, {
    name,
    dimensions: { radius: r, height: h },
    position: { x: pos?.x ?? 0, y: pos?.y ?? (h / 2), z: pos?.z ?? 0 },
  })
  return id
}

function addCone(
  actions: CatalogActions,
  r: number,
  h: number,
  name: string,
  pos?: { x?: number; y?: number; z?: number },
): string {
  const id = actions.addObject('cone', pos)
  actions.updateObject(id, {
    name,
    dimensions: { radius: r, height: h },
    position: { x: pos?.x ?? 0, y: pos?.y ?? (h / 2), z: pos?.z ?? 0 },
  })
  return id
}

const CATALOG: CatalogItem[] = [
  // ─── Architectural ───────────────────────────────────────────────
  {
    id: 'arch-wall',
    name: 'Wall',
    category: 'Architectural',
    icon: '🧱',
    addFn: (s) => addBox(s, 4, 3, 0.2, 'Wall'),
  },
  {
    id: 'arch-floor',
    name: 'Floor',
    category: 'Architectural',
    icon: '▬',
    addFn: (s) => addBox(s, 4, 0.1, 4, 'Floor'),
  },
  {
    id: 'arch-door',
    name: 'Door',
    category: 'Architectural',
    icon: '🚪',
    addFn: (s) => addBox(s, 0.9, 2.1, 0.1, 'Door'),
  },
  {
    id: 'arch-window',
    name: 'Window',
    category: 'Architectural',
    icon: '🪟',
    addFn: (s) => addBox(s, 1, 1.2, 0.1, 'Window'),
  },
  {
    id: 'arch-column',
    name: 'Column',
    category: 'Architectural',
    icon: '🏛',
    addFn: (s) => addCylinder(s, 0.2, 3, 'Column'),
  },
  {
    id: 'arch-stairs',
    name: 'Stairs',
    category: 'Architectural',
    icon: '🪜',
    addFn: (s) => {
      const ids = [
        addBox(s, 1, 0.2, 0.3, 'Stair Step 1', { y: 0.1, z: 0 }),
        addBox(s, 1, 0.2, 0.3, 'Stair Step 2', { y: 0.3, z: -0.3 }),
        addBox(s, 1, 0.2, 0.3, 'Stair Step 3', { y: 0.5, z: -0.6 }),
      ]
      s.createAssembly('Stairs', ids)
    },
  },
  {
    id: 'arch-roof',
    name: 'Roof',
    category: 'Architectural',
    icon: '🏠',
    addFn: (s) => addCone(s, 2, 1, 'Roof', { y: 0.5 }),
  },

  // ─── Furniture ────────────────────────────────────────────────────
  {
    id: 'furn-table',
    name: 'Table',
    category: 'Furniture',
    icon: '🪑',
    addFn: (s) => {
      const topId = addBox(s, 1.4, 0.05, 0.8, 'Table Top', { y: 0.775 })
      const legH = 0.75
      const legR = 0.04
      const legIds = [
        addCylinder(s, legR, legH, 'Table Leg', { x: 0.6, y: legH / 2, z: 0.3 }),
        addCylinder(s, legR, legH, 'Table Leg', { x: -0.6, y: legH / 2, z: 0.3 }),
        addCylinder(s, legR, legH, 'Table Leg', { x: 0.6, y: legH / 2, z: -0.3 }),
        addCylinder(s, legR, legH, 'Table Leg', { x: -0.6, y: legH / 2, z: -0.3 }),
      ]
      s.createAssembly('Table', [topId, ...legIds])
    },
  },
  {
    id: 'furn-shelf',
    name: 'Shelf',
    category: 'Furniture',
    icon: '🗄',
    addFn: (s) => {
      const ids = [
        addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 0.01 }),
        addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 0.5 }),
        addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 1.0 }),
      ]
      s.createAssembly('Shelf Unit', ids)
    },
  },
  {
    id: 'furn-chair',
    name: 'Chair',
    category: 'Furniture',
    icon: '🪑',
    addFn: (s) => {
      const seat = addBox(s, 0.5, 0.05, 0.5, 'Chair Seat', { y: 0.45 })
      const back = addBox(s, 0.5, 0.5, 0.05, 'Chair Back', { y: 0.75, z: -0.225 })
      s.createAssembly('Chair', [seat, back])
    },
  },

  // ─── Mechanical ───────────────────────────────────────────────────
  {
    id: 'mech-bolt',
    name: 'Bolt',
    category: 'Mechanical',
    icon: '🔩',
    addFn: (s) => addCylinder(s, 0.05, 0.3, 'Bolt'),
  },
  {
    id: 'mech-screw',
    name: 'Screw',
    category: 'Mechanical',
    icon: '🔧',
    addFn: (s) => {
      const shaft = addCylinder(s, 0.04, 0.25, 'Screw Shaft', { y: 0.125 })
      const head = addCone(s, 0.08, 0.06, 'Screw Head', { y: 0.28 })
      s.createAssembly('Screw', [shaft, head])
    },
  },
  {
    id: 'mech-gear',
    name: 'Gear',
    category: 'Mechanical',
    icon: '⚙️',
    addFn: (s) => {
      const id = addCylinder(s, 0.3, 0.08, 'Gear (placeholder)')
      s.updateObject(id, { color: '#94a3b8' })
    },
  },
]

const CATEGORIES = ['Architectural', 'Furniture', 'Mechanical']

export function CatalogPanel() {
  const addObject = useSceneStore(s => s.addObject)
  const updateObject = useSceneStore(s => s.updateObject)
  const createAssembly = useSceneStore(s => s.createAssembly)
  const [activeCategory, setActiveCategory] = useState('Architectural')
  const [search, setSearch] = useState('')

  const actions: CatalogActions = { addObject, updateObject, createAssembly }

  const filtered = CATALOG.filter(item => {
    const matchCat = item.category === activeCategory
    const matchSearch = search === '' || item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">Catalog</div>
      <div className="p-2 space-y-2">
        {/* Search */}
        <input
          className="prop-input w-full text-xs"
          placeholder="Search catalog…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Category tabs */}
        <div className="flex gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`flex-1 text-xs py-1 rounded transition-colors
                ${activeCategory === cat
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-1">
          {filtered.map(item => (
            <button
              key={item.id}
              className="flex flex-col items-center gap-1 p-2 rounded bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
              onClick={() => item.addFn(actions)}
              title={`Add ${item.name}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs text-center leading-tight">{item.name}</span>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-xs text-slate-600 text-center mt-4">No items found</div>
        )}
      </div>
    </div>
  )
}
