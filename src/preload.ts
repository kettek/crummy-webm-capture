// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  setSource: (id: string) => ipcRenderer.invoke('set-source', id),
  getSavePath: (type: string) => ipcRenderer.invoke('get-save-path', type),
  writeFile: (path: string, data: ArrayBuffer) => ipcRenderer.invoke('write-file', path, data),
})
