const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  selectMode: (mode) => ipcRenderer.send('select-mode', mode),
  closeModeWindow: () => ipcRenderer.send('close-mode-window'),
  checkOnline: () => ipcRenderer.invoke('check-online'),
  checkCache: () => ipcRenderer.invoke('check-cache'),
});
