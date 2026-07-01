const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuración por defecto
let config = {
  serverIp: 'localhost',
  isServer: true
};

// Leer archivo de configuración si existe
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error leyendo config.json:', err);
  }
} else {
  // Crear archivo por defecto si no existe
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// Iniciar el servidor local de Express solo si es servidor central
if (config.isServer) {
  require('./server.js');
}

// Handlers de control de ventana desde el Frontend
ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-resize', (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    console.log(`[IPC] Redimensionando ventana a: ${width}x${height}`);
    win.setSize(width, height);
    win.setBounds({ width, height });
    
    // Forzar a macOS a recalcular la sombra de la ventana transparente
    if (process.platform === 'darwin') {
      win.invalidateShadow();
    }
  }
});

ipcMain.on('window-move', (event, { deltaX, deltaY }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const [x, y] = win.getPosition();
    win.setPosition(x + deltaX, y + deltaY);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 340,
    height: 600,
    minWidth: 50,             // Permitir encoger el ancho para el widget mini
    minHeight: 50,            // Permitir encoger el alto para el widget mini
    frame: false,             // Sin bordes de ventana de OS
    transparent: true,        // Permitir transparencia en CSS
    alwaysOnTop: true,        // Flota por encima de otras apps
    resizable: true,          // Permitir redimensionar
    hasShadow: true,          // Sombra en Mac
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Hacer que la ventana aparezca en todos los escritorios virtuales (Spaces) de macOS
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Si esta máquina es el servidor central, cargamos desde localhost para saltarnos firewalls locales.
  // Si es un cliente, cargamos desde la IP del servidor central configurado.
  const host = config.isServer ? 'localhost' : config.serverIp;
  const targetUrl = `http://${host}:3030/?platform=electron`;
  console.log(`Cargando URL: ${targetUrl}`);

  // Controlar fallas de carga (si la IP no responde o el puerto está ocupado)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Error al cargar: ${validatedURL} -> ${errorDescription} (${errorCode})`);
    
    // Si falló cargando la IP principal y no es localhost, reintentar con localhost
    if (validatedURL.includes(config.serverIp) && config.serverIp !== 'localhost') {
      console.log('Fallo de conexión central. Intentando localmente en localhost:3030...');
      win.loadURL(`http://localhost:3030/?platform=electron`);
    } else {
      // Cargar página de error local para evitar que la ventana transparente quede invisible
      const errorPage = path.join(__dirname, 'public', 'fallback-error.html');
      win.loadFile(errorPage, { query: { ip: config.serverIp } });
    }
  });

  win.loadURL(targetUrl);
}

// macOS a veces requiere este permiso para transparencias
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  // Esperar un pequeño lapso para que Express inicie
  setTimeout(createWindow, 500);
  
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
