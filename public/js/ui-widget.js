// ui-widget.js - Controles de ventana para Electron (Cerrar, Minimizar, Arrastrar y Redimensionar)
document.addEventListener('DOMContentLoaded', () => {
  const winCloseBtn = document.getElementById('win-close-btn');
  const winMinimizeBtn = document.getElementById('win-minimize-btn');

  if (winCloseBtn) {
    winCloseBtn.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.close) {
        window.electronAPI.close();
      }
    });
  }

  if (winMinimizeBtn) {
    winMinimizeBtn.addEventListener('click', () => {
      if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
      }
    });
  }
});
