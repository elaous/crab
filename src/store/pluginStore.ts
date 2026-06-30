import { create } from 'zustand'
import type { PluginRecord, PluginManifest, RegisteredTool } from '../lib/plugins/types'
import { PluginHost } from '../lib/plugins/PluginHost'

interface PluginStore {
  plugins: Map<string, PluginRecord>
  hosts: Map<string, PluginHost>

  installPlugin: (manifest: PluginManifest, code: string) => string
  uninstallPlugin: (id: string) => void
  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  invokeTool: (pluginId: string, toolId: string) => void
  clearLogs: (id: string) => void
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: new Map(),
  hosts: new Map(),

  installPlugin(manifest, code) {
    const id = genId()
    const record: PluginRecord = {
      id, manifest, code,
      status: 'loading',
      tools: [],
      logs: [],
    }

    set(s => {
      const plugins = new Map(s.plugins)
      plugins.set(id, record)
      return { plugins }
    })

    const host = new PluginHost(code, manifest, {
      onReady() {
        set(s => {
          const plugins = new Map(s.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, status: 'active' })
          return { plugins }
        })
      },
      onError(msg) {
        set(s => {
          const plugins = new Map(s.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, status: 'error', error: msg })
          return { plugins }
        })
      },
      onToolRegistered(tool: RegisteredTool) {
        set(s => {
          const plugins = new Map(s.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, tools: [...p.tools, tool] })
          return { plugins }
        })
      },
      onLog(args: string[]) {
        set(s => {
          const plugins = new Map(s.plugins)
          const p = plugins.get(id)
          if (p) {
            const line = args.join(' ')
            plugins.set(id, { ...p, logs: [...p.logs.slice(-199), line] })
          }
          return { plugins }
        })
      },
    })

    set(s => {
      const hosts = new Map(s.hosts)
      hosts.set(id, host)
      return { hosts }
    })

    host.start()
    return id
  },

  uninstallPlugin(id) {
    get().hosts.get(id)?.stop()
    set(s => {
      const plugins = new Map(s.plugins)
      const hosts = new Map(s.hosts)
      plugins.delete(id)
      hosts.delete(id)
      return { plugins, hosts }
    })
  },

  enablePlugin(id) {
    const s = get()
    const plugin = s.plugins.get(id)
    if (!plugin || plugin.status !== 'disabled') return

    const updated: PluginRecord = { ...plugin, status: 'loading', tools: [], logs: [] }
    set(prev => {
      const plugins = new Map(prev.plugins)
      plugins.set(id, updated)
      return { plugins }
    })

    const host = new PluginHost(plugin.code, plugin.manifest, {
      onReady() {
        set(prev => {
          const plugins = new Map(prev.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, status: 'active' })
          return { plugins }
        })
      },
      onError(msg) {
        set(prev => {
          const plugins = new Map(prev.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, status: 'error', error: msg })
          return { plugins }
        })
      },
      onToolRegistered(tool: RegisteredTool) {
        set(prev => {
          const plugins = new Map(prev.plugins)
          const p = plugins.get(id)
          if (p) plugins.set(id, { ...p, tools: [...p.tools, tool] })
          return { plugins }
        })
      },
      onLog(args: string[]) {
        set(prev => {
          const plugins = new Map(prev.plugins)
          const p = plugins.get(id)
          if (p) {
            const line = args.join(' ')
            plugins.set(id, { ...p, logs: [...p.logs.slice(-199), line] })
          }
          return { plugins }
        })
      },
    })

    set(prev => {
      const hosts = new Map(prev.hosts)
      hosts.set(id, host)
      return { hosts }
    })

    host.start()
  },

  disablePlugin(id) {
    get().hosts.get(id)?.stop()
    set(s => {
      const plugins = new Map(s.plugins)
      const hosts = new Map(s.hosts)
      const p = plugins.get(id)
      if (p) plugins.set(id, { ...p, status: 'disabled', tools: [] })
      hosts.delete(id)
      return { plugins, hosts }
    })
  },

  invokeTool(pluginId, toolId) {
    get().hosts.get(pluginId)?.invokeToolHandler(toolId)
  },

  clearLogs(id) {
    set(s => {
      const plugins = new Map(s.plugins)
      const p = plugins.get(id)
      if (p) plugins.set(id, { ...p, logs: [] })
      return { plugins }
    })
  },
}))
