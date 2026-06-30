// Types
export type {
  PrimitiveType, DisplayMode, BooleanOp,
  Vec3, BoxDims, SphereDims, CylinderDims, ConeDims, ObjectDims,
  SceneObject, Layer, Assembly,
  PluginManifest, PluginToolDefinition, PluginPermission,
} from './types/index.js'

// Plugin authoring
export type { PluginConfig, PluginBundle, SceneAPI, PluginAPI } from './plugin.js'
export { definePlugin, defineManifest } from './plugin.js'

// External client
export type { Facet3DClientOptions, RemotePlugin, SceneSnapshot } from './client.js'
export { Facet3DClient } from './client.js'
