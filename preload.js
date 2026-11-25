const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xv', {
  listServices: () => ipcRenderer.invoke('services:list'),
  pickProject: () => ipcRenderer.invoke('project:pick'),
  inspectProject: (dir) => ipcRenderer.invoke('project:inspect', dir),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  listProfiles: (serviceId) => ipcRenderer.invoke('profiles:list', serviceId),
  saveProfile: (data) => ipcRenderer.invoke('profiles:save', data),
  deleteProfile: (data) => ipcRenderer.invoke('profiles:delete', data),
  startDeploy: (opts) => ipcRenderer.invoke('deploy:start', opts),
  cancelDeploy: () => ipcRenderer.invoke('deploy:cancel'),
  onLog: (cb) => ipcRenderer.on('deploy:log', (_e, d) => cb(d)),
  onDone: (cb) => ipcRenderer.on('deploy:done', (_e, d) => cb(d)),
});
