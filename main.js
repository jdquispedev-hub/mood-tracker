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
    win.setSize(width, height);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 340,
    height: 600,
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

  // Conectarse a la IP configurada
  const targetUrl = `http://${config.serverIp}:3030/?platform=electron`;
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
