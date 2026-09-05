// Electron main process for Visual App Builder (Windows Desktop)
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { fork } = require('child_process');

// Optimize Chromium flags on Windows to prevent GPU cache lockups
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow = null;
let serverProcess = null;
let currentPort = 3000;
let serverLogPath = '';

function log(message) {
  const time = new Date().toISOString();
  const line = `[${time}] ${message}\n`;
  try {
    if (serverLogPath) {
      fs.appendFileSync(serverLogPath, line);
    }
  } catch (err) {
    // Ignore logging errors
  }
  console.log(`[VisualAppBuilder] ${message}`);
}

function findAvailablePort(startPort = 3000) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve);
      } else {
        resolve(startPort);
      }
    });
    tester.once('listening', () => {
      tester.close(() => {
        resolve(startPort);
      });
    });
    tester.listen(startPort, '127.0.0.1');
  });
}

function getServerPath() {
  const isPackaged = app.isPackaged;
  if (!isPackaged) {
    const devPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
    return fs.existsSync(devPath) ? devPath : null;
  }

  // 1. extraResources standalone directory (resources/standalone/server.js)
  const standalonePath = path.join(process.resourcesPath, 'standalone', 'server.js');
  if (fs.existsSync(standalonePath)) {
    return standalonePath;
  }

  // 2. Unpacked asar path fallback
  const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');
  if (fs.existsSync(unpackedPath)) {
    return unpackedPath;
  }

  // 3. Direct resources app path
  const appPath = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
  if (fs.existsSync(appPath)) {
    return appPath;
  }

  // 4. Fallback relative to __dirname
  const relativePath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  if (fs.existsSync(relativePath)) {
    return relativePath;
  }

  return null;
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    try {
      const serverPath = getServerPath();
      log(`Locating server script. Path: ${serverPath}`);

      if (!serverPath || !fs.existsSync(serverPath)) {
        const errMsg = `Standalone server.js not found at: ${serverPath}`;
        log(`[ERROR] ${errMsg}`);
        return reject(new Error(errMsg));
      }

      const serverDir = path.dirname(serverPath);
      const nodeModulesDir = path.join(serverDir, 'node_modules');

      const env = {
        ...process.env,
        PORT: String(port),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        NODE_PATH: nodeModulesDir,
      };

      log(`Spawning server process in cwd: ${serverDir} on port ${port}...`);
      log(`Node modules path: ${nodeModulesDir} (exists: ${fs.existsSync(nodeModulesDir)})`);

      serverProcess = fork(serverPath, [], {
        cwd: serverDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        windowsHide: true,
      });

      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (chunk) => {
          log(`[Server stdout] ${chunk.toString().trim()}`);
        });
      }

      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (chunk) => {
          log(`[Server stderr] ${chunk.toString().trim()}`);
        });
      }

      serverProcess.on('error', (err) => {
        log(`[Server Process Error]: ${err.message}`);
      });

      serverProcess.on('exit', (code, signal) => {
        log(`[Server Exited]: code=${code}, signal=${signal}`);
      });

      resolve();
    } catch (err) {
      log(`[Server Launch Exception]: ${err.message}`);
      reject(err);
    }
  });
}

function waitForServer(port, retries = 50, delayMs = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}/builder/default`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          log(`Server is responding (Status: ${res.statusCode}) after attempt ${attempts}`);
          resolve(true);
        } else {
          if (attempts >= retries) {
            resolve(false);
          } else {
            setTimeout(check, delayMs);
          }
        }
      });

      req.on('error', (err) => {
        if (attempts >= retries) {
          log(`Server health check timed out after ${attempts} attempts: ${err.message}`);
          resolve(false);
        } else {
          setTimeout(check, delayMs);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
      });
    };

    check();
  });
}

function getSplashHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Visual App Builder</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 30%, #1e1b4b 0%, #090d16 80%);
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
      user-select: none;
    }
    .container {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 480px;
      padding: 32px;
    }
    .logo-glow {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 35px rgba(99, 102, 241, 0.45);
      margin-bottom: 24px;
      animation: pulse 2.5s infinite ease-in-out;
    }
    .logo-glow svg {
      width: 38px;
      height: 38px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.2;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin-bottom: 16px;
    }
    .status-text {
      font-size: 12px;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(99, 102, 241, 0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 45px rgba(168, 85, 247, 0.6); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-glow">
      <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </div>
    <h1>Visual App Builder</h1>
    <p>Starting local high-performance workspace engine...</p>
    <div class="spinner"></div>
    <div class="status-text" id="status">Initializing Workspace Services</div>
  </div>
</body>
</html>`;
}

function getErrorHtml(errorMessage, logContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Startup Diagnostic - Visual App Builder</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      max-width: 650px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h2 {
      color: #ef4444;
      font-size: 20px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    pre {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 12px;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 12px;
      overflow-x: auto;
      max-height: 180px;
      white-space: pre-wrap;
      word-break: break-all;
      margin-bottom: 24px;
      font-family: Consolas, monospace;
    }
    .btn-group {
      display: flex;
      gap: 12px;
    }
    button {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #6366f1;
      color: white;
    }
    .btn-primary:hover { background: #4f46e5; }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
    }
    .btn-secondary:hover { background: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <h2>⚠️ Failed to Initialize Application Engine</h2>
    <p>Visual App Builder encountered an issue starting its local standalone server. Please inspect the log output below or click "Retry Launch".</p>
    <pre>${errorMessage || 'Unknown startup error'}\n\nLast Log Entries:\n${logContent || 'No logs recorded.'}</pre>
    <div class="btn-group">
      <button class="btn-primary" onclick="window.api.retry()">🔄 Retry Launch</button>
      <button class="btn-secondary" onclick="window.api.openLogs()">📁 Open Logs Folder</button>
    </div>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    window.api = {
      retry: () => ipcRenderer.send('retry-launch'),
      openLogs: () => ipcRenderer.send('open-logs')
    };
  </script>
</body>
</html>`;
}

async function launchApp() {
  try {
    currentPort = await findAvailablePort(3000);
    log(`Selected port: ${currentPort}`);

    // Load splash screen immediately
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`);
    }

    // Start background standalone server
    await startServer(currentPort);

    // Wait for server to become responsive
    const isReady = await waitForServer(currentPort, 60, 300);

    if (isReady) {
      log(`Server is ready! Loading builder on port ${currentPort}...`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(`http://127.0.0.1:${currentPort}/builder/default`);
      }
    } else {
      showErrorScreen('Server took too long to respond on port ' + currentPort);
    }
  } catch (err) {
    showErrorScreen(err.message);
  }
}

function showErrorScreen(errMsg) {
  log(`[CRITICAL] Showing Error Screen: ${errMsg}`);
  let lastLogs = '';
  try {
    if (fs.existsSync(serverLogPath)) {
      const logs = fs.readFileSync(serverLogPath, 'utf8');
      lastLogs = logs.split('\n').slice(-15).join('\n');
    }
  } catch (e) {}

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorHtml(errMsg, lastLogs))}`);
  }
}

async function createMainWindow() {
  serverLogPath = path.join(app.getPath('userData'), 'server.log');
  log(`Visual App Builder starting... Logs at: ${serverLogPath}`);

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
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // External links open in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await launchApp();
}

ipcMain.on('retry-launch', async () => {
  log('User requested retry...');
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
    serverProcess = null;
  }
  await launchApp();
});

ipcMain.on('open-logs', () => {
  shell.openPath(app.getPath('userData'));
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
  }
});
