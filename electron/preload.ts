import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (defaultName: string, bytes: Uint8Array) =>
    ipcRenderer.invoke('dialog:saveFile', { defaultName, bytes: Array.from(bytes) }) as Promise<{
      canceled: boolean
      filePath?: string
    }>,

  openFile: () =>
    ipcRenderer.invoke('dialog:openFile') as Promise<{
      bytes: number[]
      filePath: string
    } | null>,

  onMenuAction: (cb: (action: string) => void) => {
    const handler = (_: IpcRendererEvent, action: string) => cb(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },
})
