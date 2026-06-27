// navigation.js - Cambio de pestañas entre "Estados del Equipo" y "Tickets de Soporte"

function initNavigationTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const viewMoods = document.getElementById('view-moods');
  const viewTickets = document.getElementById('view-tickets');
  const dashboardSubtitle = document.getElementById('dashboard-subtitle');

  if (!tabs) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.target;

      if (target === 'view-moods') {
        if (viewMoods) viewMoods.classList.remove('hidden');
        if (viewTickets) viewTickets.classList.add('hidden');
        if (dashboardSubtitle) {
          dashboardSubtitle.textContent = 'Así están tus compañeros de trabajo en tiempo real';
        }
      } else if (target === 'view-tickets') {
        if (viewMoods) viewMoods.classList.add('hidden');
        if (viewTickets) viewTickets.classList.remove('hidden');
        if (dashboardSubtitle) {
          dashboardSubtitle.textContent = 'Centro de Incidencias y Atención de Ayuda en Red Local';
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigationTabs();
});
