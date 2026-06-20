// mood-manager.js - Manejo de seleccion de estado de animo, estados personalizados y actualizaciones
function initMoodManager(moodButtons, customStatusInput, statusImageUpload, statusImagePreview, statusImagePlaceholder, getSocket, getCurrentUser, setCurrentUser, updateMiniView) {
  if (moodButtons) {
    moodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        
        moodButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const currentUser = getCurrentUser();
        if (currentUser) {
          currentUser.mood = mood;
          setCurrentUser(currentUser);
          localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
          
          const socket = getSocket();
          if (socket) {
            socket.emit('update-mood', { mood });
          }
          if (typeof updateMiniView === 'function') {
            updateMiniView();
          }
        }
      });
    });
  }

  if (customStatusInput) {
    customStatusInput.addEventListener('change', () => {
      const text = customStatusInput.value.trim();
      const currentUser = getCurrentUser();
      if (currentUser) {
        currentUser.customStatus = text;
        setCurrentUser(currentUser);
        localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
        
        const socket = getSocket();
        if (socket) {
          socket.emit('update-mood', { customStatus: text });
        }
        if (typeof updateMiniView === 'function') {
          updateMiniView();
        }
      }
    });
  }
}
