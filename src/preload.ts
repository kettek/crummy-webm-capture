import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  setSource: (id: string) => ipcRenderer.invoke('set-source', id),
  getSavePath: (type: string) => ipcRenderer.invoke('get-save-path', type),
  writeFile: (path: string, data: ArrayBuffer) => ipcRenderer.invoke('write-file', path, data),
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
})
