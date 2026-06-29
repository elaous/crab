export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone'

export type ViewMode = 'perspective' | 'orthographic'

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

export type DisplayMode = 'wireframe' | 'shaded' | 'rendered'

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface SceneObject {
  id: string
  name: string
  type: PrimitiveType
  layerId: string
  visible: boolean
  locked: boolean
  color: string
  opacity: number
  position: Vec3
  rotation: Vec3
  scale: Vec3
  dimensions: BoxDims | SphereDims | CylinderDims | ConeDims
  metadata: ObjectMetadata
}

export interface BoxDims { width: number; height: number; depth: number }
export interface SphereDims { radius: number }
export interface CylinderDims { radius: number; height: number }
export interface ConeDims { radius: number; height: number }

export interface ObjectMetadata {
  cost?: number
  material?: string
  manufacturer?: string
  notes?: string
  [key: string]: unknown
}

export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
}

export interface CameraSnapshot {
  id: string
  name: string
  preset: ViewPreset
  mode: ViewMode
  position: Vec3
  target: Vec3
  fov: number
  zoom: number
}

export interface SceneSettings {
  units: 'metric' | 'imperial'
  precision: number
  snapEnabled: boolean
  snapDistance: number
  gridVisible: boolean
  axesVisible: boolean
  displayMode: DisplayMode
  shadowsEnabled: boolean
  outlineEnabled: boolean
}

export interface SceneData {
  version: string
  name: string
  objects: SceneObject[]
  layers: Layer[]
  settings: SceneSettings
  snapshots: CameraSnapshot[]
  createdAt: string
  updatedAt: string
}

export interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  targetId: string | null
}

export interface MousePosition3D {
  x: number
  y: number
  z: number
  valid: boolean
}
