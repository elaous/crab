export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'csg' | 'component-instance'

export type ViewMode = 'perspective' | 'orthographic'

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

export type DisplayMode = 'wireframe' | 'shaded' | 'rendered'

export type ToneMapping = 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces'

export type EnvPreset = 'none' | 'studio' | 'outdoor' | 'sunset' | 'city'

export type ToolMode = 'select' | 'move' | 'rotate' | 'scale'

export type BooleanOp = 'union' | 'subtract' | 'intersect'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface CSGGeometryData {
  positions: number[]
  normals: number[]
  indices: number[]
}

export interface ComponentDef {
  id: string
  name: string
  description?: string
  objects: SceneObject[]   // geometry relative to the def's local origin
  origin: Vec3             // local origin offset
  color: string
}

export interface Assembly {
  id: string
  name: string
  childIds: string[]
  color: string
}

export interface SceneObject {
  id: string
  name: string
  type: PrimitiveType
  layerId: string
  assemblyId?: string
  componentDefId?: string  // set when type === 'component-instance'
  visible: boolean
  locked: boolean
  color: string
  opacity: number
  roughness: number
  metalness: number
  materialPresetId?: string
  position: Vec3
  rotation: Vec3
  scale: Vec3
  dimensions: BoxDims | SphereDims | CylinderDims | ConeDims | Record<string, never>
  metadata: ObjectMetadata
  csgData?: CSGGeometryData
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
  sobelEnabled: boolean
  aoEnabled: boolean
  sunAzimuth: number    // degrees 0-360
  sunElevation: number  // degrees 0-90
  sunIntensity: number  // 0-3
  sectionEnabled: boolean
  sectionAxis: 'x' | 'y' | 'z'
  sectionOffset: number // world units
  // Rendering upgrades
  toneMapping: ToneMapping
  exposure: number        // 0.1–3
  bloomEnabled: boolean
  bloomStrength: number   // 0–3
  bloomRadius: number     // 0–1
  bloomThreshold: number  // 0–1
  envPreset: EnvPreset
  envIntensity: number    // 0–2
  bgColor: string         // hex background color
}

export type AnnotationType = 'label' | 'dimension'

export interface Annotation {
  id: string
  type: AnnotationType
  text: string
  position: Vec3
  to?: Vec3        // end point for dimension annotations
  color: string
  fontSize: number
}

export interface MaterialPreset {
  id: string
  name: string
  category: string
  color: string
  roughness: number
  metalness: number
  opacity: number
  icon?: string
}

export interface SceneData {
  version: string
  name: string
  objects: SceneObject[]
  layers: Layer[]
  assemblies?: Assembly[]
  componentDefs?: ComponentDef[]
  settings: SceneSettings
  snapshots: CameraSnapshot[]
  annotations: Annotation[]
  createdAt: string
  updatedAt: string
}

export interface MousePosition3D {
  x: number
  y: number
  z: number
  valid: boolean
}
