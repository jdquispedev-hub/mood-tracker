const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estado en memoria de los usuarios activos
// Estructura: { socketId: { name, mood, avatar, updatedTime } }
const activeUsers = {};

io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Cuando un usuario ingresa / actualiza su perfil inicial
  socket.on('user-join', (userData) => {
    activeUsers[socket.id] = {
      id: socket.id,
      name: userData.name || 'Invitado',
      avatar: userData.avatar || 'standard',
      customStatus: userData.customStatus || '',
      statusImage: userData.statusImage || '',
      updatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Enviar la lista de todos los usuarios a todos
    io.emit('update-users', Object.values(activeUsers));
    console.log(`Usuario registrado: ${activeUsers[socket.id].name}`);
  });

  // Cuando un usuario cambia su estado o ingresa texto libre/imagen de estado
  socket.on('update-mood', (moodData) => {
    if (activeUsers[socket.id]) {
      const oldStatus = activeUsers[socket.id].customStatus;
      if (moodData.customStatus !== undefined) activeUsers[socket.id].customStatus = moodData.customStatus;
      if (moodData.statusImage !== undefined) activeUsers[socket.id].statusImage = moodData.statusImage;
      
      activeUsers[socket.id].updatedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Enviar la lista actualizada a todos
      io.emit('update-users', Object.values(activeUsers));
      
      // Enviar un evento de notificación si cambió el texto
      if (moodData.customStatus !== undefined && moodData.customStatus !== oldStatus) {
        socket.broadcast.emit('status-notification', {
          name: activeUsers[socket.id].name,
          customStatus: activeUsers[socket.id].customStatus,
          avatar: activeUsers[socket.id].avatar,
          statusImage: activeUsers[socket.id].statusImage
        });
      }
      
      console.log(`${activeUsers[socket.id].name} actualizó su estado: "${activeUsers[socket.id].customStatus}"`);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    if (activeUsers[socket.id]) {
      console.log(`Usuario desconectado: ${activeUsers[socket.id].name}`);
      delete activeUsers[socket.id];
      io.emit('update-users', Object.values(activeUsers));
    }
  });
});

// Escuchar en todas las interfaces de red para permitir acceso local en la oficina
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(` Servidor de Pitufo Moods ejecutándose en:`);
  console.log(` Local:            http://localhost:${PORT}`);
  console.log(` Red de la Oficina: http://<tu-ip-local>:${PORT}`);
  console.log(`===================================================`);
});
