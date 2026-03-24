const { app, BrowserWindow, Menu, shell, dialog, session, Tray, nativeImage, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');

// URLs
const APAS_URL = 'https://a-p-a-s.vercel.app';
const CACHE_DIR = path.join(app.getPath('userData'), 'offline-cache');

let mainWindow;
let splashWindow;
let modeWindow;
let tray = null;
let currentMode = 'online';

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Check if internet is available
function checkOnline() {
  return new Promise((resolve) => {
    const request = net.request({ method: 'HEAD', url: APAS_URL });
    let resolved = false;
    request.on('response', () => {
      if (!resolved) { resolved = true; resolve(true); }
    });
    request.on('error', () => {
      if (!resolved) { resolved = true; resolve(false); }
    });
    setTimeout(() => {
      if (!resolved) { resolved = true; resolve(false); }
    }, 5000);
    request.end();
  });
}

// Cache the complete page (HTML + JS + CSS + images) for offline use
function cacheWebApp() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  ensureCacheDir();
  const savePath = path.join(CACHE_DIR, 'index.html');
  mainWindow.webContents.savePage(savePath, 'HTMLComplete').then(() => {
    console.log('[Cache] Full page saved successfully (HTML + assets)');
  }).catch((err) => {
    console.error('[Cache] Failed to save page:', err.message);
  });
}

// Navigate within the SPA
function navigateTo(route) {
  if (!mainWindow) return;
  if (currentMode === 'online') {
    mainWindow.loadURL(APAS_URL + route);
  } else {
    mainWindow.webContents.executeJavaScript(
      `window.history.pushState({}, '', '${route}'); window.dispatchEvent(new PopStateEvent('popstate'));`
    ).catch(() => {});
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 440,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

function createModeWindow() {
  modeWindow = new BrowserWindow({
    width: 680,
    height: 520,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  modeWindow.loadFile(path.join(__dirname, 'mode-select.html'));
  modeWindow.center();
}

function createWindow(mode) {
  currentMode = mode;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'APAS - \u0646\u0638\u0627\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: false,
    show: false,
    backgroundColor: '#0a0a2e',
    titleBarStyle: 'default',
  });

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 500);
  });

  if (mode === 'online') {
    mainWindow.loadURL(APAS_URL);
    // Cache for future offline use after page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        cacheWebApp();
      }, 3000); // Wait 3s for dynamic content to render
    });
  } else {
    // Offline mode: load cached version or show fallback
    const cachedPage = path.join(CACHE_DIR, 'index.html');
    if (fs.existsSync(cachedPage)) {
      mainWindow.loadFile(cachedPage);
    } else {
      mainWindow.loadFile(path.join(__dirname, 'offline-fallback.html'));
    }
  }

  // Handle load failures with a retry mechanism (online mode only)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`Failed to load: ${errorCode} - ${errorDescription}`);
    if (currentMode === 'online') {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(APAS_URL);
        }
      }, 3000);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APAS_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isApasUrl = url.startsWith(APAS_URL);
    const isLocalFile = url.startsWith('file://');
    if (!isApasUrl && !isLocalFile) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (tray && !app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '\u0641\u062a\u062d APAS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          navigateTo('/home');
        }
      },
    },
    {
      label: '\u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          navigateTo('/simulator');
        }
      },
    },
    { type: 'separator' },
    {
      label: '\u062e\u0631\u0648\u062c',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('APAS - \u0646\u0638\u0627\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'APAS',
      submenu: [
        {
          label: '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            if (mainWindow) navigateTo('/home');
          },
        },
        {
          label: '\u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => {
            if (mainWindow) navigateTo('/simulator');
          },
        },
        { type: 'separator' },
        {
          label: '\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: '\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644 \u0643\u0627\u0645\u0644',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          },
        },
        { type: 'separator' },
        {
          label: '\u062a\u0628\u062f\u064a\u0644 \u0627\u0644\u0648\u0636\u0639 (Online/Offline)',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            if (mainWindow) {
              mainWindow.destroy();
              mainWindow = null;
              createModeWindow();
            }
          },
        },
        { type: 'separator' },
        {
          label: '\u062d\u0648\u0644 APAS',
          click: () => {
            const parentWin = mainWindow || modeWindow;
            if (parentWin) {
              dialog.showMessageBox(parentWin, {
                type: 'info',
                title: '\u062d\u0648\u0644 APAS',
                message: 'APAS - \u0646\u0638\u0627\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u0627\u062a \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
                detail:
                  'AI Projectile Analysis System\n\n\u0627\u0644\u0625\u0635\u062f\u0627\u0631: ' + app.getVersion() + '\n\n\u062a\u0637\u0648\u064a\u0631: \u0645\u062c\u0627\u0647\u062f \u0639\u0628\u062f\u0627\u0644\u0647\u0627\u062f\u064a \u0648 \u0645\u0648\u0641\u0642\u064a \u0627\u0628\u0631\u0627\u0647\u064a\u0645\n\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u064a\u0627 \u0644\u0644\u0623\u0633\u0627\u062a\u0630\u0629 \u0628\u0627\u0644\u0623\u063a\u0648\u0627\u0637',
                icon: nativeImage.createFromPath(path.join(__dirname, 'icon.png')),
              });
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: '\u062e\u0631\u0648\u062c' },
      ],
    },
    {
      label: '\u062a\u0639\u062f\u064a\u0644',
      submenu: [
        { role: 'undo', label: '\u062a\u0631\u0627\u062c\u0639' },
        { role: 'redo', label: '\u0625\u0639\u0627\u062f\u0629' },
        { type: 'separator' },
        { role: 'cut', label: '\u0642\u0635' },
        { role: 'copy', label: '\u0646\u0633\u062e' },
        { role: 'paste', label: '\u0644\u0635\u0642' },
        { role: 'selectAll', label: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0644' },
      ],
    },
    {
      label: '\u0639\u0631\u0636',
      submenu: [
        { role: 'zoomIn', label: '\u062a\u0643\u0628\u064a\u0631' },
        { role: 'zoomOut', label: '\u062a\u0635\u063a\u064a\u0631' },
        { role: 'resetZoom', label: '\u062d\u062c\u0645 \u0627\u0641\u062a\u0631\u0627\u0636\u064a' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '\u0634\u0627\u0634\u0629 \u0643\u0627\u0645\u0644\u0629' },
      ],
    },
    {
      label: '\u0645\u0633\u0627\u0639\u062f\u0629',
      submenu: [
        {
          label: '\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0631\u0633\u0645\u064a',
          click: () => shell.openExternal('https://a-p-a-s.vercel.app'),
        },
        {
          label: 'GitHub',
          click: () => shell.openExternal('https://github.com/PicaBis/APAS'),
        },
        { type: 'separator' },
        {
          label: '\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0645\u0637\u0648\u0631',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for mode selection
ipcMain.on('select-mode', (_event, mode) => {
  if (modeWindow && !modeWindow.isDestroyed()) {
    modeWindow.close();
    modeWindow = null;
  }
  createWindow(mode);
});

ipcMain.handle('check-online', async () => {
  return await checkOnline();
});

ipcMain.handle('check-cache', () => {
  const cachedPage = path.join(CACHE_DIR, 'index.html');
  const cachedFiles = path.join(CACHE_DIR, 'index_files');
  // Check for both the HTML and the assets directory (created by savePage)
  return fs.existsSync(cachedPage) && fs.existsSync(cachedFiles);
});

ipcMain.on('close-mode-window', () => {
  if (modeWindow && !modeWindow.isDestroyed()) {
    modeWindow.close();
    modeWindow = null;
  }
  app.isQuiting = true;
  app.quit();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (modeWindow) {
      if (modeWindow.isMinimized()) modeWindow.restore();
      modeWindow.show();
      modeWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Permissive CSP for hosted app — skip for local file:// URLs (offline mode)
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      if (details.url.startsWith('file://')) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' https://a-p-a-s.vercel.app https://*.vercel.app https://*.supabase.co https://*.supabase.in; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://a-p-a-s.vercel.app https://*.vercel.app https://*.supabase.co; " +
        "style-src 'self' 'unsafe-inline' https: data:; " +
        "font-src 'self' https: data:; " +
        "img-src 'self' data: blob: https:; " +
        "connect-src 'self' https: wss:; " +
        "worker-src 'self' blob:;"
      ];
      callback({ responseHeaders });
    });

    createSplashWindow();
    createMenu();
    createTray();

    // After splash animation completes, show mode selection
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      createModeWindow();
    }, 4000);

    app.on('activate', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else if (modeWindow) {
        modeWindow.show();
        modeWindow.focus();
      } else if (BrowserWindow.getAllWindows().length === 0) {
        createModeWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    app.isQuiting = true;
  });
}
