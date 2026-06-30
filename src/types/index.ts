export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'helix' | 'csg' | 'component-instance' | 'line' | 'imported'

export type UserRole = 'owner' | 'editor' | 'viewer'

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dot-dash' | 'double'

export type ViewMode = 'perspective' | 'orthographic'

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

export type DisplayMode = 'wireframe' | 'shaded' | 'rendered'

export type ToneMapping = 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces'

export type EnvPreset = 'none' | 'studio' | 'outdoor' | 'sunset' | 'city'

export type StylePreset = 'default' | 'sketchy' | 'flat' | 'xray' | 'blueprint'

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
  // Smart component physical metadata
  sku?: string
  manufacturer?: string
  unitCost?: number
  category?: string        // e.g. 'Appliances', 'Furniture', 'Hardware'
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
  textureDataUrl?: string   // base64 data URL for image texture map
  uvOffset?: Vec3           // UV texture offset (x, y); z ignored
  uvScale?: Vec3            // UV texture repeat (x, y); z ignored
  uvRotation?: number       // UV rotation in degrees
  position: Vec3
  rotation: Vec3
  scale: Vec3
  dimensions: BoxDims | SphereDims | CylinderDims | ConeDims | LineDims | TorusDims | HelixDims | Record<string, never>
  dimensionExpressions?: Record<string, string>  // dim key → formula, e.g. { width: "wall_w * 2" }
  lineStyle?: LineStyle
  lineWidth?: number
  metadata: ObjectMetadata
  csgData?: CSGGeometryData
}

export interface Parameter {
  id: string
  name: string        // valid JS identifier, used in formulas
  expression: string  // e.g. "3.0" or "room_width * 0.5"
  value: number       // last successfully evaluated result
}

export interface BoxDims { width: number; height: number; depth: number }
export interface SphereDims { radius: number }
export interface CylinderDims { radius: number; height: number }
export interface ConeDims { radius: number; height: number }
export interface LineDims { length: number }
export interface TorusDims { radius: number; tube: number }  // outer radius, tube radius
export interface HelixDims { radius: number; height: number; turns: number; tubeRadius: number }

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
  sectionAxis: 'x' | 'y' | 'z' | 'angle'
  sectionOffset: number // world units
  sectionAngle: number  // degrees, used when sectionAxis === 'angle'
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
  // Styles
  stylePreset: StylePreset
  edgesVisible: boolean
  edgeColor: string
  flatShading: boolean
  xrayMode: boolean
  bgGradient: boolean
  bgColorTop: string
}

export interface SceneVersion {
  id: string
  name: string
  createdAt: number
  objectCount: number
  objects: SceneObject[]
  layers: Layer[]
  layerOrder: string[]
  settings: SceneSettings
  sceneName: string
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
  textureDataUrl?: string  // base64 image for custom presets
  custom?: boolean
  // Smart material physical metadata
  sku?: string
  manufacturer?: string
  unitCost?: number        // cost per unit
  unitOfMeasure?: 'sqm' | 'sqft' | 'unit' | 'linear_m' | 'linear_ft'
  coveragePerUnit?: number // sqm per unit (for tiles, flooring, paint)
}

export interface SmartComponentMeta {
  sku?: string
  manufacturer?: string
  unitCost?: number
  unitOfMeasure?: 'unit' | 'sqm' | 'linear_m'
}

export interface SceneData {
  version: string
  name: string
  objects: SceneObject[]
  layers: Layer[]
  assemblies?: Assembly[]
  componentDefs?: ComponentDef[]
  parameters?: Parameter[]
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
