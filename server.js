const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 10 * 1024 * 1024 // Permitir payloads de hasta 10MB (Imágenes/Gifs)
});

const PORT = process.env.PORT || 3030;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estado en memoria de los usuarios activos
// Estructura: { socketId: { name, mood, avatar, updatedTime } }
const activeUsers = {};

// --- PERSISTENCIA DE CHAT Y TAREAS ---
const fs = require('fs');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const TASKS_FILE = path.join(__dirname, 'tasks.json');
const COMPLETED_TASKS_FILE = path.join(__dirname, 'completed_tasks.json');

let messages = [];
let tasks = [];
let completedTasks = [];

// Cargar datos al iniciar
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error cargando mensajes:', err);
}

try {
  if (fs.existsSync(TASKS_FILE)) {
    tasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error cargando tareas:', err);
}

try {
  if (fs.existsSync(COMPLETED_TASKS_FILE)) {
    completedTasks = JSON.parse(fs.readFileSync(COMPLETED_TASKS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error cargando tareas completadas:', err);
}

function pruneOldMessages() {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  const initialLength = messages.length;
  messages = messages.filter(msg => {
    const ts = msg.timestamp || (msg.id ? parseInt(msg.id.split('-')[0]) : Date.now());
    return ts >= twentyFourHoursAgo;
  });
  if (messages.length !== initialLength) {
    saveMessages();
  }
}

// Prune immediately on start
pruneOldMessages();

// Prune every 5 minutes
setInterval(pruneOldMessages, 5 * 60 * 1000);

function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando mensajes:', err);
  }
}

function saveTasks() {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando tareas:', err);
  }
}

function saveCompletedTasks() {
  try {
    fs.writeFileSync(COMPLETED_TASKS_FILE, JSON.stringify(completedTasks, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando tareas completadas:', err);
  }
}

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

    // Prune before sending initial messages
    pruneOldMessages();
    // Enviar mensajes, tareas y tareas completadas existentes al usuario que entra
    socket.emit('init-data', { messages, tasks, completedTasks });
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

  // --- EVENTOS DEL CHAT ---
  socket.on('send-chat-message', (msgText) => {
    const user = activeUsers[socket.id];
    if (user) {
      const newMsg = {
        id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
        sender: user.name,
        avatar: user.avatar,
        text: msgText,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      messages.push(newMsg);
      pruneOldMessages();
      saveMessages();
      io.emit('new-chat-message', newMsg);
    }
  });

  // --- EVENTOS DE TAREAS ---
  socket.on('create-task', (taskData) => {
    const user = activeUsers[socket.id];
    if (user) {
      const newTask = {
        id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
        title: taskData.title,
        description: taskData.description || '',
        assignedTo: taskData.assignedTo || 'Todos',
        priority: taskData.priority || 'Media',
        creator: user.name,
        status: 'pending', // pending, completed
        createdTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdTimestamp: Date.now(),
        completedTimestamp: null
      };
      tasks.push(newTask);
      saveTasks();
      io.emit('task-created', newTask);
    }
  });

  socket.on('update-task-status', (taskUpdate) => {
    const task = tasks.find(t => t.id === taskUpdate.id);
    if (task) {
      task.status = taskUpdate.status;
      if (task.status === 'completed') {
        task.completedTimestamp = Date.now();
        task.completedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        task.completedTimestamp = null;
        task.completedTime = '';
      }
      saveTasks();
      io.emit('task-updated', task);
    }
  });

  socket.on('delete-task', (taskId) => {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    io.emit('task-deleted', taskId);
  });

  socket.on('take-task', (taskId) => {
    const user = activeUsers[socket.id];
    if (user) {
      const task = tasks.find(t => t.id === taskId);
      if (task && (task.assignedTo === 'Todos' || !task.assignedTo || task.assignedTo === 'Sin asignar')) {
        task.assignedTo = user.name;
        saveTasks();
        io.emit('task-updated', task);
      }
    }
  });

  socket.on('send-buzz', (targetSocketId) => {
    const sender = activeUsers[socket.id];
    if (sender && targetSocketId) {
      io.to(targetSocketId).emit('receive-buzz', { senderName: sender.name });
      console.log(`Zumbido enviado de ${sender.name} a socket ${targetSocketId}`);
    }
  });

  socket.on('clear-task-history', () => {
    completedTasks = [];
    saveCompletedTasks();
    io.emit('task-history-cleared');
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
