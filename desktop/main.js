const { app, BrowserWindow, Menu, shell, dialog, session } = require('electron');
const path = require('path');

const APAS_URL = 'https://a-p-a-s.vercel.app';

let mainWindow;

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
    },
    autoHideMenuBar: false,
    show: false,
  });

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the production Vercel URL (always latest deployment)
  mainWindow.loadURL(APAS_URL);

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APAS_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APAS_URL) && !url.startsWith('https://a-p-a-s.vercel.app')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'APAS',
      submenu: [
        {
          label: 'الصفحة الرئيسية',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APAS_URL + '/home');
          },
        },
        {
          label: 'المحاكاة',
          click: () => {
            if (mainWindow) mainWindow.loadURL(APAS_URL + '/simulator');
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
                'AI Projectile Analysis System\n\nتطوير: مجاهد عبدالهادي و موفقي ابراهيم\nالمدرسة العليا للأساتذة بالأغواط\n\nالإصدار: 1.0.0\n\nيتم تحميل آخر التحديثات تلقائياً من الخادم.',
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
          click: () => {
            shell.openExternal('https://a-p-a-s.vercel.app');
          },
        },
        {
          label: 'GitHub',
          click: () => {
            shell.openExternal('https://github.com/PicaBis/APAS');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Content Security Policy — restrict what the renderer can load
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
          "connect-src 'self' https://a-p-a-s.vercel.app https://*.vercel.app https://api.openweathermap.org https://api.open-meteo.com;"
        ],
      },
    });
  });

  createMenu();
  createWindow();

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
