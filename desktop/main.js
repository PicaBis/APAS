const { app, BrowserWindow, Menu, shell, dialog, session, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Determine if we're running in development or production
const isDev = !app.isPackaged;

// URLs
const APAS_URL = 'https://a-p-a-s.vercel.app';

let mainWindow;
let splashWindow;
let tray = null;

// Get the path to the built web app
function getAppPath() {
  if (isDev) {
    const devDistPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(devDistPath)) {
      return devDistPath;
    }
    return null;
  }
  const prodPath = path.join(process.resourcesPath, 'app');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  return null;
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
      mainWindow.show();
      mainWindow.focus();
    }, 2000);
  });

  // Try to load local files first, fall back to URL
  const appPath = getAppPath();
  if (appPath && fs.existsSync(path.join(appPath, 'index.html'))) {
    mainWindow.loadFile(path.join(appPath, 'index.html'));
  } else {
    mainWindow.loadURL(APAS_URL);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APAS_URL) && !url.startsWith('file://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APAS_URL) && !url.startsWith('file://') && !url.startsWith('https://a-p-a-s.vercel.app')) {
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
          const appPath = getAppPath();
          if (appPath) {
            mainWindow.loadFile(path.join(appPath, 'index.html'));
          } else {
            mainWindow.loadURL(APAS_URL + '/home');
          }
        }
      },
    },
    {
      label: 'المحاكاة',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          const appPath = getAppPath();
          if (appPath) {
            mainWindow.loadFile(path.join(appPath, 'index.html'), { hash: '/simulator' });
          } else {
            mainWindow.loadURL(APAS_URL + '/simulator');
          }
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
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              const appPath = getAppPath();
              if (appPath) {
                mainWindow.loadFile(path.join(appPath, 'index.html'));
              } else {
                mainWindow.loadURL(APAS_URL + '/home');
              }
            }
          },
        },
        {
          label: 'المحاكاة',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow) {
              const appPath = getAppPath();
              if (appPath) {
                mainWindow.loadFile(path.join(appPath, 'index.html'), { hash: '/simulator' });
              } else {
                mainWindow.loadURL(APAS_URL + '/simulator');
              }
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
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' https://a-p-a-s.vercel.app https://*.vercel.app; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://a-p-a-s.vercel.app https://*.vercel.app; " +
            "style-src 'self' 'unsafe-inline' https://a-p-a-s.vercel.app https://*.vercel.app https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: blob: https:; " +
            "connect-src 'self' https://a-p-a-s.vercel.app https://*.vercel.app https://*.supabase.co https://api.openweathermap.org https://api.open-meteo.com wss://*.supabase.co;"
          ],
        },
      });
    });

    createSplashWindow();
    createMenu();
    createTray();

    setTimeout(() => {
      createWindow();
    }, 1500);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
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
