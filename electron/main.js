// Electron main process for Visual App Builder (Windows Desktop)
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const DEFAULT_PORT = 3000;

function waitForServer(port, retries = 30, delayMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${port}/builder/default`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (attempts >= retries) {
          // If max retries reached, still resolve so window opens
          resolve();
        } else {
          setTimeout(check, delayMs);
        }
      });
    };
    check();
  });
}

function startServer() {
  try {
    const isPackaged = app.isPackaged;
    const serverPath = isPackaged
      ? path.join(process.resourcesPath, 'app.asar', '.next', 'standalone', 'server.js')
      : path.join(__dirname, '..', '.next', 'standalone', 'server.js');

    const env = {
      ...process.env,
      PORT: String(DEFAULT_PORT),
      NODE_ENV: 'production',
    };

    serverProcess = fork(serverPath, [], {
      env,
      stdio: 'inherit',
    });

    serverProcess.on('error', (err) => {
      console.error('[Electron Server Error]:', err);
    });
  } catch (err) {
    console.error('[Electron Server Launch Error]:', err);
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'Visual App Builder & AI Studio',
    backgroundColor: '#090d16',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Start background server if not already running
  startServer();
  await waitForServer(DEFAULT_PORT);

  // Load visual builder directly
  mainWindow.loadURL(`http://localhost:${DEFAULT_PORT}/builder/default`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // External links open in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
