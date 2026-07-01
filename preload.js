const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  close: () => ipcRenderer.send('window-close'),
  minimize: () => ipcRenderer.send('window-minimize'),
  resize: (width, height) => ipcRenderer.send('window-resize', { width, height }),
  move: (deltaX, deltaY) => ipcRenderer.send('window-move', { deltaX, deltaY })
});
