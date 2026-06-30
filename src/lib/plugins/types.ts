export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
}

export interface RegisteredTool {
  id: string
  label: string
  icon: string
  description: string
}

export interface PluginRecord {
  id: string
  manifest: PluginManifest
  code: string
  status: 'loading' | 'active' | 'error' | 'disabled'
  error?: string
  tools: RegisteredTool[]
  logs: string[]
}
