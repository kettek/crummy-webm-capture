import { app, BrowserWindow, desktopCapturer, session, ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

ipcMain.handle('get-sources', async (): Promise<CaptureTarget[]> => {
  return (
    await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 400, height: 400 },
    })
  ).map((v) => {
    return {
      name: v.name,
      id: v.id,
      thumbnail: v.thumbnail.toDataURL(),
    }
  })
})

let captureSource = ''
ipcMain.handle('set-source', (_, id: string) => {
  captureSource = id
})

ipcMain.handle('get-save-path', async (_, type: string) => {
  type = type.split(';')[0]
  const ext = type.split('/')[1]
  const result = await dialog.showSaveDialog({
    defaultPath: 'capture.' + ext,
    filters: [{ name: type, extensions: [ext] }],
  })
  return result.filePath
})

ipcMain.handle('write-file', async (_, path: string, data: ArrayBuffer) => {
  try {
    await fs.promises.writeFile(path, Buffer.from(data))
  } catch (e) {
    console.error(e)
  }
})

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.removeMenu()

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
      const result = sources.find((source) => source.id === captureSource)
      if (!result) {
        callback(null)
        return
      }
      callback({
        video: result,
      })
    })
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
