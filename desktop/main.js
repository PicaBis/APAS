const { app, BrowserWindow, Menu, shell, dialog, session, Tray, nativeImage } = require('electron');
const path = require('path');

// URLs
const APAS_URL = 'https://a-p-a-s.vercel.app';

let mainWindow;
let splashWindow;
let tray = null;

// Navigate within the SPA by loading the Vercel URL with the given route
function navigateTo(route) {
  if (!mainWindow) return;
  mainWindow.loadURL(APAS_URL + route);
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 380,
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'APAS - نظام تحليل المقذوفات بالذكاء الاصطناعي',
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
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 2000);
  });

  // Load the web app from the hosted URL
  mainWindow.loadURL(APAS_URL);

  // Handle load failures with a retry mechanism
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(`Failed to load: ${errorCode} - ${errorDescription}`);
    // Retry after 3 seconds
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(APAS_URL);
      }
    }, 3000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APAS_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APAS_URL)) {
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
      label: 'فتح APAS',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'الصفحة الرئيسية',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          navigateTo('/home');
        }
      },
    },
    {
      label: 'المحاكاة',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          navigateTo('/simulator');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'خروج',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('APAS - نظام تحليل المقذوفات');
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
          label: 'الصفحة الرئيسية',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => {
            if (mainWindow) {
              navigateTo('/home');
            }
          },
        },
        {
          label: 'المحاكاة',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => {
            if (mainWindow) {
              navigateTo('/simulator');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'تحديث الصفحة',
          accelerator: 'F5',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: 'إعادة تحميل كامل',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          },
        },
        { type: 'separator' },
        {
          label: 'حول APAS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول APAS',
              message: 'APAS - نظام تحليل المقذوفات بالذكاء الاصطناعي',
              detail:
                'AI Projectile Analysis System\n\nالإصدار: ' + app.getVersion() + '\n\nتطوير: مجاهد عبدالهادي و موفقي ابراهيم\nالمدرسة العليا للأساتذة بالأغواط',
              icon: nativeImage.createFromPath(path.join(__dirname, 'icon.png')),
            });
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'خروج' },
      ],
    },
    {
      label: 'تعديل',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'zoomIn', label: 'تكبير' },
        { role: 'zoomOut', label: 'تصغير' },
        { role: 'resetZoom', label: 'حجم افتراضي' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'شاشة كاملة' },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'الموقع الرسمي',
          click: () => shell.openExternal('https://a-p-a-s.vercel.app'),
        },
        {
          label: 'GitHub',
          click: () => shell.openExternal('https://github.com/PicaBis/APAS'),
        },
        { type: 'separator' },
        {
          label: 'أدوات المطور',
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
    }
  });

  app.whenReady().then(() => {
    // Replace CSP with a permissive policy that allows the hosted app to load
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self' https://a-p-a-s.vercel.app https://*.vercel.app; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://a-p-a-s.vercel.app https://*.vercel.app; " +
        "style-src 'self' 'unsafe-inline' https: data:; " +
        "font-src 'self' https: data:; " +
        "img-src 'self' data: blob: https:; " +
        "connect-src 'self' https: wss:;"
      ];
      callback({ responseHeaders });
    });

    createSplashWindow();
    createMenu();
    createTray();

    setTimeout(() => {
      createWindow();
    }, 1500);

    app.on('activate', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
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
