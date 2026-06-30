import type { SceneObject } from '../../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Minimal IFC 2x3 / IFC 4 STEP text parser.
 *
 * Extracts geometric approximations for the most common building elements
 * (IfcWall, IfcSlab, IfcColumn, IfcDoor, IfcWindow, IfcSpace, IfcBeam, IfcStair)
 * by parsing IFCEXTRUDEDAREASOLID and IFCRECTANGLEPROFILEDEF instances.
 *
 * When geometry cannot be parsed, a placeholder box is emitted so the element
 * still appears in the scene tree.
 */

interface StepEntity {
  id: string          // e.g. "#42"
  type: string        // uppercase IFC type
  args: string        // raw argument string
}

// ─── STEP text tokeniser ──────────────────────────────────────────────────────

function parseEntities(text: string): Map<string, StepEntity> {
  const map = new Map<string, StepEntity>()
  // Match lines like:  #42=IFCWALL(...);\n
  const re = /#(\d+)\s*=\s*([A-Z0-9]+)\s*\(([^;]*)\)\s*;/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const id = '#' + m[1]
    map.set(id, { id, type: m[2], args: m[3].trim() })
  }
  return map
}

/** Split top-level comma-separated args (ignoring commas inside nested parens) */
function splitArgs(args: string): string[] {
  const result: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of args) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) result.push(cur.trim())
  return result
}

function unquote(s: string): string {
  return s.replace(/^'+/, '').replace(/'+$/, '')
}

function getNumber(s: string): number {
  const n = parseFloat(s.trim())
  return isNaN(n) ? 0 : n
}

// ─── Geometry extraction ──────────────────────────────────────────────────────

interface ExtrudedBox {
  width: number   // x
  depth: number   // z
  height: number  // y (extrusion depth)
}

function resolveExtrudedArea(
  entityId: string,
  entities: Map<string, StepEntity>,
): ExtrudedBox | null {
  const entity = entities.get(entityId)
  if (!entity) return null

  if (entity.type === 'IFCEXTRUDEDAREASOLID') {
    const parts = splitArgs(entity.args)
    // args: SweptArea, Position, ExtrudeDirection, Depth
    const profileId = parts[0]
    const depth = getNumber(parts[3])

    const profile = entities.get(profileId)
    if (!profile) return { width: 1, depth: 1, height: depth || 1 }

    if (profile.type === 'IFCRECTANGLEPROFILEDEF') {
      const pp = splitArgs(profile.args)
      // args: ProfileType, ProfileName, Position, XDim, YDim
      const xdim = getNumber(pp[pp.length - 2])
      const ydim = getNumber(pp[pp.length - 1])
      return { width: xdim || 1, depth: ydim || 1, height: depth || 1 }
    }

    if (profile.type === 'IFCCIRCLEPROFILEDEF') {
      const pp = splitArgs(profile.args)
      const r = getNumber(pp[pp.length - 1]) || 0.5
      return { width: r * 2, depth: r * 2, height: depth || 1 }
    }

    return { width: 1, depth: 1, height: depth || 1 }
  }

  return null
}

// ─── Colour per element type ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  IFCWALL: '#c8c0b4',
  IFCWALLSTANDARDCASE: '#c8c0b4',
  IFCSLAB: '#a0a0a0',
  IFCCOLUMN: '#8C9099',
  IFCBEAM: '#9B6914',
  IFCDOOR: '#8B6914',
  IFCWINDOW: '#A8D8F0',
  IFCSPACE: '#d4eaff',
  IFCSTAIR: '#b0a090',
  IFCROOF: '#e8d0b0',
}

// ─── Main export ──────────────────────────────────────────────────────────────

const BUILDING_TYPES = new Set([
  'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCCOLUMN', 'IFCBEAM',
  'IFCDOOR', 'IFCWINDOW', 'IFCSPACE', 'IFCSTAIR', 'IFCROOF',
])

export function parseIFC(text: string, layerId = 'default'): SceneObject[] {
  const entities = parseEntities(text)
  const objects: SceneObject[] = []

  // Find IFCRELASSOCIATESGEOMETRY / IFCPRODUCTDEFINITIONSHAPE for each building element
  // and collect IFCSHAPEREPRESENTATION references.
  //
  // Strategy: for each building element, walk its Representation → Items → look
  // for IFCEXTRUDEDAREASOLID.

  // First build a map from product → shape representation item IDs
  const productShapeItems = new Map<string, string[]>()

  entities.forEach(e => {
    if (e.type === 'IFCPRODUCTDEFINITIONSHAPE') {
      // args: Name, Description, [#ShapeRepr, ...]
      // We need to know which product references this shape.
      // IFC links via IfcProduct.Representation → IfcProductDefinitionShape
      // We'll resolve this below per-entity.
    }
    if (e.type === 'IFCSHAPEREPRESENTATION') {
      const parts = splitArgs(e.args)
      // args: ContextOfItems, RepresentationIdentifier, RepresentationType, Items
      // Items is a SET like (#100,#101)
      const itemsStr = parts[3] ?? ''
      const items = (itemsStr.match(/#\d+/g) ?? []) as string[]
      productShapeItems.set(e.id, items)
    }
  })

  // Map building element ID → its extruded geometry item IDs
  const elemGeom = new Map<string, string[]>()
  entities.forEach(e => {
    if (!BUILDING_TYPES.has(e.type)) return
    const parts = splitArgs(e.args)
    // The Representation arg is usually last or near last — look for #refs
    const reprRef = parts.find(p => /^#\d+$/.test(p) && entities.get(p)?.type === 'IFCPRODUCTDEFINITIONSHAPE')
    if (!reprRef) return
    const reprEntity = entities.get(reprRef)
    if (!reprEntity) return
    // Its Items list contains ShapeRepresentation IDs
    const shapeIds = (reprEntity.args.match(/#\d+/g) ?? []) as string[]
    const geomItems: string[] = []
    shapeIds.forEach(sid => {
      const items = productShapeItems.get(sid)
      if (items) geomItems.push(...items)
    })
    if (geomItems.length > 0) elemGeom.set(e.id, geomItems)
  })

  let idx = 0
  entities.forEach(e => {
    if (!BUILDING_TYPES.has(e.type)) return
    const parts = splitArgs(e.args)
    const rawName = parts[2] ? unquote(parts[2]) : ''
    const name = rawName || `${e.type.replace('IFC', '')} ${++idx}`

    // Try to resolve geometry
    const geomItems = elemGeom.get(e.id) ?? []
    let box: ExtrudedBox | null = null
    for (const gid of geomItems) {
      box = resolveExtrudedArea(gid, entities)
      if (box) break
    }

    // Defaults when geometry can't be parsed
    const defaults: Record<string, ExtrudedBox> = {
      IFCWALL: { width: 4, depth: 0.2, height: 3 },
      IFCWALLSTANDARDCASE: { width: 4, depth: 0.2, height: 3 },
      IFCSLAB: { width: 6, depth: 6, height: 0.2 },
      IFCCOLUMN: { width: 0.3, depth: 0.3, height: 3 },
      IFCBEAM: { width: 3, depth: 0.2, height: 0.3 },
      IFCDOOR: { width: 0.9, depth: 0.1, height: 2.1 },
      IFCWINDOW: { width: 1.2, depth: 0.1, height: 1.2 },
      IFCSPACE: { width: 5, depth: 4, height: 0.05 },
      IFCSTAIR: { width: 1.2, depth: 3, height: 0.2 },
      IFCROOF: { width: 8, depth: 8, height: 0.3 },
    }

    const dims = box ?? defaults[e.type] ?? { width: 1, depth: 1, height: 1 }
    const color = TYPE_COLORS[e.type] ?? '#888'
    const opacity = e.type === 'IFCSPACE' ? 0.15 : 1

    const obj: SceneObject = {
      id: uuidv4(),
      name,
      type: 'box',
      layerId,
      visible: true,
      locked: false,
      color,
      opacity,
      roughness: 0.8,
      metalness: 0,
      position: { x: idx * 0.1, y: dims.height / 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: { width: dims.width, height: dims.height, depth: dims.depth },
      metadata: { material: e.type.replace('IFC', ''), notes: `IFC entity ${e.id}` },
    }
    objects.push(obj)
  })

  return objects
}
