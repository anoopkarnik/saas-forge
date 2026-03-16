import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { mkdirSync, accessSync, constants, writeFileSync } from 'fs'
import { homedir } from 'os'

// Fix shared memory / /tmp issues on Linux packaged apps.
// Must happen BEFORE app.commandLine calls so Chromium picks them up.
if (process.platform === 'linux') {
  // Disable GPU hardware acceleration — this is the primary consumer of
  // /tmp shared-memory files. Chromium falls back to software rendering.
  app.commandLine.appendSwitch('disable-gpu')

  // If /tmp is inaccessible, redirect Chromium's temp dir to a user path.
  let tmpOk = false
  try { accessSync('/tmp', constants.W_OK); tmpOk = true } catch { /* /tmp missing */ }
  if (!tmpOk) {
    const fallbackTmp = join(homedir(), '.cache', 'saasforge-tmp')
    try { mkdirSync(fallbackTmp, { recursive: true }) } catch { /* ignore */ }
    process.env.TMPDIR = fallbackTmp
    app.commandLine.appendSwitch('temp-dir', fallbackTmp)
  }
}

app.commandLine.appendSwitch('disable-dev-shm-usage')
app.commandLine.appendSwitch('no-sandbox')

// Register myapp:// as the default protocol client
app.setAsDefaultProtocolClient('myapp')

// Single-instance lock for Windows/Linux: forward deep-link URL to existing window
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

function loadRendererURL(hash?: string): void {
  if (!mainWindow) return
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(hash ? `${devUrl}#${hash}` : devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }
}

function handleDeepLink(_url: string): void {
  if (!mainWindow) return

  // The session cookie was already set by Better Auth during the OAuth flow
  // inside the webview — just reload the app at the auth-callback route
  loadRendererURL('/auth-callback')
}

app.on('second-instance', (_event, argv) => {
  // On Windows/Linux the deep-link URL is in the command line args
  const url = argv.find((arg) => arg.startsWith('myapp://'))
  if (url) handleDeepLink(url)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// macOS: deep-link arrives via open-url
app.on('open-url', (_event, url) => {
  handleDeepLink(url)
})

function createWindow(): void {
  console.log('[main] Creating window...')

  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.maximize()
    mainWindow!.show()
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[main] Renderer failed to load: ${errorCode} - ${errorDescription}`)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[main] Renderer process gone:`, details)
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer] ${message} (${sourceId}:${line})`)
  })

  // After OAuth completes, the webview lands on /api/auth/desktop-callback.
  // At this point all cookies are committed. Reload the Electron app at /auth-callback.
  mainWindow.webContents.on('did-navigate', (_event, url) => {
    if (url.includes('/api/auth/desktop-callback')) {
      loadRendererURL('/auth-callback')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  const url = process.env['ELECTRON_RENDERER_URL']
  console.log('[main] ELECTRON_RENDERER_URL:', url)
  if (url) {
    mainWindow.loadURL(url)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }


}

// IPC: save a file buffer to disk via a native Save dialog
ipcMain.handle('save-file', async (_event, fileName: string, buffer: ArrayBuffer) => {
  if (!mainWindow) return false
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: fileName,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
  })
  if (canceled || !filePath) return false
  writeFileSync(filePath, Buffer.from(buffer))
  return true
})

app.whenReady().then(() => {
  console.log('[main] App is ready, creating window...')
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

