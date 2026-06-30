import type {
  PluginManifest, PluginToolDefinition, PluginPermission,
  SceneObject, Vec3, PrimitiveType,
} from './types/index.js'

export type { PluginManifest, PluginToolDefinition, PluginPermission }

// ── Scene API (available as `api.scene.*` inside the worker) ──────────────────

export interface SceneAPI {
  /** Returns all objects currently in the scene */
  getObjects: () => Promise<SceneObject[]>
  /** Returns the ids of currently selected objects */
  getSelectedIds: () => Promise<string[]>
  /** Adds a new primitive at the given position; resolves with the new object id */
  addObject: (type: PrimitiveType, position?: Partial<Vec3>) => Promise<string>
  /** Applies a partial update to an existing object */
  updateObject: (id: string, patch: Partial<SceneObject>) => Promise<boolean>
  /** Removes objects by id */
  removeObjects: (ids: string[]) => Promise<boolean>
}

// ── Full plugin API (the `api` global inside the worker) ──────────────────────

export interface PluginAPI {
  scene: SceneAPI
  /** Register a toolbar tool that users can invoke from the Plugins panel */
  registerTool: (tool: PluginToolDefinition) => void
  /** Emit a log line to the plugin console in the Plugins panel */
  log: (...args: unknown[]) => void
}

// ── definePlugin ──────────────────────────────────────────────────────────────

export interface PluginConfig {
  manifest: PluginManifest
  /**
   * Plugin entry point. This function runs inside the sandboxed Web Worker
   * and receives the `api` object. Register tools and set up any listeners here.
   *
   * Important: this function is serialized to a string via `.toString()` and
   * injected into the worker. It must be self-contained — no closure variables,
   * no external imports. Only the `api` argument is available at runtime.
   */
  setup: (api: PluginAPI) => void | Promise<void>
}

export interface PluginBundle {
  manifest: PluginManifest
  /**
   * Ready-to-load JavaScript source string.
   * Pass this directly to `pluginStore.installPlugin(manifest, code)`.
   */
  code: string
}

/**
 * Defines a type-safe CrabCAD plugin.
 *
 * The `setup` function is serialized to a string for the Worker sandbox.
 * It must be fully self-contained — no outer-scope references allowed.
 *
 * @example
 * ```ts
 * import { definePlugin } from '@crabcad/sdk'
 *
 * export default definePlugin({
 *   manifest: {
 *     name: 'Hello World',
 *     version: '1.0.0',
 *     description: 'Logs a greeting',
 *     author: 'You',
 *   },
 *   setup(api) {
 *     api.registerTool({
 *       id: 'hello',
 *       label: 'Say Hello',
 *       icon: '👋',
 *       run() {
 *         api.log('Hello from CrabCAD!')
 *       },
 *     })
 *   },
 * })
 * ```
 */
export function definePlugin(config: PluginConfig): PluginBundle {
  const fnBody = config.setup.toString()
  // Wrap the serialized function so it calls itself with the global `api`
  const code = `;(${fnBody})(api);`
  return { manifest: config.manifest, code }
}

/**
 * Type helper for declaring a plugin manifest inline with type checking.
 * Useful when you want to separate manifest from setup or share it across files.
 */
export function defineManifest(manifest: PluginManifest): PluginManifest {
  return manifest
}
