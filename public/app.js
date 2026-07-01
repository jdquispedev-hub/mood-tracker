document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  
  // Elementos del DOM
  const loginScreen = document.getElementById('login-screen');
  const mainInterface = document.getElementById('main-interface');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const currentUsernameDisplay = document.getElementById('current-username-display');
  const currentUserBadge = document.getElementById('current-user-badge');
  const teamGrid = document.getElementById('team-grid');
  const userCount = document.getElementById('user-count');
  const moodButtons = document.querySelectorAll('.mood-btn');
  const toggleWidgetBtn = document.getElementById('toggle-widget-mode');
  const logoutBtn = document.getElementById('logout-btn');
  const toastContainer = document.getElementById('toast-container');
  
  // Elementos para Controles de Ventana
  const winCloseBtn = document.getElementById('win-close-btn');
  const winMinimizeBtn = document.getElementById('win-minimize-btn');
  
  // Elementos del Estado Personalizado y Modo Mini
  const customStatusInput = document.getElementById('custom-status-input');
  const toggleMiniBtn = document.getElementById('toggle-mini-mode');
  const widgetMiniContent = document.getElementById('widget-mini-content');
  const miniStatusImage = document.getElementById('mini-status-image');
  const miniStatusName = document.getElementById('mini-status-name');
  const miniStatusText = document.getElementById('mini-status-text');
  const miniExpandBtn = document.getElementById('mini-expand-btn');

  // Elementos para Carga de Imagen de Estado
  const statusImageUpload = document.getElementById('status-image-upload');
  const statusImageContainer = document.getElementById('status-image-container');
  const statusImagePlaceholder = document.getElementById('status-image-placeholder');
  const statusImagePreview = document.getElementById('status-image-preview');

  // Elementos de Login Admin (Danna) y Foto Personalizada
  const passwordGroup = document.getElementById('password-group');
  const passwordInput = document.getElementById('password');
  const avatarUploadInput = document.getElementById('avatar-upload');
  const uploadTriggerBtn = document.getElementById('upload-trigger-btn');
  const uploadStatus = document.getElementById('upload-status');
  const stickersGallery = document.getElementById('stickers-gallery');
  
  // Lista de Stickers Reales en la carpeta public/stickers
  const PRESET_STICKERS = [
    { id: 'feliz', file: 'feliz.png', label: 'Feliz' },
    { id: 'estresado', file: 'estresado.jpg', label: 'Estresado' },
    { id: 'grunon', file: 'grunon.jpg', label: 'Gruñón' },
    { id: 'triste', file: 'triste.jpg', label: 'Triste' },
    { id: 'concentrado', file: 'concentrado.png', label: 'Concentrado' },
    { id: 'dormilon', file: 'Dormilon.jpeg', label: 'Dormilón' },
    { id: 'chambeador', file: 'chambeador.jpg', label: 'Chambeador' },
    { id: 'bromista', file: 'bromista.jpg', label: 'Bromista' },
    { id: 'ensenador', file: 'ensenador.jpg', label: 'Enseñador' },
    { id: 'fortachon', file: 'fortachon.jpg', label: 'Fortachón' },
    { id: 'friolento', file: 'friolento.jpg', label: 'Friolento' },
    { id: 'miedoso', file: 'miedoso.jpg', label: 'Miedoso' }
  ];

  let uploadedAvatarBase64 = null;
  let uploadedStatusImageBase64 = null;
  let currentUser = null;

  // Detectar plataforma Electron
  const urlParams = new URLSearchParams(window.location.search);
  const isElectron = urlParams.get('platform') === 'electron';

  if (isElectron) {
    document.body.classList.add('electron');
    document.body.classList.add('widget-mode');
    toggleWidgetBtn.textContent = 'Ver Dashboard Completo';
    winCloseBtn.classList.remove('hidden');
    winMinimizeBtn.classList.remove('hidden');
    
    // Configurar acciones de ventana nativas
    winCloseBtn.addEventListener('click', () => {
      if (window.electronAPI) window.electronAPI.close();
    });
    
    winMinimizeBtn.addEventListener('click', () => {
      if (window.electronAPI) window.electronAPI.minimize();
    });
  } else {
    // Ocultar botones de control si no es Electron (navegador estándar)
    winCloseBtn.classList.add('hidden');
    winMinimizeBtn.classList.add('hidden');
    toggleMiniBtn.classList.add('hidden');
  }

  // Renderizar galería de stickers prediseñados
  if (stickersGallery) {
    stickersGallery.innerHTML = '';
    PRESET_STICKERS.forEach(sticker => {
      // Contenedor del sticker
      const wrapper = document.createElement('div');
      wrapper.className = 'sticker-item-wrapper';
      wrapper.dataset.file = sticker.file;
      wrapper.dataset.label = sticker.label;
      wrapper.title = sticker.label;

      const img = document.createElement('img');
      img.src = `stickers/${sticker.file}`;
      img.className = 'sticker-img';
      
      const span = document.createElement('span');
      span.className = 'sticker-label';
      span.textContent = sticker.label;
      
      // Fallback a imagen por defecto (logo) si no existe en la carpeta stickers
      img.onerror = () => {
        img.src = '/icon.png';
      };
      
      wrapper.appendChild(img);
      wrapper.appendChild(span);
      
      wrapper.addEventListener('click', () => {
        // Remover clase seleccionada de los otros wrappers
        document.querySelectorAll('.sticker-item-wrapper').forEach(el => el.classList.remove('selected'));
        wrapper.classList.add('selected');
        
        // Asignar como imagen de estado
        const path = `stickers/${sticker.file}`;
        uploadedStatusImageBase64 = path;
        
        statusImagePreview.src = path;
        statusImagePreview.classList.remove('hidden');
        statusImagePlaceholder.classList.add('hidden');
        
        // Forzar actualización del texto de estado con el nombre del sticker
        if (customStatusInput) {
          customStatusInput.value = sticker.label;
        }
        
        if (currentUser) {
          currentUser.statusImage = path;
          currentUser.customStatus = sticker.label;
          localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
          
          socket.emit('update-mood', { 
            statusImage: path,
            customStatus: sticker.label
          });
          updateMiniView();
        }
      });
      
      stickersGallery.appendChild(wrapper);
    });
  }

  // Mostrar contraseña si es admin (Danna)
  usernameInput.addEventListener('input', () => {
    const name = usernameInput.value.trim().toLowerCase();
    if (name === 'danna') {
      passwordGroup.classList.remove('hidden');
      passwordInput.required = true;
    } else {
      passwordGroup.classList.add('hidden');
      passwordInput.required = false;
      passwordInput.value = '';
    }
  });

  // Escuchar botón de carga de imagen personalizada
  if (uploadTriggerBtn) {
    uploadTriggerBtn.addEventListener('click', () => {
      avatarUploadInput.click();
    });
  }

  if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert('La imagen es demasiado grande. Por favor sube una de menos de 10MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedAvatarBase64 = event.target.result;
          uploadStatus.textContent = '📷 ¡Foto cargada con éxito!';
          uploadStatus.style.color = '#10b981';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Evento Login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    
    // Validar contraseña si es Danna
    if (name.toLowerCase() === 'danna') {
      if (passwordInput.value !== '123456') {
        alert('Contraseña incorrecta para el administrador Danna.');
        return;
      }
    }
    
    // Obtener avatar (la imagen subida o el pitufo de radio button)
    const avatar = uploadedAvatarBase64 || document.querySelector('input[name="initial-avatar"]:checked').value;
    
    currentUser = { 
      name, 
      avatar, 
      mood: 'feliz', 
      customStatus: '',
      role: name.toLowerCase() === 'danna' ? 'admin' : 'user'
    };
    localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
    enterWorkspace(currentUser);
  });

  function enterWorkspace(user) {
    loginScreen.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    
    // Configurar cabecera de perfil
    currentUsernameDisplay.textContent = user.name;
    currentUserBadge.innerHTML = getAvatarElement(user.avatar);
    
    // Rellenar estado personalizado si existe
    if (customStatusInput) {
      customStatusInput.value = user.customStatus || '';
    }

    // Mostrar imagen de estado si ya existe
    if (user.statusImage) {
      statusImagePreview.src = user.statusImage;
      statusImagePreview.classList.remove('hidden');
      statusImagePlaceholder.classList.add('hidden');
      uploadedStatusImageBase64 = user.statusImage;

      // Seleccionar sticker activo en la galería si coincide
      if (user.statusImage.startsWith('stickers/')) {
        const fileName = user.statusImage.split('/')[1];
        const stickerImg = document.querySelector(`.sticker-item-wrapper[data-file="${fileName}"]`);
        if (stickerImg) {
          stickerImg.classList.add('selected');
        }
      }
    } else {
      statusImagePreview.src = '';
      statusImagePreview.classList.add('hidden');
      statusImagePlaceholder.classList.remove('hidden');
      uploadedStatusImageBase64 = null;
    }
    
    // Unirse al WebSocket
    socket.emit('user-join', user);
    
    // Actualizar vista miniatura
    updateMiniView();

    // Resume Focus Session if still active
    if (user.focusEnd && user.focusEnd > Date.now()) {
      const remaining = user.focusEnd - Date.now();
      startFocusSession(remaining);
    }

    // Solicitar permiso de notificaciones de escritorio
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Mostrar sección de historial si es Admin (Danna)
    const historySection = document.getElementById('tasks-history-section');
    if (historySection) {
      if (user.role === 'admin') {
        historySection.classList.remove('hidden');
      } else {
        historySection.classList.add('hidden');
      }
    }
  }

  // Mapear avatars a emojis o etiqueta img si es personalizado
  function getAvatarElement(avatarData) {
    if (avatarData && avatarData.startsWith('data:image')) {
      return `<img src="${avatarData}" class="avatar-img" alt="Avatar">`;
    }
    switch (avatarData) {
      case 'pitufina': return '👱‍♀️';
      case 'papa-pitufo': return '🎅';
      default: return '🔵';
    }
  }

  // Mapear moods a emojis de pitufos estilizados
  const moodMap = {
    feliz: { emoji: '🔵😊', label: 'Pitufo Feliz', desc: 'A buen ritmo / Disponible' },
    concentrado: { emoji: '🔵🧠', label: 'Pitufo Filósofo', desc: 'Concentrado / Pensando' },
    estresado: { emoji: '🔵😠', label: 'Pitufo Gruñón', desc: 'Estresado / No molestar' },
    cansado: { emoji: '🔵😴', label: 'Pitufo Dormilón', desc: 'Cansado / Con sueño' },
    energia: { emoji: '🔵💪', label: 'Pitufo Fortachón', desc: 'A tope de energía' },
    social: { emoji: '🔵🎉', label: 'Pitufo Bromista', desc: 'Listo para conversar / jugar' }
  };

  // Función para actualizar la vista reducida del mini widget
  function updateMiniView() {
    if (!currentUser) return;
    
    // Obtener la imagen de estado (si no hay, usar avatar si es imagen, o /icon.png como fallback)
    let statusImgSrc = '/icon.png';
    if (currentUser.statusImage) {
      statusImgSrc = currentUser.statusImage;
    } else if (currentUser.avatar && currentUser.avatar.startsWith('data:image')) {
      statusImgSrc = currentUser.avatar;
    }
    
    if (miniStatusImage) {
      miniStatusImage.src = statusImgSrc;
    }
    
    miniStatusName.textContent = currentUser.name;
    miniStatusText.textContent = currentUser.customStatus || 'Disponible';
  }

  // Escuchar entrada de estado personalizado (texto)
  if (customStatusInput) {
    let statusTimeout;
    customStatusInput.addEventListener('input', () => {
      const text = customStatusInput.value.trim();
      if (currentUser) {
        currentUser.customStatus = text;
        localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
        updateMiniView();
        
        // Debounce de 1.2 segundos para no inundar de notificaciones por cada tecla
        clearTimeout(statusTimeout);
        statusTimeout = setTimeout(() => {
          socket.emit('update-mood', { customStatus: text });
        }, 1200);
      }
    });

    customStatusInput.addEventListener('blur', () => {
      // Al salir del input, forzar actualización inmediata
      const text = customStatusInput.value.trim();
      if (currentUser) {
        clearTimeout(statusTimeout);
        socket.emit('update-mood', { customStatus: text });
      }
    });

    customStatusInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        customStatusInput.blur();
      }
    });
  }

  // Escuchar carga de imagen de estado
  if (statusImageContainer) {
    statusImageContainer.addEventListener('click', () => {
      statusImageUpload.click();
    });
  }

  if (statusImageUpload) {
    statusImageUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert('La imagen es demasiado grande. Por favor sube una de menos de 10MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedStatusImageBase64 = event.target.result;
          statusImagePreview.src = uploadedStatusImageBase64;
          statusImagePreview.classList.remove('hidden');
          statusImagePlaceholder.classList.add('hidden');
          
          if (currentUser) {
            currentUser.statusImage = uploadedStatusImageBase64;
            localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
            socket.emit('update-mood', { statusImage: uploadedStatusImageBase64 });
            updateMiniView();
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Alternar Modo Mini (Super Compacto)
  if (toggleMiniBtn) {
    toggleMiniBtn.addEventListener('click', toggleMiniMode);
  }
  if (miniExpandBtn) {
    miniExpandBtn.addEventListener('click', toggleMiniMode);
  }
  if (widgetMiniContent) {
    // Doble clic para expandir de nuevo
    widgetMiniContent.addEventListener('dblclick', toggleMiniMode);
  }

  function toggleMiniMode() {
    document.body.classList.toggle('mini-mode');
    const isMini = document.body.classList.contains('mini-mode');
    
    if (isMini) {
      toggleMiniBtn.textContent = 'Expandir Widget';
      if (window.electronAPI) {
        setTimeout(() => {
          window.electronAPI.resize(130, 152);
        }, 40);
      }
      enableMiniDrag();
    } else {
      toggleMiniBtn.textContent = 'Colapsar a Mini';
      disableMiniDrag();
      if (window.electronAPI) {
        const isWidget = document.body.classList.contains('widget-mode');
        setTimeout(() => {
          if (isWidget) {
            window.electronAPI.resize(340, 600);
          } else {
            window.electronAPI.resize(1024, 768);
          }
        }, 40);
      }
    }
  }

  // Botones mini dedicados dentro de la tarjeta
  const miniMinimizeBtn = document.getElementById('mini-minimize-btn');
  const miniCloseBtn = document.getElementById('mini-close-btn');
  if (miniMinimizeBtn) {
    miniMinimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.electronAPI) window.electronAPI.minimize();
    });
  }
  if (miniCloseBtn) {
    miniCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.electronAPI) window.electronAPI.close();
    });
  }

  // Drag manual en modo mini via IPC para que los botones no sean bloqueados por CSS drag
  let miniDragActive = false;
  let miniDragStartX = 0;
  let miniDragStartY = 0;

  function onMiniMouseDown(e) {
    // Ignorar si el clic fue en un botón o control interactivo
    if (e.target.closest('button, a, input')) return;
    miniDragActive = true;
    miniDragStartX = e.screenX;
    miniDragStartY = e.screenY;
    document.addEventListener('mousemove', onMiniMouseMove);
    document.addEventListener('mouseup', onMiniMouseUp);
  }

  function onMiniMouseMove(e) {
    if (!miniDragActive) return;
    const deltaX = e.screenX - miniDragStartX;
    const deltaY = e.screenY - miniDragStartY;
    miniDragStartX = e.screenX;
    miniDragStartY = e.screenY;
    if (window.electronAPI && window.electronAPI.move) {
      window.electronAPI.move(deltaX, deltaY);
    }
  }

  function onMiniMouseUp() {
    miniDragActive = false;
    document.removeEventListener('mousemove', onMiniMouseMove);
    document.removeEventListener('mouseup', onMiniMouseUp);
  }

  function enableMiniDrag() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.addEventListener('mousedown', onMiniMouseDown);
  }

  function disableMiniDrag() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.removeEventListener('mousedown', onMiniMouseDown);
    miniDragActive = false;
  }

  // Alternar el Modo Widget Compacto
  toggleWidgetBtn.addEventListener('click', () => {
    // Si estamos en modo mini, quitarlo primero
    if (document.body.classList.contains('mini-mode')) {
      toggleMiniMode();
    }
    
    document.body.classList.toggle('widget-mode');
    const isWidget = document.body.classList.contains('widget-mode');
    toggleWidgetBtn.textContent = isWidget ? 'Ver Dashboard Completo' : 'Modo Widget Compacto';
    
    // Ajustar tamaño de ventana
    if (window.electronAPI) {
      if (isWidget) {
        window.electronAPI.resize(340, 600);
      } else {
        window.electronAPI.resize(1024, 768); // Tamaño normal de dashboard completo
      }
    }
  });

  // Salir / Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('pitufo_user');
    location.reload();
  });

  // WebSocket: Recibir actualizaciones de la lista de usuarios
  socket.on('update-users', (usersList) => {
    // Filtrar a nosotros mismos para el panel si queremos, o dejar a todos
    userCount.textContent = usersList.length;
    
    // Actualizar el dropdown de asignados en tareas
    const taskAssigneeSelect = document.getElementById('task-assignee-select');
    if (taskAssigneeSelect) {
      const currentSelection = taskAssigneeSelect.value;
      taskAssigneeSelect.innerHTML = '<option value="Todos">Asignar a: Todos</option>';
      usersList.forEach(user => {
        const option = document.createElement('option');
        option.value = user.name;
        option.textContent = user.name + (user.id === socket.id ? ' (Tú)' : '');
        taskAssigneeSelect.appendChild(option);
      });
      if ([...taskAssigneeSelect.options].some(o => o.value === currentSelection)) {
        taskAssigneeSelect.value = currentSelection;
      }
    }

    if (usersList.length === 0) {
      teamGrid.innerHTML = `
        <div class="empty-state">
          <p>Esperando a que se conecten tus compañeros...</p>
        </div>`;
      return;
    }

    teamGrid.innerHTML = '';
    
    usersList.forEach(user => {
      // No mostrar al propio usuario en la lista de compañeros para no redundar
      if (user.id === socket.id) return;
      
      const memberCard = document.createElement('div');
      memberCard.className = `member-card`;
      
      const isFocusing = user.focusEnd && user.focusEnd > Date.now();
      if (isFocusing) {
        memberCard.classList.add('focusing');
      }
      
      const displayStatus = user.customStatus || 'Disponible';
      const statusImgSrc = user.statusImage || '/icon.png';
      const avatarHtml = getAvatarElement(user.avatar);
      
      memberCard.innerHTML = `
        <button class="btn-buzz" title="Enviar Zumbido a ${user.name}">🚨</button>
        <div class="member-status-img-wrapper" style="width: 100%; height: 160px; border-radius: 12px; overflow: hidden; position: relative; margin-bottom: 15px; background: rgba(0,0,0,0.3);">
          <img src="${statusImgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <div class="member-avatar-badge-corner" style="position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%; overflow: hidden; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; background: #1e293b;">
            ${avatarHtml}
          </div>
        </div>
        <div class="member-name" style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">${user.name}</div>
        <div class="member-status-text" style="font-size: 0.9rem; font-weight: 600; color: #60a5fa; margin-top: 5px; background: rgba(96, 165, 250, 0.1); padding: 4px 10px; border-radius: 8px;">${displayStatus}</div>
        ${isFocusing ? `<div class="focus-indicator-badge" data-end="${user.focusEnd}">🧠 Enfoque: --:--</div>` : ''}
        <div class="member-time" style="margin-top: 12px; font-size: 0.75rem; color: var(--text-muted);">Actualizado: ${user.updatedTime}</div>
      `;
      
      // Evento para enviar zumbido
      const buzzBtn = memberCard.querySelector('.btn-buzz');
      if (buzzBtn) {
        buzzBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          socket.emit('send-buzz', user.id);
        });
      }
      
      teamGrid.appendChild(memberCard);
    });

    if (teamGrid.children.length === 0) {
      teamGrid.innerHTML = `
        <div class="empty-state">
          <p>Estás conectado solo. Comparte tu IP local para que otros se unan.</p>
        </div>`;
    }
  });

  // WebSocket: Alguien cambió de estado
  socket.on('status-notification', (data) => {
    const statusText = data.customStatus || 'Disponible';
    
    // Crear notificación visual tipo Toast dentro de la app
    showToast(data.name, '📢', statusText, false);
    
    // Notificación nativa del Navegador/OS si la pestaña no está activa
    if (document.hidden && Notification.permission === 'granted') {
      new Notification(`¡Estado de ${data.name}!`, {
        body: `${data.name} actualizó a: "${statusText}"`,
        icon: '/icon.png'
      });
    }
  });

  // Función para mostrar Toast Notifications
  function showToast(name, emoji, moodLabel, isUrgent) {
    const toast = document.createElement('div');
    toast.className = `toast ${isUrgent ? 'urgent' : ''}`;
    
    toast.innerHTML = `
      <div style="font-size: 1.8rem;">${emoji}</div>
      <div class="toast-content">
        <h4>${name} cambió de ánimo</h4>
        <p>Ahora está como ${moodLabel}</p>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }

  // --- LÓGICA DEL PANEL DE COLABORACIÓN (CHAT & TAREAS) ---
  let clientTasks = [];

  // Control de Pestañas (Tabs)
  const collabTabs = document.querySelectorAll('.collab-tab');
  collabTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      collabTabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.collab-tab-content').forEach(c => c.classList.add('hidden'));
      
      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.remove('hidden');
      
      // Limpiar puntito de notificación
      if (targetId === 'chat-tab-content') {
        tab.textContent = '💬 Chat';
      } else if (targetId === 'tasks-tab-content') {
        tab.textContent = '📋 Tareas del Equipo';
      } else if (targetId === 'my-tasks-tab-content') {
        tab.textContent = '👤 Mis Tareas';
      }
      
      // Auto-scroll chat al cambiar a pestaña chat
      if (targetId === 'chat-tab-content') {
        const container = document.getElementById('chat-messages-container');
        if (container) container.scrollTop = container.scrollHeight;
      }
    });
  });

  // Chat: Enviar Mensaje
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessagesContainer = document.getElementById('chat-messages-container');

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        socket.emit('send-chat-message', text);
        chatInput.value = '';
      }
    });
  }

  function appendChatMessage(msg) {
    if (!chatMessagesContainer) return;
    
    // Remover empty state
    const emptyState = chatMessagesContainer.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();

    const isSelf = currentUser && msg.sender.toLowerCase() === currentUser.name.toLowerCase();
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isSelf ? 'self' : ''}`;
    
    bubble.innerHTML = `
      <div class="chat-bubble-header">
        <span class="chat-sender-name">${msg.sender}</span>
        <span class="chat-time">${msg.time}</span>
      </div>
      <div class="chat-text">${escapeHTML(msg.text)}</div>
    `;
    
    chatMessagesContainer.appendChild(bubble);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // Tareas: Mostrar/Ocultar Formulario
  const showAddTaskBtn = document.getElementById('show-add-task-btn');
  const taskForm = document.getElementById('task-form');
  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  const taskTitleInput = document.getElementById('task-title-input');
  const taskAssigneeSelect = document.getElementById('task-assignee-select');
  const tasksListContainer = document.getElementById('tasks-list-container');
  const myTasksListContainer = document.getElementById('my-tasks-list-container');
  const taskDescInput = document.getElementById('task-desc-input');
  const taskPrioritySelect = document.getElementById('task-priority-select');

  if (showAddTaskBtn && taskForm) {
    showAddTaskBtn.addEventListener('click', () => {
      taskForm.classList.toggle('hidden');
      if (!taskForm.classList.contains('hidden')) {
        taskTitleInput.focus();
      }
    });
  }

  if (cancelTaskBtn && taskForm) {
    cancelTaskBtn.addEventListener('click', () => {
      taskForm.classList.add('hidden');
      taskTitleInput.value = '';
      if (taskDescInput) taskDescInput.value = '';
      if (taskPrioritySelect) taskPrioritySelect.value = 'Media';
    });
  }

  // Tareas: Crear Tarea
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = taskTitleInput.value.trim();
      const description = taskDescInput ? taskDescInput.value.trim() : '';
      const assignedTo = taskAssigneeSelect.value;
      const priority = taskPrioritySelect ? taskPrioritySelect.value : 'Media';
      
      if (title) {
        socket.emit('create-task', { title, description, assignedTo, priority });
        taskTitleInput.value = '';
        if (taskDescInput) taskDescInput.value = '';
        if (taskPrioritySelect) taskPrioritySelect.value = 'Media';
        taskForm.classList.add('hidden');
      }
    });
  }

  function renderTasksList(tasksList) {
    if (!tasksListContainer) return;
    
    // 1. Render all tasks (Tareas del Equipo)
    if (tasksList.length === 0) {
      tasksListContainer.innerHTML = '<div class="tasks-empty-state">¡Todo al día! No hay tareas pendientes.</div>';
    } else {
      tasksListContainer.innerHTML = '';
      tasksList.forEach(task => {
        const isCompleted = task.status === 'completed';
        const isUnassigned = task.assignedTo === 'Todos' || !task.assignedTo || task.assignedTo === 'Sin asignar';
        const showTakeBtn = isUnassigned && !isCompleted;
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${isCompleted ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        
        const createdDate = task.createdTimestamp ? new Date(task.createdTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : task.createdTime;
        const completedDate = task.completedTimestamp ? new Date(task.completedTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : (task.completedTime ? task.completedTime : '');
        const priority = task.priority || 'Media';

        taskItem.innerHTML = `
          <div class="task-item-main">
            <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
            <span class="task-title">${escapeHTML(task.title)}</span>
            <span class="priority-badge priority-${priority.toLowerCase()}" style="margin-left: auto;">${priority}</span>
          </div>
          ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
          <div class="task-dates">
            <div><b>Creada:</b> ${createdDate} (por ${task.creator})</div>
            ${isCompleted && completedDate ? `<div><b>Finalizada:</b> ${completedDate}</div>` : ''}
          </div>
          <div class="task-meta">
            <div style="display: flex; gap: 8px; align-items: center;">
              <span class="task-assignee">${isUnassigned ? 'Sin asignar' : 'Para: ' + task.assignedTo}</span>
              ${showTakeBtn ? `<button class="btn-take-task" data-id="${task.id}">Tomar</button>` : ''}
            </div>
            <button class="task-delete-btn" title="Eliminar Tarea">&times;</button>
          </div>
        `;
        
        // Evento checkbox status
        const checkbox = taskItem.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
          socket.emit('update-task-status', {
            id: task.id,
            status: checkbox.checked ? 'completed' : 'pending'
          });
        });
        
        // Evento tomar tarea
        if (showTakeBtn) {
          const takeBtn = taskItem.querySelector('.btn-take-task');
          takeBtn.addEventListener('click', () => {
            socket.emit('take-task', task.id);
          });
        }
        
        // Evento eliminar
        const deleteBtn = taskItem.querySelector('.task-delete-btn');
        deleteBtn.addEventListener('click', () => {
          if (confirm('¿Eliminar esta tarea?')) {
            socket.emit('delete-task', task.id);
          }
        });
        
        tasksListContainer.appendChild(taskItem);
      });
    }

    // 2. Render my tasks (Mis Tareas)
    if (!myTasksListContainer) return;
    
    const myTasks = tasksList.filter(task => currentUser && task.assignedTo && task.assignedTo.toLowerCase() === currentUser.name.toLowerCase());
    
    if (myTasks.length === 0) {
      myTasksListContainer.innerHTML = '<div class="tasks-empty-state">No tienes tareas asignadas.</div>';
    } else {
      myTasksListContainer.innerHTML = '';
      myTasks.forEach(task => {
        const isCompleted = task.status === 'completed';
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${isCompleted ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        
        const createdDate = task.createdTimestamp ? new Date(task.createdTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : task.createdTime;
        const completedDate = task.completedTimestamp ? new Date(task.completedTimestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : (task.completedTime ? task.completedTime : '');
        const priority = task.priority || 'Media';

        taskItem.innerHTML = `
          <div class="task-item-main">
            <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
            <span class="task-title">${escapeHTML(task.title)}</span>
            <span class="priority-badge priority-${priority.toLowerCase()}" style="margin-left: auto;">${priority}</span>
          </div>
          ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
          <div class="task-dates">
            <div><b>Creada:</b> ${createdDate} (por ${task.creator})</div>
            ${isCompleted && completedDate ? `<div><b>Finalizada:</b> ${completedDate}</div>` : ''}
          </div>
          <div class="task-meta">
            <span class="task-assignee">Asignada a ti</span>
            <button class="task-delete-btn" title="Eliminar Tarea">&times;</button>
          </div>
        `;
        
        // Evento checkbox status
        const checkbox = taskItem.querySelector('.task-checkbox');
        checkbox.addEventListener('change', () => {
          socket.emit('update-task-status', {
            id: task.id,
            status: checkbox.checked ? 'completed' : 'pending'
          });
        });
        
        // Evento eliminar
        const deleteBtn = taskItem.querySelector('.task-delete-btn');
        deleteBtn.addEventListener('click', () => {
          if (confirm('¿Eliminar esta tarea?')) {
            socket.emit('delete-task', task.id);
          }
        });
        
        myTasksListContainer.appendChild(taskItem);
      });
    }
    
    // Update admin history list with completed tasks from clientTasks
    if (currentUser && currentUser.role === 'admin') {
      const completedActiveTasks = tasksList.filter(t => t.status === 'completed');
      renderCompletedTasksList(completedActiveTasks);
    }
  }

  // Utilidad para sanitizar HTML
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // --- OYENTES DE SOCKET PARA COLABORACIÓN ---

  // Inicializar mensajes y tareas al entrar
  socket.on('init-data', (data) => {
    if (chatMessagesContainer) {
      chatMessagesContainer.innerHTML = '';
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => appendChatMessage(msg));
      } else {
        chatMessagesContainer.innerHTML = '<div class="chat-empty-state">No hay mensajes aún. ¡Comienza la conversación!</div>';
      }
    }
    
    if (data.tasks) {
      clientTasks = data.tasks;
      renderTasksList(clientTasks);
    }

    if (data.completedTasks) {
      clientCompletedTasks = data.completedTasks;
      renderCompletedTasksList(clientCompletedTasks);
    }
  });

  // Chat: Recibir mensaje nuevo
  socket.on('new-chat-message', (msg) => {
    appendChatMessage(msg);
    
    // Notificación flotante si el mensaje es de otro usuario
    if (currentUser && msg.sender.toLowerCase() !== currentUser.name.toLowerCase()) {
      const activeTab = document.querySelector('.collab-tab.active');
      if (!activeTab || activeTab.dataset.tab !== 'chat-tab-content') {
        const chatTabButton = document.querySelector('.collab-tab[data-tab="chat-tab-content"]');
        if (chatTabButton && !chatTabButton.textContent.includes('●')) {
          chatTabButton.textContent = '💬 Chat ●';
        }
      }
      
      showToast(msg.sender, '💬', `Mensaje: "${msg.text.substring(0, 20)}${msg.text.length > 20 ? '...' : ''}"`, false);
    }
  });

  // Tareas: Recibir creación
  socket.on('task-created', (task) => {
    clientTasks.push(task);
    renderTasksList(clientTasks);
    
    // Notificación si es para nosotros
    if (currentUser && (task.assignedTo.toLowerCase() === currentUser.name.toLowerCase() || task.assignedTo === 'Todos') && task.creator.toLowerCase() !== currentUser.name.toLowerCase()) {
      showToast(task.creator, '📋', `Nueva tarea: "${task.title}"`, true);
      
      const activeTab = document.querySelector('.collab-tab.active');
      const isSpecificToMe = task.assignedTo.toLowerCase() === currentUser.name.toLowerCase();
      
      if (isSpecificToMe) {
        if (!activeTab || activeTab.dataset.tab !== 'my-tasks-tab-content') {
          const myTasksTabButton = document.querySelector('.collab-tab[data-tab="my-tasks-tab-content"]');
          if (myTasksTabButton && !myTasksTabButton.textContent.includes('●')) {
            myTasksTabButton.textContent = '👤 Mis Tareas ●';
          }
        }
      } else {
        if (!activeTab || activeTab.dataset.tab !== 'tasks-tab-content') {
          const tasksTabButton = document.querySelector('.collab-tab[data-tab="tasks-tab-content"]');
          if (tasksTabButton && !tasksTabButton.textContent.includes('●')) {
            tasksTabButton.textContent = '📋 Tareas del Equipo ●';
          }
        }
      }
    }
  });

  // Tareas: Recibir actualización
  socket.on('task-updated', (updatedTask) => {
    const idx = clientTasks.findIndex(t => t.id === updatedTask.id);
    if (idx !== -1) {
      clientTasks[idx] = updatedTask;
      renderTasksList(clientTasks);
    }
  });

  // Tareas: Recibir eliminación
  socket.on('task-deleted', (taskId) => {
    clientTasks = clientTasks.filter(t => t.id !== taskId);
    renderTasksList(clientTasks);
  });

  let clientCompletedTasks = [];

  function renderCompletedTasksList(completedList) {
    const historyListContainer = document.getElementById('tasks-history-list');
    if (!historyListContainer) return;
    
    if (completedList.length === 0) {
      historyListContainer.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; margin-top: 10px;">Ningún logro registrado aún.</div>';
      return;
    }
    
    historyListContainer.innerHTML = '';
    [...completedList].reverse().forEach(task => {
      const item = document.createElement('div');
      item.style.background = 'rgba(16, 185, 129, 0.05)';
      item.style.border = '1px solid rgba(16, 185, 129, 0.15)';
      item.style.padding = '8px 10px';
      item.style.borderRadius = '8px';
      item.style.color = 'var(--text-main)';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '2px';
      item.style.marginBottom = '6px';
      
      item.innerHTML = `
        <div style="font-weight: 600; text-decoration: line-through; opacity: 0.8;">${escapeHTML(task.title)}</div>
        <div style="font-size: 0.65rem; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>Hecho por: <b style="color: var(--primary-hover); text-transform: capitalize;">${task.assignedTo}</b></span>
          <span>A las ${task.completedTime}</span>
        </div>
      `;
      historyListContainer.appendChild(item);
    });
  }

  const clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('¿Vaciar todo el historial de tareas completadas del día?')) {
        socket.emit('clear-task-history');
      }
    });
  }

  // Socket: Recibir vaciado de historial
  socket.on('task-history-cleared', () => {
    clientCompletedTasks = [];
    renderCompletedTasksList(clientCompletedTasks);
  });
  // Socket: Recibir zumbido
  socket.on('receive-buzz', (data) => {
    playBuzzSound();
    
    // Sacudir la pantalla
    document.body.classList.add('shake-screen');
    setTimeout(() => {
      document.body.classList.remove('shake-screen');
    }, 450);
    
    showBuzzToast(data.senderName);
    
    if (Notification.permission === 'granted') {
      new Notification(`🚨 ¡ZUMBIDO de ${data.senderName}!`, {
        body: `${data.senderName} te ha enviado un zumbido de atención.`,
        icon: '/icon.png'
      });
    }
  });

  function playBuzzSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(160, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(160, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.35);
      }, 180);
    } catch (err) {
      console.error('Error al reproducir audio de zumbido:', err);
    }
  }

  function showBuzzToast(name) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast buzz-toast';
    toast.innerHTML = `
      <div style="font-size: 2.2rem;">🚨</div>
      <div class="toast-content">
        <h4 style="color: white; font-weight: 800;">¡ZUMBIDO RECIBIDO!</h4>
        <p style="color: rgba(255,255,255,0.9); font-weight: 600;">${name} solicita tu atención inmediata.</p>
      </div>
    `;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4500);
  }

  // LÓGICA DEL POMODORO / MODO ENFOQUE
  let focusTimerInterval = null;
  let timerState = 'idle'; // 'idle', 'running', 'paused'
  let timerType = 'work'; // 'work', 'break'
  
  // Cargar configuraciones guardadas
  let workDurationMin = parseInt(localStorage.getItem('pitufo_focus_work_time')) || 25;
  let breakDurationMin = parseInt(localStorage.getItem('pitufo_focus_break_time')) || 5;
  let timeLeftMs = workDurationMin * 60 * 1000;

  const btnToggleFocus = document.getElementById('btn-toggle-focus');
  const btnStopFocus = document.getElementById('btn-stop-focus');
  const btnFocusSettings = document.getElementById('btn-focus-settings');
  const focusSettingsPanel = document.getElementById('focus-settings-panel');
  const focusWorkTimeInput = document.getElementById('focus-work-time-input');
  const focusBreakTimeInput = document.getElementById('focus-break-time-input');
  const btnSaveFocusSettings = document.getElementById('btn-save-focus-settings');
  const focusTimerDisplay = document.getElementById('focus-timer-display');
  const focusTimerTitle = document.getElementById('focus-timer-title');
  const focusIcon = document.getElementById('focus-icon');
  const focusTimerCard = document.getElementById('focus-timer-card');

  // Inicializar inputs de configuración con los valores cargados
  if (focusWorkTimeInput) focusWorkTimeInput.value = workDurationMin;
  if (focusBreakTimeInput) focusBreakTimeInput.value = breakDurationMin;
  
  // Establecer texto del temporizador inicialmente
  updateTimerDisplay(timeLeftMs);

  // Toggle Panel de Configuración
  if (btnFocusSettings) {
    btnFocusSettings.addEventListener('click', () => {
      focusSettingsPanel.classList.toggle('hidden');
    });
  }

  // Guardar configuración
  if (btnSaveFocusSettings) {
    btnSaveFocusSettings.addEventListener('click', () => {
      const workMin = parseInt(focusWorkTimeInput.value) || 25;
      const breakMin = parseInt(focusBreakTimeInput.value) || 5;
      
      workDurationMin = Math.max(1, Math.min(180, workMin));
      breakDurationMin = Math.max(1, Math.min(60, breakMin));
      
      localStorage.setItem('pitufo_focus_work_time', workDurationMin);
      localStorage.setItem('pitufo_focus_break_time', breakDurationMin);
      
      focusSettingsPanel.classList.add('hidden');
      
      // Si el timer está libre/idle, actualizamos la pantalla con el nuevo tiempo de Enfoque
      if (timerState === 'idle') {
        timerType = 'work';
        timeLeftMs = workDurationMin * 60 * 1000;
        updateTimerDisplay(timeLeftMs);
        resetFocusCardTheme();
      }
      showToast('Configuración Guardada', '⚙️', 'Tiempos de enfoque y descanso actualizados.');
    });
  }

  if (btnToggleFocus) {
    btnToggleFocus.addEventListener('click', () => {
      if (timerState === 'running') {
        pauseFocusSession();
      } else {
        startFocusSession();
      }
    });
  }

  if (btnStopFocus) {
    btnStopFocus.addEventListener('click', () => {
      stopAndResetFocusSession();
    });
  }

  function resetFocusCardTheme() {
    if (!focusTimerCard) return;
    if (timerType === 'work') {
      focusTimerCard.style.background = 'rgba(139, 92, 246, 0.08)';
      focusTimerCard.style.borderColor = 'rgba(139, 92, 246, 0.25)';
      if (focusTimerTitle) {
        focusTimerTitle.textContent = 'Modo Enfoque';
        focusTimerTitle.style.color = '#c084fc';
      }
      if (focusIcon) focusIcon.textContent = '🍅';
      if (btnToggleFocus) {
        btnToggleFocus.style.background = '#8b5cf6';
        btnToggleFocus.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
        btnToggleFocus.textContent = timerState === 'running' ? 'Pausar' : (timerState === 'paused' ? 'Reanudar' : 'Iniciar Enfoque');
      }
    } else {
      focusTimerCard.style.background = 'rgba(16, 185, 129, 0.08)';
      focusTimerCard.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      if (focusTimerTitle) {
        focusTimerTitle.textContent = 'Modo Descanso';
        focusTimerTitle.style.color = '#34d399';
      }
      if (focusIcon) focusIcon.textContent = '☕';
      if (btnToggleFocus) {
        btnToggleFocus.style.background = '#10b981';
        btnToggleFocus.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
        btnToggleFocus.textContent = timerState === 'running' ? 'Pausar' : (timerState === 'paused' ? 'Reanudar' : 'Iniciar Descanso');
      }
    }
  }

  function startFocusSession() {
    if (focusTimerInterval) clearInterval(focusTimerInterval);
    
    // Si estaba inactivo, inicializar duración
    if (timerState === 'idle') {
      timeLeftMs = (timerType === 'work' ? workDurationMin : breakDurationMin) * 60 * 1000;
    }
    
    const end = Date.now() + timeLeftMs;
    timerState = 'running';

    // Guardar focusEnd en el usuario y localstorage para sincronización
    if (currentUser) {
      currentUser.focusEnd = end;
      localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
    }
    
    // Emitir a socket.io si es tiempo de trabajo (para mostrar el cerebro en el panel de compañeros)
    if (timerType === 'work') {
      socket.emit('start-focus', timeLeftMs);
    } else {
      // Si es descanso, quitamos el badge de enfoque
      socket.emit('stop-focus');
    }
    
    // Actualizar botones
    if (btnToggleFocus) {
      btnToggleFocus.textContent = 'Pausar';
      btnToggleFocus.classList.add('active');
    }
    if (btnStopFocus) {
      btnStopFocus.classList.remove('hidden');
    }
    
    resetFocusCardTheme();
    updateTimerDisplay(timeLeftMs);
    
    // Reanudar audio de concentración si estaba activo antes de pausar
    if (isAmbientPlaying && ambientAudio && ambientAudio.paused) {
      ambientAudio.play().catch(err => console.log("Error al reanudar audio:", err));
    }

    focusTimerInterval = setInterval(() => {
      timeLeftMs = Math.max(0, end - Date.now());
      updateTimerDisplay(timeLeftMs);
      
      // Actualizar periódicamente en localStorage por si acaso
      if (currentUser && timerType === 'work') {
        currentUser.focusEnd = Date.now() + timeLeftMs;
        localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
      }
      
      if (timeLeftMs <= 0) {
        clearInterval(focusTimerInterval);
        focusTimerInterval = null;
        playDingSound();
        
        // Pausar música al finalizar
        if (ambientAudio) {
          ambientAudio.pause();
        }
        
        if (timerType === 'work') {
          showToast('Enfoque Pomodoro', '🍅', '¡Sesión de enfoque completada! Hora de descansar.', true);
          // Cambiar a modo descanso
          timerType = 'break';
          timerState = 'idle';
          timeLeftMs = breakDurationMin * 60 * 1000;
        } else {
          showToast('Descanso Terminado', '☕', '¡Tu descanso ha terminado! A trabajar.', true);
          // Cambiar a modo enfoque
          timerType = 'work';
          timerState = 'idle';
          timeLeftMs = workDurationMin * 60 * 1000;
        }
        
        if (currentUser) {
          currentUser.focusEnd = null;
          localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
        }
        socket.emit('stop-focus');
        
        resetFocusCardTheme();
        updateTimerDisplay(timeLeftMs);
        
        if (btnToggleFocus) {
          btnToggleFocus.textContent = timerType === 'work' ? 'Iniciar Enfoque' : 'Iniciar Descanso';
          btnToggleFocus.classList.remove('active');
        }
        if (btnStopFocus) {
          btnStopFocus.classList.add('hidden');
        }
      }
    }, 1000);
  }

  function pauseFocusSession() {
    if (focusTimerInterval) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    
    timerState = 'paused';
    
    if (currentUser) {
      currentUser.focusEnd = null;
      localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
    }
    socket.emit('stop-focus'); // Avisar que ya no está enfocado activamente
    
    if (btnToggleFocus) {
      btnToggleFocus.textContent = 'Reanudar';
      btnToggleFocus.classList.remove('active');
    }

    // Pausar audio de concentración al pausar pomodoro
    if (isAmbientPlaying && ambientAudio) {
      ambientAudio.pause();
    }
  }

  function stopAndResetFocusSession() {
    if (focusTimerInterval) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    
    timerState = 'idle';
    timerType = 'work'; // Restablece a trabajo por defecto
    timeLeftMs = workDurationMin * 60 * 1000;
    
    if (currentUser) {
      currentUser.focusEnd = null;
      localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
    }
    socket.emit('stop-focus');
    
    resetFocusCardTheme();
    updateTimerDisplay(timeLeftMs);
    
    if (btnToggleFocus) {
      btnToggleFocus.textContent = 'Iniciar Enfoque';
      btnToggleFocus.classList.remove('active');
    }
    if (btnStopFocus) {
      btnStopFocus.classList.add('hidden');
    }

    // Pausar y limpiar música
    if (ambientAudio) {
      ambientAudio.pause();
    }
    isAmbientPlaying = false;
    updateAmbientPlayButtonUI();
  }

  function updateTimerDisplay(ms) {
    if (!focusTimerDisplay) return;
    const totalSeconds = Math.round(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    focusTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function playDingSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Sweet campana A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.5);
    } catch (err) {
      console.error('Error al reproducir audio de campana:', err);
    }
  }

  // LÓGICA DE AUDIOS AMBIENTALES DE CONCENTRACIÓN
  let ambientAudio = null;
  let isAmbientPlaying = false;
  let customLocalFileBlob = null;
  let customUrl = "";

  const btnAmbientPlay = document.getElementById('btn-ambient-play');
  const ambientSoundSelect = document.getElementById('ambient-sound-select');
  const ambientVolumeSlider = document.getElementById('ambient-volume-slider');
  const ambientLocalWrapper = document.getElementById('ambient-local-wrapper');
  const ambientLocalFile = document.getElementById('ambient-local-file');
  const btnTriggerAmbientFile = document.getElementById('btn-trigger-ambient-file');
  const ambientFileName = document.getElementById('ambient-file-name');
  const ambientUrlWrapper = document.getElementById('ambient-url-wrapper');
  const ambientUrlInput = document.getElementById('ambient-url-input');
  const btnApplyAmbientUrl = document.getElementById('btn-apply-ambient-url');

  // Direcciones de audio CDN de Google estables y Radio Lofi de RCAST
  const soundUrls = {
    rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
    waves: 'https://actions.google.com/sounds/v1/water/sea_waves.ogg',
    lofi: 'https://streaming.hotmixradio.com/hotmix-lofi-en-mp3'
  };

  function initAmbientAudio(src) {
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio = null;
    }
    
    if (!src || src === 'none') {
      isAmbientPlaying = false;
      updateAmbientPlayButtonUI();
      return;
    }

    ambientAudio = new Audio(src);
    ambientAudio.loop = true;
    
    const vol = parseFloat(ambientVolumeSlider.value) / 100;
    ambientAudio.volume = vol;

    if (isAmbientPlaying) {
      ambientAudio.play().catch(err => {
        console.error("Error reproduciendo audio ambiental:", err);
        isAmbientPlaying = false;
        updateAmbientPlayButtonUI();
      });
    }
  }

  function updateAmbientPlayButtonUI() {
    if (!btnAmbientPlay) return;
    if (isAmbientPlaying) {
      btnAmbientPlay.textContent = '⏸️ Pausar';
      btnAmbientPlay.style.color = '#10b981';
    } else {
      btnAmbientPlay.textContent = '▶️ Iniciar';
      btnAmbientPlay.style.color = '#c084fc';
    }
  }

  if (btnAmbientPlay) {
    btnAmbientPlay.addEventListener('click', () => {
      const selected = ambientSoundSelect.value;
      if (selected === 'none') {
        showToast('Elige un sonido', '🎧', 'Por favor, selecciona un sonido o música en la lista.');
        return;
      }

      if (isAmbientPlaying) {
        isAmbientPlaying = false;
        if (ambientAudio) ambientAudio.pause();
      } else {
        isAmbientPlaying = true;
        if (!ambientAudio) {
          setupAudioSourceAndPlay();
        } else {
          ambientAudio.play().catch(err => {
            console.error("Error reproduciendo:", err);
            isAmbientPlaying = false;
          });
        }
      }
      updateAmbientPlayButtonUI();
    });
  }

  function setupAudioSourceAndPlay() {
    const selected = ambientSoundSelect.value;
    let src = '';
    
    if (selected === 'local') {
      if (customLocalFileBlob) {
        src = customLocalFileBlob;
      } else {
        showToast('Selecciona archivo', '📁', 'Por favor, elige tu archivo de música local.');
        isAmbientPlaying = false;
        updateAmbientPlayButtonUI();
        return;
      }
    } else if (selected === 'url') {
      if (customUrl) {
        src = customUrl;
      } else {
        showToast('URL vacía', '🔗', 'Por favor, introduce una dirección de audio válida.');
        isAmbientPlaying = false;
        updateAmbientPlayButtonUI();
        return;
      }
    } else {
      src = soundUrls[selected];
    }
    
    initAmbientAudio(src);
  }

  if (ambientSoundSelect) {
    ambientSoundSelect.addEventListener('change', () => {
      const val = ambientSoundSelect.value;
      
      ambientLocalWrapper.classList.toggle('hidden', val !== 'local');
      ambientUrlWrapper.classList.toggle('hidden', val !== 'url');

      if (val === 'none') {
        isAmbientPlaying = false;
        if (ambientAudio) {
          ambientAudio.pause();
          ambientAudio = null;
        }
        updateAmbientPlayButtonUI();
      } else {
        setupAudioSourceAndPlay();
      }
    });
  }

  if (btnTriggerAmbientFile) {
    btnTriggerAmbientFile.addEventListener('click', () => {
      ambientLocalFile.click();
    });
  }

  if (ambientLocalFile) {
    ambientLocalFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (customLocalFileBlob) {
          URL.revokeObjectURL(customLocalFileBlob);
        }
        customLocalFileBlob = URL.createObjectURL(file);
        ambientFileName.textContent = `🎵 ${file.name}`;
        showToast('Música Cargada', '📁', `Se cargó "${file.name}" para tu sesión.`);
        
        isAmbientPlaying = true;
        setupAudioSourceAndPlay();
        updateAmbientPlayButtonUI();
      }
    });
  }

  if (btnApplyAmbientUrl) {
    btnApplyAmbientUrl.addEventListener('click', () => {
      const url = ambientUrlInput.value.trim();
      if (url) {
        customUrl = url;
        showToast('Enlace Aplicado', '🔗', 'Se configuró tu dirección de audio personalizada.');
        
        isAmbientPlaying = true;
        setupAudioSourceAndPlay();
        updateAmbientPlayButtonUI();
      } else {
        showToast('Enlace Inválido', '⚠️', 'Introduce un enlace de audio válido.');
      }
    });
  }

  if (ambientVolumeSlider) {
    ambientVolumeSlider.addEventListener('input', () => {
      const vol = parseFloat(ambientVolumeSlider.value) / 100;
      if (ambientAudio) {
        ambientAudio.volume = vol;
      }
    });
  }

  // Intervalo global para actualizar en tiempo real los contadores de enfoque de los compañeros
  setInterval(() => {
    const badges = document.querySelectorAll('.focus-indicator-badge');
    badges.forEach(badge => {
      const end = parseInt(badge.dataset.end);
      const leftMs = Math.max(0, end - Date.now());
      const leftSecs = Math.round(leftMs / 1000);
      
      if (leftSecs <= 0) {
        badge.textContent = '🧠 Enfoque Terminado';
        const card = badge.closest('.member-card');
        if (card) {
          card.classList.remove('focusing');
        }
        badge.remove();
      } else {
        const mins = Math.floor(leftSecs / 60);
        const secs = leftSecs % 60;
        badge.textContent = `🧠 Enfoque: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    });
  }, 1000);

  // Cargar usuario guardado si existe (Al final de la inicialización)
  const savedUser = localStorage.getItem('pitufo_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    usernameInput.value = currentUser.name;
    
    // Restaurar avatar
    if (currentUser.avatar && currentUser.avatar.startsWith('data:image')) {
      if (uploadStatus) {
        uploadStatus.textContent = '📸 ¡Tu foto personalizada está cargada!';
        uploadStatus.style.color = '#10b981';
      }
      uploadedAvatarBase64 = currentUser.avatar;
    } else {
      const avatarInput = document.querySelector(`input[name="initial-avatar"][value="${currentUser.avatar}"]`);
      if (avatarInput) avatarInput.checked = true;
    }
    
    // Entrar directamente
    enterWorkspace(currentUser);
  } else {
    // Si no hay usuario guardado (pantalla de login), asegurar el tamaño inicial del widget
    if (isElectron && window.electronAPI) {
      window.electronAPI.resize(340, 600);
    }
  }
});
