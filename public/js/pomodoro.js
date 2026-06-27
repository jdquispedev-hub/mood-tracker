// pomodoro.js - Timer de enfoque Pomodoro y control de sonidos de ambiente

function initPomodoroTimer(config) {
  const {
    timerDisplay,
    btnToggleFocus,
    getSocket,
    getCurrentUser,
    setCurrentUser,
    showToast
  } = config;

  let focusInterval = null;

  function updateTimerUI(ms) {
    if (!timerDisplay) return;
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function startFocusSession(durationMs) {
    clearInterval(focusInterval);
    const endTime = Date.now() + durationMs;
    
    updateTimerUI(durationMs);
    if (btnToggleFocus) {
      btnToggleFocus.classList.add('active');
      btnToggleFocus.textContent = '⏹️ Cancelar Enfoque';
    }

    focusInterval = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(focusInterval);
        updateTimerUI(0);
        
        if (btnToggleFocus) {
          btnToggleFocus.classList.remove('active');
          btnToggleFocus.textContent = '⚡ Iniciar Enfoque (25m)';
        }

        const currentUser = getCurrentUser();
        if (currentUser) {
          delete currentUser.focusEnd;
          setCurrentUser(currentUser);
          localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
          
          const socket = getSocket();
          if (socket) {
            socket.emit('update-mood', { isFocusing: false });
          }
        }

        if (typeof showToast === 'function') {
          showToast('¡Tiempo Cumplido!', '🎉', 'Has completado tus 25 minutos de enfoque. ¡Buen trabajo!');
        }

        if (Notification.permission === 'granted') {
          new Notification('Pitufo Moods - Enfoque Completado', {
            body: '¡Has completado tus 25 minutos de concentración!',
            icon: '/icon.png'
          });
        }
      } else {
        updateTimerUI(remaining);
      }
    }, 1000);
  }

  function cancelFocusSession() {
    clearInterval(focusInterval);
    updateTimerUI(25 * 60 * 1000);
    
    if (btnToggleFocus) {
      btnToggleFocus.classList.remove('active');
      btnToggleFocus.textContent = '⚡ Iniciar Enfoque (25m)';
    }

    const currentUser = getCurrentUser();
    if (currentUser) {
      delete currentUser.focusEnd;
      setCurrentUser(currentUser);
      localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
      
      const socket = getSocket();
      if (socket) {
        socket.emit('update-mood', { isFocusing: false });
      }
    }
  }

  if (btnToggleFocus) {
    btnToggleFocus.addEventListener('click', () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      if (btnToggleFocus.classList.contains('active')) {
        cancelFocusSession();
      } else {
        const duration = 25 * 60 * 1000;
        currentUser.focusEnd = Date.now() + duration;
        setCurrentUser(currentUser);
        localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
        
        const socket = getSocket();
        if (socket) {
          socket.emit('update-mood', { isFocusing: true, focusEnd: currentUser.focusEnd });
        }
        
        startFocusSession(duration);
      }
    });
  }

  return {
    startFocusSession,
    cancelFocusSession
  };
}
