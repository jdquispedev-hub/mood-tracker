// auth-login.js - Manejo de autenticación, avatares y sesión de usuario

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

function initAuthLogin(config) {
  const {
    usernameInput,
    passwordGroup,
    passwordInput,
    uploadTriggerBtn,
    avatarUploadInput,
    uploadStatus,
    loginForm,
    loginScreen,
    mainInterface,
    currentUsernameDisplay,
    currentUserBadge,
    customStatusInput,
    statusImagePreview,
    statusImagePlaceholder,
    getSocket,
    onLoginSuccess
  } = config;

  let uploadedAvatarBase64 = null;

  if (usernameInput && passwordGroup && passwordInput) {
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
  }

  if (uploadTriggerBtn && avatarUploadInput) {
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
          if (uploadStatus) {
            uploadStatus.textContent = '📷 ¡Foto cargada con éxito!';
            uploadStatus.style.color = '#10b981';
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = usernameInput.value.trim();
      
      if (name.toLowerCase() === 'danna') {
        if (passwordInput.value !== '123456') {
          alert('Contraseña incorrecta para el administrador Danna.');
          return;
        }
      }
      
      const avatarRadio = document.querySelector('input[name="initial-avatar"]:checked');
      const avatar = uploadedAvatarBase64 || (avatarRadio ? avatarRadio.value : 'pitufo-default');
      
      const user = { 
        name, 
        avatar, 
        mood: 'feliz', 
        customStatus: '',
        role: name.toLowerCase() === 'danna' ? 'admin' : 'user'
      };
      
      localStorage.setItem('pitufo_user', JSON.stringify(user));
      
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(user);
      }
    });
  }
}
