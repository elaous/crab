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
  w: number, h: number, d: number,
  name: string,
  opts?: { x?: number; y?: number; z?: number; color?: string },
): string {
  const id = actions.addObject('box', opts)
  actions.updateObject(id, {
    name,
    dimensions: { width: w, height: h, depth: d },
    position: { x: opts?.x ?? 0, y: opts?.y ?? (h / 2), z: opts?.z ?? 0 },
    ...(opts?.color ? { color: opts.color } : {}),
  })
  return id
}

function addFlat(
  actions: CatalogActions,
  w: number, d: number,
  name: string,
  color: string,
  opts?: { x?: number; z?: number },
): string {
  return addBox(actions, w, 0.01, d, name, { y: 0.005, color, ...opts })
}

function addCylinder(
  actions: CatalogActions,
  r: number, h: number,
  name: string,
  opts?: { x?: number; y?: number; z?: number; color?: string },
): string {
  const id = actions.addObject('cylinder', opts)
  actions.updateObject(id, {
    name,
    dimensions: { radius: r, height: h },
    position: { x: opts?.x ?? 0, y: opts?.y ?? (h / 2), z: opts?.z ?? 0 },
    ...(opts?.color ? { color: opts.color } : {}),
  })
  return id
}

function addCone(
  actions: CatalogActions,
  r: number, h: number,
  name: string,
  opts?: { x?: number; y?: number; z?: number },
): string {
  const id = actions.addObject('cone', opts)
  actions.updateObject(id, {
    name,
    dimensions: { radius: r, height: h },
    position: { x: opts?.x ?? 0, y: opts?.y ?? (h / 2), z: opts?.z ?? 0 },
  })
  return id
}

const CATALOG: CatalogItem[] = [
  // ─── Architectural ────────────────────────────────────────────────
  { id: 'arch-wall',    name: 'Wall',    category: 'Architectural', icon: '🧱', addFn: s => addBox(s, 4, 3, 0.2, 'Wall') },
  { id: 'arch-floor',   name: 'Floor',   category: 'Architectural', icon: '▬',  addFn: s => addBox(s, 4, 0.1, 4, 'Floor') },
  { id: 'arch-door',    name: 'Door',    category: 'Architectural', icon: '🚪', addFn: s => addBox(s, 0.9, 2.1, 0.1, 'Door') },
  { id: 'arch-window',  name: 'Window',  category: 'Architectural', icon: '🪟', addFn: s => addBox(s, 1, 1.2, 0.1, 'Window') },
  { id: 'arch-column',  name: 'Column',  category: 'Architectural', icon: '🏛', addFn: s => addCylinder(s, 0.2, 3, 'Column') },
  { id: 'arch-stairs',  name: 'Stairs',  category: 'Architectural', icon: '🪜', addFn: s => {
    const ids = [
      addBox(s, 1, 0.2, 0.3, 'Stair Step 1', { y: 0.1, z: 0 }),
      addBox(s, 1, 0.2, 0.3, 'Stair Step 2', { y: 0.3, z: -0.3 }),
      addBox(s, 1, 0.2, 0.3, 'Stair Step 3', { y: 0.5, z: -0.6 }),
    ]
    s.createAssembly('Stairs', ids)
  }},
  { id: 'arch-roof',    name: 'Roof',    category: 'Architectural', icon: '🏠', addFn: s => addCone(s, 2, 1, 'Roof', { y: 0.5 }) },

  // ─── Furniture ────────────────────────────────────────────────────
  { id: 'furn-table',   name: 'Table',   category: 'Furniture', icon: '🪑', addFn: s => {
    const topId = addBox(s, 1.4, 0.05, 0.8, 'Table Top', { y: 0.775 })
    const legR = 0.04; const legH = 0.75
    const legIds = [
      addCylinder(s, legR, legH, 'Table Leg', { x:  0.6, y: legH/2, z:  0.3 }),
      addCylinder(s, legR, legH, 'Table Leg', { x: -0.6, y: legH/2, z:  0.3 }),
      addCylinder(s, legR, legH, 'Table Leg', { x:  0.6, y: legH/2, z: -0.3 }),
      addCylinder(s, legR, legH, 'Table Leg', { x: -0.6, y: legH/2, z: -0.3 }),
    ]
    s.createAssembly('Table', [topId, ...legIds])
  }},
  { id: 'furn-shelf',   name: 'Shelf',   category: 'Furniture', icon: '🗄', addFn: s => {
    const ids = [
      addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 0.01 }),
      addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 0.5 }),
      addBox(s, 1, 0.02, 0.3, 'Shelf Board', { y: 1.0 }),
    ]
    s.createAssembly('Shelf Unit', ids)
  }},
  { id: 'furn-chair',   name: 'Chair',   category: 'Furniture', icon: '🪑', addFn: s => {
    const seat = addBox(s, 0.5, 0.05, 0.5, 'Chair Seat', { y: 0.45 })
    const back = addBox(s, 0.5, 0.5, 0.05, 'Chair Back', { y: 0.75, z: -0.225 })
    s.createAssembly('Chair', [seat, back])
  }},

  // ─── Mechanical ───────────────────────────────────────────────────
  { id: 'mech-bolt',    name: 'Bolt',    category: 'Mechanical', icon: '🔩', addFn: s => addCylinder(s, 0.05, 0.3, 'Bolt') },
  { id: 'mech-screw',   name: 'Screw',   category: 'Mechanical', icon: '🔧', addFn: s => {
    const shaft = addCylinder(s, 0.04, 0.25, 'Screw Shaft', { y: 0.125 })
    const head  = addCone(s, 0.08, 0.06, 'Screw Head', { y: 0.28 })
    s.createAssembly('Screw', [shaft, head])
  }},
  { id: 'mech-gear',    name: 'Gear',    category: 'Mechanical', icon: '⚙️', addFn: s => {
    const id = addCylinder(s, 0.3, 0.08, 'Gear (placeholder)')
    s.updateObject(id, { color: '#94a3b8' })
  }},

  // ─── 2D Materials ─────────────────────────────────────────────────
  { id: '2dm-woodfloor', name: 'Wood Floor',    category: '2D Materials', icon: '🪵', addFn: s => addFlat(s, 2, 2, 'Wood Floor',    '#8B6914') },
  { id: '2dm-tile',      name: 'Ceramic Tile',  category: '2D Materials', icon: '⬜', addFn: s => addFlat(s, 0.6, 0.6, 'Ceramic Tile', '#E8E4D8') },
  { id: '2dm-carpet',    name: 'Carpet',        category: '2D Materials', icon: '🟫', addFn: s => addFlat(s, 3, 4, 'Carpet',        '#6B7280') },
  { id: '2dm-concrete',  name: 'Concrete',      category: '2D Materials', icon: '⬛', addFn: s => addFlat(s, 1, 1, 'Concrete',      '#9B9B8A') },
  { id: '2dm-brick',     name: 'Brick Paver',   category: '2D Materials', icon: '🧱', addFn: s => addFlat(s, 1, 1, 'Brick Paver',   '#A0522D') },
  { id: '2dm-grass',     name: 'Grass / Turf',  category: '2D Materials', icon: '🌿', addFn: s => addFlat(s, 3, 3, 'Grass / Turf',  '#4A7C3F') },
  { id: '2dm-marble',    name: 'Marble Floor',  category: '2D Materials', icon: '🔲', addFn: s => addFlat(s, 1, 1, 'Marble Floor',  '#E8E4D8') },
  { id: '2dm-gravel',    name: 'Gravel',        category: '2D Materials', icon: '⬜', addFn: s => addFlat(s, 1, 1, 'Gravel',        '#9E9E94') },
  { id: '2dm-decking',   name: 'Decking',       category: '2D Materials', icon: '🪵', addFn: s => addFlat(s, 2, 4, 'Decking',       '#C8A86B') },
  { id: '2dm-parquet',   name: 'Parquet',       category: '2D Materials', icon: '🟨', addFn: s => addFlat(s, 2, 2, 'Parquet',       '#B8860B') },

  // ─── 2D Furniture ─────────────────────────────────────────────────
  { id: '2df-sofa',      name: 'Sofa (3-seat)', category: '2D Furniture', icon: '🛋',  addFn: s => addFlat(s, 2.2, 0.9, 'Sofa',       '#6B7280') },
  { id: '2df-bed-d',     name: 'Double Bed',    category: '2D Furniture', icon: '🛏',  addFn: s => addFlat(s, 1.6, 2.0, 'Double Bed', '#94a3b8') },
  { id: '2df-bed-s',     name: 'Single Bed',    category: '2D Furniture', icon: '🛏',  addFn: s => addFlat(s, 0.9, 2.0, 'Single Bed', '#94a3b8') },
  { id: '2df-desk',      name: 'Desk',          category: '2D Furniture', icon: '🗃',  addFn: s => addFlat(s, 1.2, 0.6, 'Desk',       '#8B6914') },
  { id: '2df-wardrobe',  name: 'Wardrobe',      category: '2D Furniture', icon: '🚪', addFn: s => addFlat(s, 1.8, 0.6, 'Wardrobe',   '#4A4A4A') },
  { id: '2df-dining',    name: 'Dining Table',  category: '2D Furniture', icon: '🪑',  addFn: s => addFlat(s, 1.2, 0.8, 'Dining Table','#8B6914') },
  { id: '2df-coffee',    name: 'Coffee Table',  category: '2D Furniture', icon: '☕',  addFn: s => addFlat(s, 1.1, 0.55,'Coffee Table','#6B5344') },
  { id: '2df-bookcase',  name: 'Bookcase',      category: '2D Furniture', icon: '📚',  addFn: s => addFlat(s, 0.8, 0.3, 'Bookcase',   '#4A2C0A') },
  { id: '2df-toilet',    name: 'Toilet',        category: '2D Furniture', icon: '🚽',  addFn: s => addFlat(s, 0.38, 0.68,'Toilet',    '#E8E4D8') },
  { id: '2df-bathtub',   name: 'Bathtub',       category: '2D Furniture', icon: '🛁',  addFn: s => addFlat(s, 1.7, 0.75,'Bathtub',    '#D8E8F0') },
  { id: '2df-basin',     name: 'Sink / Basin',  category: '2D Furniture', icon: '🚿',  addFn: s => addFlat(s, 0.6, 0.5, 'Sink / Basin','#D8E8F0') },

  // ─── Hardware ─────────────────────────────────────────────────────
  { id: 'hw-hinge',      name: 'Hinge',         category: 'Hardware', icon: '🔩', addFn: s => {
    const id = addBox(s, 0.08, 0.004, 0.03, 'Door Hinge', { color: '#8C9099' })
    s.updateObject(id, { roughness: 0.3, metalness: 0.9 })
  }},
  { id: 'hw-handle',     name: 'Handle',        category: 'Hardware', icon: '🖐', addFn: s => {
    const id = addBox(s, 0.12, 0.004, 0.02, 'Cabinet Handle', { color: '#B8C0CC' })
    s.updateObject(id, { roughness: 0.2, metalness: 0.95 })
  }},
  { id: 'hw-lock',       name: 'Lock',          category: 'Hardware', icon: '🔒', addFn: s => {
    const id = addBox(s, 0.06, 0.004, 0.06, 'Door Lock', { color: '#8C9099' })
    s.updateObject(id, { roughness: 0.3, metalness: 0.9 })
  }},
  { id: 'hw-outlet',     name: 'Outlet',        category: 'Hardware', icon: '🔌', addFn: s => addBox(s, 0.08, 0.004, 0.08, 'Outlet', { color: '#F0F0F0' }) },
  { id: 'hw-switch',     name: 'Light Switch',  category: 'Hardware', icon: '💡', addFn: s => addBox(s, 0.08, 0.004, 0.08, 'Light Switch', { color: '#F0F0F0' }) },
  { id: 'hw-bracket',    name: 'Bracket',       category: 'Hardware', icon: '📐', addFn: s => {
    const a = addBox(s, 0.05, 0.004, 0.005, 'Bracket H', { y: 0.005, z:  0.025, color: '#8C9099' })
    const b = addBox(s, 0.005, 0.05, 0.005, 'Bracket V', { y: 0.025, z: -0.02, color: '#8C9099' })
    s.createAssembly('Corner Bracket', [a, b])
  }},
  { id: 'hw-nail',       name: 'Nail',          category: 'Hardware', icon: '📌', addFn: s => {
    const id = addCylinder(s, 0.002, 0.05, 'Nail', { color: '#B8C0CC' })
    s.updateObject(id, { roughness: 0.25, metalness: 0.95 })
  }},
  { id: 'hw-pipe',       name: 'Pipe',          category: 'Hardware', icon: '🪛', addFn: s => {
    const id = addCylinder(s, 0.025, 1, 'Pipe', { color: '#8C9099' })
    s.updateObject(id, { roughness: 0.3, metalness: 0.9 })
  }},

  // ─── Appliances ───────────────────────────────────────────────────
  { id: 'app-fridge',    name: 'Refrigerator',  category: 'Appliances', icon: '🧊', addFn: s => addFlat(s, 0.7, 0.8,  'Refrigerator', '#E8E8E8') },
  { id: 'app-stove',     name: 'Stove / Oven',  category: 'Appliances', icon: '🍳', addFn: s => addFlat(s, 0.6, 0.6,  'Stove / Oven', '#2A2A2A') },
  { id: 'app-dishwash',  name: 'Dishwasher',    category: 'Appliances', icon: '🫧', addFn: s => addFlat(s, 0.6, 0.6,  'Dishwasher',   '#D8D8D8') },
  { id: 'app-washer',    name: 'Washing Machine',category: 'Appliances', icon: '🫧', addFn: s => addFlat(s, 0.6, 0.65, 'Washing Machine','#E0E0E0') },
  { id: 'app-dryer',     name: 'Dryer',         category: 'Appliances', icon: '♨️', addFn: s => addFlat(s, 0.6, 0.65, 'Dryer',        '#E0E0E0') },
  { id: 'app-sink',      name: 'Kitchen Sink',  category: 'Appliances', icon: '🚿', addFn: s => addFlat(s, 1.0, 0.5,  'Kitchen Sink', '#D8E8F0') },
  { id: 'app-micro',     name: 'Microwave',     category: 'Appliances', icon: '📦', addFn: s => addFlat(s, 0.5, 0.35, 'Microwave',    '#2A2A2A') },
  { id: 'app-tv',        name: 'TV',            category: 'Appliances', icon: '📺', addFn: s => addFlat(s, 1.2, 0.08, 'TV',           '#111111') },
  { id: 'app-ac',        name: 'Air Conditioner',category: 'Appliances', icon: '❄️', addFn: s => addFlat(s, 0.8, 0.25, 'A/C Unit',    '#D0D8E0') },
  { id: 'app-bath-fan',  name: 'Bath Fan',      category: 'Appliances', icon: '💨', addFn: s => addFlat(s, 0.3, 0.3,  'Bath Fan',     '#C8C8C8') },
]

const CATEGORIES = ['Architectural', 'Furniture', 'Mechanical', '2D Materials', '2D Furniture', 'Hardware', 'Appliances']

export function CatalogPanel() {
  const addObject  = useSceneStore(s => s.addObject)
  const updateObject = useSceneStore(s => s.updateObject)
  const createAssembly = useSceneStore(s => s.createAssembly)
  const [activeCategory, setActiveCategory] = useState('Architectural')
  const [search, setSearch] = useState('')

  const actions: CatalogActions = { addObject, updateObject, createAssembly }

  const filtered = CATALOG.filter(item => {
    const matchCat  = item.category === activeCategory
    const matchSrch = search === '' || item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSrch
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

        {/* Category selector */}
        <select
          className="prop-input w-full text-xs"
          value={activeCategory}
          onChange={e => setActiveCategory(e.target.value)}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
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
