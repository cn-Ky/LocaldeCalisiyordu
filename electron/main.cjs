// Localde Çalışıyordu — Electron ana süreç dosyası
//
// Bu dosya uygulamayı gerçek bir masaüstü uygulamasına dönüştürür:
//  - Geliştirmede (electron:dev): Vite dev sunucusuna bağlanır, backend
//    ayrı bir süreçte (npm run dev --prefix backend) zaten çalışır.
//  - Paketlenmiş sürümde (dist): Express backend'i doğrudan bu ana süreç
//    içinde başlatır (ekstra bir Node süreci gerekmez), veritabanını
//    kullanıcının işletim sistemi tarafından ayrılan kalıcı klasöre yazar
//    ve arayüzü yerel dosyadan (file://) yükler.
'use strict';

const { app, BrowserWindow, Menu, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || 'http://localhost:5173';

let mainWindow = null;
let backendServer = null;

// Tek örnek kilidi: veritabanına (SQLite/WAL) aynı anda iki süreç birden
// yazmasın diye ikinci başlatma girişimi mevcut pencereyi öne getirir.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap).catch((err) => {
    console.error('Başlatma hatası:', err);
    app.quit();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) bootstrap();
  });

  app.on('before-quit', () => {
    if (backendServer) {
      try { backendServer.close(); } catch { /* yoksay */ }
    }
  });
}

async function bootstrap() {
  let port = 4000;

  if (!isDev) {
    port = await findFreePort();
    await startEmbeddedBackend(port);
  }

  await createWindow(port);
}

// Rastgele boş bir TCP portu bulur (backend'i ona bağlamak için).
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// İlk çalıştırmada kalıcı bir JWT gizli anahtarı üretir; sonraki
// açılışlarda aynı dosyadan okuyarak oturumların korunmasını sağlar.
function getOrCreateJwtSecret() {
  const secretPath = path.join(app.getPath('userData'), 'jwt.secret');
  try {
    return fs.readFileSync(secretPath, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
    return secret;
  }
}

async function startEmbeddedBackend(port) {
  process.env.PORT = String(port);
  process.env.HOST = '127.0.0.1';
  process.env.LC_DB_PATH = path.join(app.getPath('userData'), 'data.sqlite');
  process.env.JWT_SECRET = getOrCreateJwtSecret();
  process.env.NODE_ENV = 'production';

  // Paketlenmiş uygulamada backend, `files` listesiyle kaynak klasörünün
  // yanına kopyalanır (bkz. package.json > build.files). ASAR devre dışı
  // bırakıldığı için ESM dynamic import sorunsuz çalışır.
  const serverPath = path.join(process.resourcesPath, 'app', 'backend', 'server.js');
  const fallbackPath = path.join(__dirname, '..', 'backend', 'server.js');
  const target = fs.existsSync(serverPath) ? serverPath : fallbackPath;

  const mod = await import(pathToFileURL(target).href);
  backendServer = mod.default;
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 460,
    minHeight: 520,
    show: false,
    backgroundColor: '#0b0c14',
    autoHideMenuBar: true,
    title: 'Localde Çalışıyordu',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  setAppMenu();

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized-changed', false));

  // Uygulama dışına giden bağlantıları varsayılan tarayıcıda aç, uygulama
  // içinde yeni pencere/sekme açılmasına izin verme.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAppUrl = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!isAppUrl) {
      event.preventDefault();
      if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    }
  });

  if (isDev) {
    await mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath, { search: `port=${port}` });
  }
}

function setAppMenu() {
  if (process.platform === 'darwin') {
    const template = [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    // Windows/Linux'ta uygulamanın kendi sahte "masaüstü" arayüzü zaten bir
    // görev çubuğu/başlat menüsü sunduğundan, işletim sisteminin menü
    // çubuğu gizlenir (Alt tuşuyla geçici olarak gösterilebilir).
    Menu.setApplicationMenu(null);
  }
}

// ---- Renderer'dan gelen IPC istekleri ----

ipcMain.on('window:minimize', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize();
});

ipcMain.on('window:maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on('window:close', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close();
});

ipcMain.on('app:notify', (_e, payload) => {
  const { title, body } = payload || {};
  if (!title || !Notification.isSupported()) return;
  new Notification({ title, body: body || '' }).show();
});

ipcMain.on('app:set-badge', (_e, count) => {
  try { app.setBadgeCount(typeof count === 'number' && count > 0 ? count : 0); } catch { /* platform desteklemiyor */ }
});
