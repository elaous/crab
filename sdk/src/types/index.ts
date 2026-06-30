// ── Primitives ────────────────────────────────────────────────────────────────

export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'csg' | 'component-instance'

export type DisplayMode = 'wireframe' | 'shaded' | 'rendered'

export type BooleanOp = 'union' | 'subtract' | 'intersect'

export interface Vec3 {
  x: number
  y: number
  z: number
}

// ── Dimensions ────────────────────────────────────────────────────────────────

export interface BoxDims    { width: number; height: number; depth: number }
export interface SphereDims { radius: number }
export interface CylinderDims { radius: number; height: number }
export interface ConeDims   { radius: number; height: number }

export type ObjectDims = BoxDims | SphereDims | CylinderDims | ConeDims | Record<string, never>

// ── Core scene types ──────────────────────────────────────────────────────────

export interface SceneObject {
  id: string
  name: string
  type: PrimitiveType
  layerId: string
  assemblyId?: string
  visible: boolean
  locked: boolean
  color: string
  opacity: number
  roughness: number
  metalness: number
  position: Vec3
  rotation: Vec3
  scale: Vec3
  dimensions: ObjectDims
  dimensionExpressions?: Record<string, string>
  metadata: Record<string, unknown>
}

export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
}

export interface Assembly {
  id: string
  name: string
  childIds: string[]
  color: string
}

// ── Plugin manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  /** Optional URL to plugin homepage or docs */
  homepage?: string
  /** Permissions this plugin requires — reserved for future capability gating */
  permissions?: PluginPermission[]
}

export type PluginPermission =
  | 'scene:read'
  | 'scene:write'
  | 'scene:delete'
  | 'log'

// ── Tool registration ─────────────────────────────────────────────────────────

export interface PluginToolDefinition {
  id: string
  label: string
  /** Single character or short emoji shown as the tool icon */
  icon?: string
  description?: string
  /** Called when the user clicks the tool button */
  run: () => void | Promise<void>
}
