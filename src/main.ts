import { app, Menu, Tray, BrowserWindow, desktopCapturer, session, ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'

let mainWindow: BrowserWindow
let tray: Tray
let isRecording = false

const createTray = () => {
  const defaultIconPath = path.join(app.getAppPath(), 'public', 'icons', 'icon1.png')
  const recordingIconPath = path.join(app.getAppPath(), 'public', 'icons', 'icon2.png')

  tray = new Tray(defaultIconPath)

  tray.setToolTip('This is my application.')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setContextMenu(contextMenu)

  tray.on('click', () => mainWindow.show())
}

// Function to update tray icon based on recording state
const updateTrayIcon = () => {
  const iconPath = isRecording ? path.join(app.getAppPath(), 'public', 'icons', 'icon2.png') : path.join(app.getAppPath(), 'public', 'icons', 'icon1.png')
  tray.setImage(iconPath)
}

// Function to create the main application window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Specify the preload script
    },
  })

  const rendererUrl = app.isPackaged
    ? `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`
    : 'http://localhost:5173'
  mainWindow.loadURL(rendererUrl)

  mainWindow.webContents.openDevTools()

  mainWindow.on('minimize', (event) => {
    event.preventDefault()
    mainWindow.hide()
    tray.displayBalloon({
      title: 'App Hidden',
      content: 'The app has been minimized to the tray.',
    })
  })

  if (!tray) {
    createTray()
  }
}

// IPC handlers to manage recording state
ipcMain.handle('start-recording', () => {
  isRecording = true
  updateTrayIcon()
})

ipcMain.handle('stop-recording', () => {
  isRecording = false
  updateTrayIcon()
})

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

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
