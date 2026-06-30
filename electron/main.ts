import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  buildMenu(win)
  return win
}

function buildMenu(win: BrowserWindow) {
  const send = (action: string) => win.webContents.send('menu:action', action)

  const fileMenu: Electron.MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      { label: 'New',               accelerator: 'CmdOrCtrl+N',       click: () => send('new') },
      { label: 'Open…',             accelerator: 'CmdOrCtrl+O',       click: () => send('open') },
      { type: 'separator' },
      { label: 'Save',              accelerator: 'CmdOrCtrl+S',       click: () => send('save') },
      { label: 'Save Checkpoint',   accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveCheckpoint') },
      { type: 'separator' },
      { label: 'Export STL',        click: () => send('exportSTL') },
      { label: 'Export GLTF',       click: () => send('exportGLTF') },
      { label: 'Export OBJ',        click: () => send('exportOBJ') },
      { label: 'Export CSV (BOM)',   click: () => send('exportCSV') },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ],
  }

  const editMenu: Electron.MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { label: 'Undo',         accelerator: 'CmdOrCtrl+Z',       click: () => send('undo') },
      { label: 'Redo',         accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('redo') },
      { type: 'separator' },
      { label: 'Select All',   accelerator: 'CmdOrCtrl+A',       click: () => send('selectAll') },
      { label: 'Deselect All', accelerator: 'Escape',             click: () => send('deselectAll') },
      { type: 'separator' },
      { label: 'Duplicate',    accelerator: 'CmdOrCtrl+D',       click: () => send('duplicate') },
      { label: 'Delete',       accelerator: 'Backspace',          click: () => send('delete') },
      { type: 'separator' },
      { label: 'Preferences…', accelerator: 'CmdOrCtrl+,',       click: () => send('preferences') },
    ],
  }

  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      { label: 'Shaded',       click: () => send('displayShaded') },
      { label: 'Wireframe',    click: () => send('displayWireframe') },
      { label: 'Rendered',     click: () => send('displayRendered') },
      { type: 'separator' },
      { label: 'Front',        accelerator: '1', click: () => send('viewFront') },
      { label: 'Right',        accelerator: '3', click: () => send('viewRight') },
      { label: 'Top',          accelerator: '7', click: () => send('viewTop') },
      { label: 'Isometric',    accelerator: '0', click: () => send('viewIso') },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  }

  const helpMenu: Electron.MenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      { label: 'Keyboard Shortcuts', accelerator: '?', click: () => send('shortcuts') },
      { label: 'Getting Started',               click: () => send('onboarding') },
      { type: 'separator' },
      { label: 'Facet 3D on GitHub', click: () => shell.openExternal('https://github.com/elaous/crab') },
    ],
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    fileMenu, editMenu, viewMenu, helpMenu,
  ]

  if (process.platform === 'darwin') {
    template.unshift({ role: 'appMenu' })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('dialog:saveFile', async (
  _e,
  { defaultName, bytes }: { defaultName: string; bytes: number[] },
) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Facet 3D Scene', extensions: ['facet'] }],
  })
  if (canceled || !filePath) return { canceled: true }
  writeFileSync(filePath, Buffer.from(bytes))
  return { canceled: false, filePath }
})

ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      { name: 'Facet 3D Scene', extensions: ['facet', 'json'] },
      { name: 'All Files',     extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  const bytes = Array.from(readFileSync(filePaths[0]))
  return { bytes, filePath: filePaths[0] }
})

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
