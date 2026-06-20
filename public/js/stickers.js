// stickers.js - Galería de Stickers Prediseñados y carga de imágenes de estado
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

function initStickersGallery(stickersGallery, statusImagePreview, statusImagePlaceholder, customStatusInput, getSocket, getCurrentUser, setCurrentUser, updateMiniView) {
  if (!stickersGallery) return;

  stickersGallery.innerHTML = '';
  PRESET_STICKERS.forEach(sticker => {
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
    
    img.onerror = () => {
      img.src = '/icon.png';
    };
    
    wrapper.appendChild(img);
    wrapper.appendChild(span);
    
    wrapper.addEventListener('click', () => {
      document.querySelectorAll('.sticker-item-wrapper').forEach(el => el.classList.remove('selected'));
      wrapper.classList.add('selected');
      
      const path = `stickers/${sticker.file}`;
      
      if (statusImagePreview) {
        statusImagePreview.src = path;
        statusImagePreview.classList.remove('hidden');
      }
      if (statusImagePlaceholder) {
        statusImagePlaceholder.classList.add('hidden');
      }
      
      if (customStatusInput) {
        customStatusInput.value = sticker.label;
      }
      
      const currentUser = getCurrentUser();
      if (currentUser) {
        currentUser.statusImage = path;
        currentUser.customStatus = sticker.label;
        setCurrentUser(currentUser);
        localStorage.setItem('pitufo_user', JSON.stringify(currentUser));
        
        const socket = getSocket();
        if (socket) {
          socket.emit('update-mood', { 
            statusImage: path,
            customStatus: sticker.label
          });
        }
        if (typeof updateMiniView === 'function') {
          updateMiniView();
        }
      }
    });
    
    stickersGallery.appendChild(wrapper);
  });
}
