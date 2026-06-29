import type { MaterialPreset } from '../../types'

export const MATERIAL_PRESETS: MaterialPreset[] = [
  // Wood
  { id: 'wood-oak',   name: 'Oak',      category: 'Wood',   color: '#8B6914', roughness: 0.82, metalness: 0,    opacity: 1 },
  { id: 'wood-pine',  name: 'Pine',     category: 'Wood',   color: '#C8A86B', roughness: 0.75, metalness: 0,    opacity: 1 },
  { id: 'wood-dark',  name: 'Walnut',   category: 'Wood',   color: '#4A2C0A', roughness: 0.80, metalness: 0,    opacity: 1 },
  { id: 'wood-maple', name: 'Maple',    category: 'Wood',   color: '#E8C88A', roughness: 0.78, metalness: 0,    opacity: 1 },
  // Stone / Concrete
  { id: 'concrete',   name: 'Concrete', category: 'Stone',  color: '#9B9B8A', roughness: 0.95, metalness: 0,    opacity: 1 },
  { id: 'stone-gray', name: 'Granite',  category: 'Stone',  color: '#7A7A7A', roughness: 0.90, metalness: 0,    opacity: 1 },
  { id: 'marble',     name: 'Marble',   category: 'Stone',  color: '#E8E4D8', roughness: 0.20, metalness: 0,    opacity: 1 },
  { id: 'brick',      name: 'Brick',    category: 'Stone',  color: '#A0522D', roughness: 0.92, metalness: 0,    opacity: 1 },
  // Metal
  { id: 'steel',      name: 'Steel',    category: 'Metal',  color: '#8C9099', roughness: 0.30, metalness: 0.90, opacity: 1 },
  { id: 'aluminum',   name: 'Aluminum', category: 'Metal',  color: '#B8C0CC', roughness: 0.25, metalness: 0.95, opacity: 1 },
  { id: 'copper',     name: 'Copper',   category: 'Metal',  color: '#B87333', roughness: 0.40, metalness: 0.90, opacity: 1 },
  { id: 'gold',       name: 'Gold',     category: 'Metal',  color: '#FFD700', roughness: 0.20, metalness: 1.00, opacity: 1 },
  { id: 'iron',       name: 'Iron',     category: 'Metal',  color: '#4A4A4A', roughness: 0.70, metalness: 0.80, opacity: 1 },
  { id: 'chrome',     name: 'Chrome',   category: 'Metal',  color: '#D4D4D4', roughness: 0.05, metalness: 1.00, opacity: 1 },
  // Plastic
  { id: 'plastic-w',  name: 'White',    category: 'Plastic',color: '#F0F0F0', roughness: 0.60, metalness: 0,    opacity: 1 },
  { id: 'plastic-b',  name: 'Black',    category: 'Plastic',color: '#1A1A1A', roughness: 0.55, metalness: 0,    opacity: 1 },
  { id: 'rubber',     name: 'Rubber',   category: 'Plastic',color: '#222222', roughness: 0.95, metalness: 0,    opacity: 1 },
  // Glass / Transparent
  { id: 'glass',      name: 'Glass',    category: 'Glass',  color: '#A8D8F0', roughness: 0.05, metalness: 0.10, opacity: 0.25 },
  { id: 'frosted',    name: 'Frosted',  category: 'Glass',  color: '#D8E8F0', roughness: 0.60, metalness: 0,    opacity: 0.50 },
  { id: 'tinted',     name: 'Tinted',   category: 'Glass',  color: '#2D5A27', roughness: 0.05, metalness: 0,    opacity: 0.40 },
  // Fabric / Other
  { id: 'fabric',     name: 'Fabric',   category: 'Other',  color: '#6B7280', roughness: 1.00, metalness: 0,    opacity: 1 },
  { id: 'ceramic',    name: 'Ceramic',  category: 'Other',  color: '#F5F5F0', roughness: 0.15, metalness: 0,    opacity: 1 },
  { id: 'soil',       name: 'Soil',     category: 'Other',  color: '#5C4033', roughness: 1.00, metalness: 0,    opacity: 1 },
]

export const MATERIAL_CATEGORIES = Array.from(
  new Set(MATERIAL_PRESETS.map(m => m.category))
)

export function getPreset(id: string): MaterialPreset | undefined {
  return MATERIAL_PRESETS.find(m => m.id === id)
}
