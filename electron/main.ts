import electronPkg from 'electron';
const { app, BrowserWindow, shell } = electronPkg;
import path from 'path';
import { fileURLToPath } from 'url';
import { startServer } from '../server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let serverInstance: any = null;
let activePort = 3000;

// Always mark production when packaged
const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
process.env.ELECTRON_RUN = 'true';
if (!isDev) {
  process.env.NODE_ENV = 'production';
  process.env.SERVE_STATIC = 'true';
}

async function startBackendAndWindow() {
  try {
    console.log('[FlowArchitect] Starting internal backend server...');
    const started = await startServer(3000);
    activePort = started.port;
    serverInstance = started.server;
    console.log(`[FlowArchitect] Backend server ready on port ${activePort}`);
  } catch (err) {
    console.error('[FlowArchitect] Failed to start backend server:', err);
  }

  createMainWindow(`http://localhost:${activePort}`);
}

function createMainWindow(targetUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'FlowArchitect AI',
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.loadURL(targetUrl);

  // If initial load fails (e.g. server binding delay), retry after 600ms
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.warn(`[FlowArchitect] Window load failed (${errorCode}: ${errorDescription}), retrying...`);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl);
      }
    }, 600);
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(`http://localhost:${activePort}`) && !url.startsWith(`http://127.0.0.1:${activePort}`)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(startBackendAndWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance && typeof serverInstance.close === 'function') {
      serverInstance.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startBackendAndWindow();
  }
});
