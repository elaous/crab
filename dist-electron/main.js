"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const isDev = process.env.NODE_ENV === 'development';
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: (0, node_path_1.join)(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    if (isDev) {
        win.loadURL('http://localhost:5173');
    }
    else {
        win.loadFile((0, node_path_1.join)(__dirname, '../dist/index.html'));
    }
    buildMenu(win);
    return win;
}
function buildMenu(win) {
    const send = (action) => win.webContents.send('menu:action', action);
    const fileMenu = {
        label: 'File',
        submenu: [
            { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
            { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
            { type: 'separator' },
            { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
            { label: 'Save Checkpoint', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveCheckpoint') },
            { type: 'separator' },
            { label: 'Export STL', click: () => send('exportSTL') },
            { label: 'Export GLTF', click: () => send('exportGLTF') },
            { label: 'Export OBJ', click: () => send('exportOBJ') },
            { label: 'Export CSV (BOM)', click: () => send('exportCSV') },
            { type: 'separator' },
            process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
        ],
    };
    const editMenu = {
        label: 'Edit',
        submenu: [
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
            { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => send('redo') },
            { type: 'separator' },
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => send('selectAll') },
            { label: 'Deselect All', accelerator: 'Escape', click: () => send('deselectAll') },
            { type: 'separator' },
            { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') },
            { label: 'Delete', accelerator: 'Backspace', click: () => send('delete') },
            { type: 'separator' },
            { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => send('preferences') },
        ],
    };
    const viewMenu = {
        label: 'View',
        submenu: [
            { label: 'Shaded', click: () => send('displayShaded') },
            { label: 'Wireframe', click: () => send('displayWireframe') },
            { label: 'Rendered', click: () => send('displayRendered') },
            { type: 'separator' },
            { label: 'Front', accelerator: '1', click: () => send('viewFront') },
            { label: 'Right', accelerator: '3', click: () => send('viewRight') },
            { label: 'Top', accelerator: '7', click: () => send('viewTop') },
            { label: 'Isometric', accelerator: '0', click: () => send('viewIso') },
            { type: 'separator' },
            { role: 'reload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
        ],
    };
    const helpMenu = {
        role: 'help',
        submenu: [
            { label: 'Keyboard Shortcuts', accelerator: '?', click: () => send('shortcuts') },
            { label: 'Getting Started', click: () => send('onboarding') },
            { type: 'separator' },
            { label: 'CrabCAD on GitHub', click: () => electron_1.shell.openExternal('https://github.com/elaous/crab') },
        ],
    };
    const template = [
        fileMenu, editMenu, viewMenu, helpMenu,
    ];
    if (process.platform === 'darwin') {
        template.unshift({ role: 'appMenu' });
    }
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
// ── IPC handlers ─────────────────────────────────────────────────────────────
electron_1.ipcMain.handle('dialog:saveFile', async (_e, { defaultName, bytes }) => {
    const { canceled, filePath } = await electron_1.dialog.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'CrabCAD Scene', extensions: ['crab'] }],
    });
    if (canceled || !filePath)
        return { canceled: true };
    (0, node_fs_1.writeFileSync)(filePath, Buffer.from(bytes));
    return { canceled: false, filePath };
});
electron_1.ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
        filters: [
            { name: 'CrabCAD Scene', extensions: ['crab', 'json'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0)
        return null;
    const bytes = Array.from((0, node_fs_1.readFileSync)(filePaths[0]));
    return { bytes, filePath: filePaths[0] };
});
// ── App lifecycle ─────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map