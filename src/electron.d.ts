interface ElectronAPI {
  saveFile: (defaultName: string, bytes: Uint8Array) => Promise<{
    canceled: boolean
    filePath?: string
  }>
  openFile: () => Promise<{
    bytes: number[]
    filePath: string
  } | null>
  onMenuAction: (cb: (action: string) => void) => () => void
}

declare interface Window {
  electronAPI?: ElectronAPI
}
