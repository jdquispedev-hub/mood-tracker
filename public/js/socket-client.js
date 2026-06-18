// socket-client.js - Inicialización de WebSocket y listeners de conexión
const socket = io();

socket.on('connect', () => {
  console.log('[Socket] Conectado exitosamente al servidor central de Pitufo Moods.');
});

socket.on('disconnect', () => {
  console.warn('[Socket] Desconectado del servidor. Intentando reconectar...');
});
