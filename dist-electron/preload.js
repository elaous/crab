"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (defaultName, bytes) => electron_1.ipcRenderer.invoke('dialog:saveFile', { defaultName, bytes: Array.from(bytes) }),
    openFile: () => electron_1.ipcRenderer.invoke('dialog:openFile'),
    onMenuAction: (cb) => {
        const handler = (_, action) => cb(action);
        electron_1.ipcRenderer.on('menu:action', handler);
        return () => electron_1.ipcRenderer.removeListener('menu:action', handler);
    },
});
//# sourceMappingURL=preload.js.map