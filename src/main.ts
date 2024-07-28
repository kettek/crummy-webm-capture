import { app, BrowserWindow, desktopCapturer, session, ipcMain, dialog, Tray, Menu } from 'electron'
import fs from 'fs'
import path from 'path'

let mainWindow: BrowserWindow
let tray: Tray
let isRecording = false

const createTray = () => {
  // Create the tray icon and context menu
  // Hows it work?
  // 1. Create a tray icon with the default icon
  // 2. Create a context menu with two options: Show App and Quit
  // 3. Set the context menu to the tray icon
  // 4. Set the tooltip to the tray icon
  // 5. Restore the window when the tray icon is clicked
  
  const defaultIconPath = path.join(__dirname, '..', '..', 'public', 'icons', 'icon1.png')
  const recordingIconPath = path.join(__dirname, '..', '..', 'public', 'icons', 'icon2.png')

  console.log('Default Icon Path:', defaultIconPath)
  console.log('Recording Icon Path:', recordingIconPath)

  tray = new Tray(defaultIconPath) // Default Icon

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip('Crummy WebM Capture')

  // Restore the window when the tray icon is clicked.
  tray.on('click', () => {
    mainWindow.show()
  })
}

// Function to update the tray icon based on recording state
const updateTrayIcon = () => {
  const iconPath = isRecording ? path.join(__dirname, '..', '..', 'public', 'icons', 'icon2.png') : path.join(__dirname, '..', '..', 'public', 'icons', 'icon1.png')
  console.log('Updating Tray Icon to:', iconPath)
  tray.setImage(iconPath)
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

ipcMain.handle('get-sources', async () => {
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
  console.log('Save dialog result:', result)
  return result.filePath || null
})

ipcMain.handle('write-file', async (_, path: string, data: ArrayBuffer) => {
  if (!path) {
    console.error('No path provided for writing the file.')
    return
  }
  try {
    await fs.promises.writeFile(path, Buffer.from(data))
  } catch (e) {
    console.error('Failed to write file:', e)
  }
})

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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

  // Load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  createTray() // Create the tray icon and context menu
}

// This method will be called when Electron has finished initialization and is ready to create browser windows.
app.on('ready', createWindow)

// Quit when all windows are closed, except on macOS. There, it's common for applications and their menu bar to stay active until the user quits explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Stubbing start and stop recording handlers
ipcMain.handle('start-recording', () => {
  isRecording = true
  updateTrayIcon()
})

ipcMain.handle('stop-recording', () => {
  isRecording = false
  updateTrayIcon()
})

// Export functions for testing purposes (optional)
export {
  createTray,
  updateTrayIcon,
  createWindow
}
