// Controlador principal de la aplicación
import * as storage from './storage.js';
import * as calendar from './calendar.js';
import * as summary from './summary.js';

// Auxiliar para formatear fechas a YYYY-MM-DD en hora local
function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Estado global de la aplicación
let currentDate = getLocalDateString(); // YYYY-MM-DD
let activeTab = 'tasks'; // 'tasks', 'summary', 'settings'
let editingTaskId = null;
let googleEvents = [];
let isFetchingGoogleEvents = false;
let appInitialized = false;

// Elementos del DOM
const el = {
  // Login / Layout
  loginOverlay: document.getElementById('login-overlay'),
  appContainer: document.getElementById('app-container'),
  btnLogin: document.getElementById('btn-login'),
  btnLogout: document.getElementById('btn-logout'),
  userNameDisplay: document.getElementById('user-name-display'),

  // Pestañas / Navegación
  navTasks: document.getElementById('nav-tasks'),
  navSummary: document.getElementById('nav-summary'),
  navSettings: document.getElementById('nav-settings'),
  tabTasks: document.getElementById('tab-tasks'),
  tabSummary: document.getElementById('tab-summary'),
  tabSettings: document.getElementById('tab-settings'),
  themeToggle: document.getElementById('theme-toggle'),

  // Vista de Tareas
  selectedDateText: document.getElementById('selected-date-text'),
  datePickerInput: document.getElementById('date-picker-input'),
  dateSlider: document.getElementById('date-slider'),
  tasksProgressText: document.getElementById('tasks-progress-text'),
  progressBar: document.getElementById('progress-bar'),
  pendingTasksList: document.getElementById('pending-tasks-list'),
  completedTasksList: document.getElementById('completed-tasks-list'),
  calendarEventsSection: document.getElementById('calendar-events-section'),
  calendarEventsList: document.getElementById('calendar-events-list'),
  quickAddInput: document.getElementById('quick-add-input'),
  btnQuickAdd: document.getElementById('btn-quick-add'),

  // Modales
  taskModal: document.getElementById('task-modal'),
  modalTitle: document.getElementById('modal-title'),
  taskForm: document.getElementById('task-form'),
  taskInputTitle: document.getElementById('task-input-title'),
  taskInputDesc: document.getElementById('task-input-desc'),
  taskInputDate: document.getElementById('task-input-date'),
  taskInputTime: document.getElementById('task-input-time'),
  taskInputCategory: document.getElementById('task-input-category'),
  taskInputSync: document.getElementById('task-input-sync'),
  btnCancelTask: document.getElementById('btn-cancel-task'),
  btnOpenAddModal: document.getElementById('btn-open-add-modal'),

  // Ajustes de Google Calendar
  settingsForm: document.getElementById('settings-form'),
  inputClientId: document.getElementById('input-client-id'),
  calendarStatus: document.getElementById('calendar-status'),
  btnConnectGoogle: document.getElementById('btn-connect-google'),
  btnDisconnectGoogle: document.getElementById('btn-disconnect-google'),

  // Dashboard de Resumen
  summaryMonthSelect: document.getElementById('summary-month-select'),
};

// Inicialización de la aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  // Configurar autenticación
  el.btnLogin.addEventListener('click', () => {
    storage.loginWithGoogle().catch((err) => {
      console.error(err);
      alert("Error al iniciar sesión: " + err.message);
    });
  });

  el.btnLogout.addEventListener('click', async () => {
    await storage.logout();
  });

  // Escuchar estado de sesión
  storage.onAuthChange(async (user) => {
    if (user) {
      // Usuario logueado: mostrar app
      el.loginOverlay.classList.add('hidden');
      el.appContainer.classList.remove('hidden');
      el.userNameDisplay.textContent = user.displayName || user.email;

      // Solo inicializar la app una vez
      if (!appInitialized) {
        await initTheme();
        initRouter();
        await initCalendarAPI();
        initDateControls();
        initTaskOperations();
        initSettingsOperations();
        initSummaryOperations();
        appInitialized = true;
      }
      
      await updateAppView();
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } else {
      // No logueado: mostrar login
      el.loginOverlay.classList.remove('hidden');
      el.appContainer.classList.add('hidden');
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
  });
});

// ==========================================
// 1. TEMA Y DISEÑO
// ==========================================

async function initTheme() {
  let settings = { theme: 'dark' };
  try {
    settings = await storage.getSettings();
  } catch (error) {
    console.error("Error cargando ajustes de Firebase:", error);
  }
  applyTheme(settings.theme);

  el.themeToggle.addEventListener('click', async () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    await storage.saveSettings({ theme: newTheme });
    
    // Si estamos en la pestaña de resumen, volver a dibujar los gráficos con los nuevos colores de tema
    if (activeTab === 'summary') {
      await renderMonthlySummary();
    }
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = el.themeToggle.querySelector('i');
  if (icon) {
    if (theme === 'dark') {
      icon.setAttribute('data-lucide', 'sun');
      el.themeToggle.title = 'Cambiar a modo claro';
    } else {
      icon.setAttribute('data-lucide', 'moon');
      el.themeToggle.title = 'Cambiar a modo oscuro';
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

// ==========================================
// 2. ENRUTADOR Y PESTAÑAS
// ==========================================

function initRouter() {
  const tabs = [
    { nav: el.navTasks, tab: el.tabTasks, id: 'tasks' },
    { nav: el.navSummary, tab: el.tabSummary, id: 'summary' },
    { nav: el.navSettings, tab: el.tabSettings, id: 'settings' }
  ];

  tabs.forEach(item => {
    item.nav.addEventListener('click', async (e) => {
      e.preventDefault();
      await switchTab(item.id);
    });
  });
}

async function switchTab(tabId) {
  activeTab = tabId;
  
  // Actualizar navegación activa
  [el.navTasks, el.navSummary, el.navSettings].forEach(nav => nav.classList.remove('active'));
  [el.tabTasks, el.tabSummary, el.tabSettings].forEach(tab => tab.classList.add('hidden'));

  if (tabId === 'tasks') {
    el.navTasks.classList.add('active');
    el.tabTasks.classList.remove('hidden');
    await updateAppView(); // Actualiza tareas del día
  } else if (tabId === 'summary') {
    el.navSummary.classList.add('active');
    el.tabSummary.classList.remove('hidden');
    await renderMonthlySummary();
  } else if (tabId === 'settings') {
    el.navSettings.classList.add('active');
    el.tabSettings.classList.remove('hidden');
    renderSettingsView();
  }
}

// ==========================================
// 3. CONTROLES DE FECHAS
// ==========================================

function initDateControls() {
  // Ajustar el picker de fecha al valor de currentDate
  el.datePickerInput.value = currentDate;

  el.datePickerInput.addEventListener('change', async (e) => {
    currentDate = e.target.value;
    await updateAppView();
  });

  // Botón para abrir el input de fecha (calendario)
  document.getElementById('btn-open-calendar').addEventListener('click', () => {
    el.datePickerInput.showPicker();
  });
}

function renderDateSlider() {
  el.dateSlider.innerHTML = '';
  
  const [year, month, day] = currentDate.split('-').map(Number);
  const current = new Date(year, month - 1, day);
  
  // Generar un rango de 7 días centrado en currentDate (-3 días y +3 días)
  const daysToShow = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(current);
    d.setDate(current.getDate() + i);
    daysToShow.push(d);
  }

  const daysAbbr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  daysToShow.forEach(dateObj => {
    const dateStr = getLocalDateString(dateObj);
    const isSelected = dateStr === currentDate;
    const isToday = dateStr === getLocalDateString(new Date());

    const dayCard = document.createElement('div');
    dayCard.className = `date-card ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`;
    dayCard.innerHTML = `
      <span class="day-name">${daysAbbr[dateObj.getDay()]}</span>
      <span class="day-num">${dateObj.getDate()}</span>
      <span class="month-name">${monthsAbbr[dateObj.getMonth()]}</span>
    `;

    dayCard.addEventListener('click', async () => {
      currentDate = dateStr;
      el.datePickerInput.value = currentDate;
      await updateAppView();
    });

    el.dateSlider.appendChild(dayCard);
  });
}

function formatFullDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  return `${days[dateObj.getDay()]}, ${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
}

// ==========================================
// 4. OPERACIONES DE TAREAS (CRUD)
// ==========================================

function initTaskOperations() {
  // Configuración de los modales
  el.btnOpenAddModal.addEventListener('click', () => openTaskModal());
  el.btnCancelTask.addEventListener('click', closeTaskModal);
  
  // Cerrar modal haciendo clic fuera de él
  el.taskModal.addEventListener('click', (e) => {
    if (e.target === el.taskModal) closeTaskModal();
  });

  // Envío del formulario de tareas
  el.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskData = {
      title: el.taskInputTitle.value.trim(),
      description: el.taskInputDesc.value.trim(),
      date: el.taskInputDate.value,
      time: el.taskInputTime.value,
      category: el.taskInputCategory.value,
    };

    if (!taskData.title) return;

    try {
      showLoadingState();
      
      const shouldSync = el.taskInputSync.checked && calendar.isCalendarConnected();

      if (editingTaskId) {
        // ACTUALIZAR TAREA EXISTENTE
        const originalTasks = await storage.getTasks();
        const originalTask = originalTasks.find(t => t.id === editingTaskId);
        const updatedTask = {
          ...originalTask,
          ...taskData,
          id: editingTaskId
        };

        // Si ya estaba sincronizada o ahora se requiere sincronizar
        if (shouldSync) {
          if (originalTask.googleEventId) {
            // Actualizar evento en Google
            await calendar.updateCalendarEvent(originalTask.googleEventId, updatedTask);
            updatedTask.synced = true;
          } else {
            // Crear nuevo evento
            const eventId = await calendar.createCalendarEvent(updatedTask);
            updatedTask.googleEventId = eventId;
            updatedTask.synced = !!eventId;
          }
        } else if (originalTask.googleEventId) {
          // Desvincular de Google: eliminamos el evento si el usuario desmarca la sync
          await calendar.deleteCalendarEvent(originalTask.googleEventId);
          updatedTask.googleEventId = null;
          updatedTask.synced = false;
        }

        await storage.updateTask(updatedTask);
      } else {
        // CREAR TAREA NUEVA
        let googleEventId = null;
        if (shouldSync) {
          googleEventId = await calendar.createCalendarEvent({
            ...taskData,
            completed: false
          });
        }
        
        await storage.addTask({
          ...taskData,
          googleEventId
        });
      }

      closeTaskModal();
      await updateAppView();
    } catch (error) {
      alert('Error al sincronizar con Google Calendar: ' + error.message);
      // Guardar localmente de todos modos
      if (editingTaskId) {
        await storage.updateTask({ id: editingTaskId, ...taskData });
      } else {
        await storage.addTask(taskData);
      }
      closeTaskModal();
      await updateAppView();
    } finally {
      hideLoadingState();
    }
  });

  // Agregar por barra rápida (Quick Add)
  el.btnQuickAdd.addEventListener('click', handleQuickAdd);
  el.quickAddInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') handleQuickAdd();
  });
}

async function handleQuickAdd() {
  const title = el.quickAddInput.value.trim();
  if (!title) return;
  
  await storage.addTask({
    title,
    date: currentDate,
    category: 'Personal'
  });
  
  el.quickAddInput.value = '';
  await updateAppView();
}

function openTaskModal(task = null) {
  if (task) {
    editingTaskId = task.id;
    el.modalTitle.textContent = 'Editar Tarea';
    el.taskInputTitle.value = task.title;
    el.taskInputDesc.value = task.description || '';
    el.taskInputDate.value = task.date;
    el.taskInputTime.value = task.time || '';
    el.taskInputCategory.value = task.category || 'Personal';
    el.taskInputSync.checked = !!task.googleEventId;
  } else {
    editingTaskId = null;
    el.modalTitle.textContent = 'Nueva Tarea';
    el.taskForm.reset();
    el.taskInputDate.value = currentDate;
    // Autocheck sync si calendar está conectado por defecto
    el.taskInputSync.checked = calendar.isCalendarConnected();
  }

  // Ocultar opción de sync si Google Calendar no está conectado
  const syncWrapper = document.getElementById('sync-checkbox-wrapper');
  if (calendar.isCalendarConnected()) {
    syncWrapper.classList.remove('hidden');
  } else {
    syncWrapper.classList.add('hidden');
    el.taskInputSync.checked = false;
  }

  el.taskModal.classList.remove('hidden');
  el.taskModal.classList.add('flex');
  setTimeout(() => el.taskModal.classList.add('active'), 10);
  el.taskInputTitle.focus();
}

function closeTaskModal() {
  el.taskModal.classList.remove('active');
  setTimeout(() => {
    el.taskModal.classList.remove('flex');
    el.taskModal.classList.add('hidden');
  }, 300);
}

// Renderizar tareas locales y calendario en la vista diaria
async function renderTasks() {
  const allTasks = await storage.getTasks();
  const dayTasks = allTasks.filter(t => t.date === currentDate);
  
  const pending = dayTasks.filter(t => !t.completed);
  const completed = dayTasks.filter(t => t.completed);

  // Actualizar métricas del día
  const total = dayTasks.length;
  const done = completed.length;
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
  
  el.progressBar.style.width = `${progressPercent}%`;
  el.tasksProgressText.textContent = total > 0 ? `${done} de ${total} completadas (${progressPercent}%)` : 'No hay tareas para hoy';

  // Renderizar Pendientes
  el.pendingTasksList.innerHTML = '';
  if (pending.length === 0) {
    el.pendingTasksList.innerHTML = `<div class="empty-state">No hay tareas pendientes. ¡Buen trabajo!</div>`;
  } else {
    pending.forEach(task => {
      el.pendingTasksList.appendChild(createTaskCard(task));
    });
  }

  // Renderizar Completadas
  el.completedTasksList.innerHTML = '';
  if (completed.length === 0) {
    el.completedTasksList.innerHTML = `<div class="empty-state">Ninguna tarea completada aún hoy.</div>`;
  } else {
    completed.forEach(task => {
      el.completedTasksList.appendChild(createTaskCard(task));
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card ${task.completed ? 'completed' : ''}`;
  card.style.borderLeftColor = getCategoryColor(task.category);

  const iconName = task.completed ? 'check-circle' : 'circle';
  
  card.innerHTML = `
    <button class="btn-check" aria-label="Completar tarea">
      <i data-lucide="${iconName}" class="icon-check"></i>
    </button>
    <div class="task-info">
      <h3 class="task-title-text">${escapeHTML(task.title)}</h3>
      ${task.description ? `<p class="task-desc-text">${escapeHTML(task.description)}</p>` : ''}
      <div class="task-badges">
        <span class="badge badge-category" style="background-color: ${getCategoryColorLight(task.category)}; color: ${getCategoryColor(task.category)}">${task.category}</span>
        ${task.time ? `<span class="badge badge-time"><i data-lucide="clock"></i> ${task.time}</span>` : ''}
        ${task.googleEventId ? `<span class="badge badge-sync" title="Sincronizado con Google Calendar"><i data-lucide="calendar"></i> Sincronizado</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="btn-action btn-edit" title="Editar tarea" aria-label="Editar">
        <i data-lucide="edit-3"></i>
      </button>
      <button class="btn-action btn-delete" title="Eliminar tarea" aria-label="Eliminar">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  // Controladores de eventos de la tarjeta
  const btnCheck = card.querySelector('.btn-check');
  btnCheck.addEventListener('click', () => handleToggleComplete(task));

  const btnEdit = card.querySelector('.btn-edit');
  btnEdit.addEventListener('click', () => openTaskModal(task));

  const btnDelete = card.querySelector('.btn-delete');
  btnDelete.addEventListener('click', () => handleDeleteTask(task));

  return card;
}

async function handleToggleComplete(task) {
  showLoadingState();
  const updatedTask = {
    ...task,
    completed: !task.completed
  };

  try {
    if (updatedTask.googleEventId && calendar.isCalendarConnected()) {
      await calendar.updateCalendarEvent(updatedTask.googleEventId, updatedTask);
    }
  } catch (err) {
    console.error('Error al actualizar estado en Google Calendar:', err);
  }

  await storage.updateTask(updatedTask);
  hideLoadingState();
  await updateAppView();
}

async function handleDeleteTask(task) {
  if (confirm(`¿Estás seguro de que quieres eliminar la tarea "${task.title}"?`)) {
    showLoadingState();
    try {
      if (task.googleEventId && calendar.isCalendarConnected()) {
        await calendar.deleteCalendarEvent(task.googleEventId);
      }
    } catch (err) {
      console.error('Error al eliminar en Google Calendar:', err);
    }
    
    await storage.deleteTask(task.id);
    hideLoadingState();
    await updateAppView();
  }
}

function getCategoryColor(category) {
  const colors = {
    'Trabajo': '#6366f1', // Indigo
    'Personal': '#ec4899', // Pink
    'Estudio': '#f59e0b', // Amber
    'Salud': '#10b981', // Emerald
    'Otros': '#64748b' // Slate
  };
  return colors[category] || '#64748b';
}

function getCategoryColorLight(category) {
  const colors = {
    'Trabajo': 'rgba(99, 102, 241, 0.1)',
    'Personal': 'rgba(236, 72, 153, 0.1)',
    'Estudio': 'rgba(245, 158, 11, 0.1)',
    'Salud': 'rgba(16, 185, 129, 0.1)',
    'Otros': 'rgba(100, 116, 139, 0.1)'
  };
  return colors[category] || 'rgba(100, 116, 139, 0.1)';
}

// ==========================================
// 5. RENDERIZAR EVENTOS DE GOOGLE CALENDAR
// ==========================================

async function fetchAndRenderGoogleEvents() {
  if (!calendar.isCalendarConnected()) {
    el.calendarEventsSection.classList.add('hidden');
    return;
  }

  if (isFetchingGoogleEvents) return;
  isFetchingGoogleEvents = true;

  el.calendarEventsSection.classList.remove('hidden');
  el.calendarEventsList.innerHTML = `<div class="loading-spinner-small">Cargando eventos de Google Calendar...</div>`;

  try {
    googleEvents = await calendar.fetchCalendarEvents(currentDate);
    
    // Filtrar los eventos que fueron creados desde nuestra app para evitar duplicados en la visualización
    // (nuestras tareas ya se dibujan arriba, y el usuario puede querer ver el resto de sus eventos de Google Calendar)
    const externalEvents = googleEvents.filter(event => {
      const isCreatedByApp = event.description && event.description.includes('[Creada en Minimal Tasks]');
      return !isCreatedByApp;
    });

    el.calendarEventsList.innerHTML = '';
    
    if (externalEvents.length === 0) {
      el.calendarEventsList.innerHTML = `<div class="empty-state">No hay eventos adicionales en Google Calendar para hoy.</div>`;
    } else {
      externalEvents.forEach(event => {
        const item = document.createElement('div');
        item.className = 'gcal-event-card';
        
        let timeStr = 'Todo el día';
        if (event.start && event.start.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          timeStr = `${formatTime(start)} - ${formatTime(end)}`;
        }

        item.innerHTML = `
          <div class="gcal-event-icon" title="Evento de Google Calendar">
            <i data-lucide="calendar-days"></i>
          </div>
          <div class="gcal-event-info">
            <h4 class="gcal-event-title">${escapeHTML(event.summary || '(Sin título)')}</h4>
            <span class="gcal-event-time"><i data-lucide="clock"></i> ${timeStr}</span>
            ${event.description ? `<p class="gcal-event-desc">${escapeHTML(event.description)}</p>` : ''}
          </div>
          <button class="btn-import-task" title="Importar como tarea local">
            <i data-lucide="plus"></i> Importar
          </button>
        `;

        // Permitir importar el evento de Google como una tarea de la app
        const btnImport = item.querySelector('.btn-import-task');
        btnImport.addEventListener('click', async () => {
          let time = '';
          if (event.start && event.start.dateTime) {
            const start = new Date(event.start.dateTime);
            time = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
          }

          await storage.addTask({
            title: event.summary || 'Evento de Google',
            description: event.description || '',
            date: currentDate,
            time: time,
            category: 'Trabajo',
            googleEventId: event.id
          });
          
          await updateAppView();
        });

        el.calendarEventsList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Error cargando eventos:', error);
    el.calendarEventsList.innerHTML = `<div class="error-state">Error al conectar con Google: ${error.message}</div>`;
  } finally {
    isFetchingGoogleEvents = false;
    if (window.lucide) window.lucide.createIcons();
  }
}

function formatTime(dateObj) {
  return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
}

// ==========================================
// 6. OPERACIONES DE CONFIGURACIÓN (SETTINGS)
// ==========================================

async function initCalendarAPI() {
  let settings = { clientId: '' };
  try {
    settings = await storage.getSettings();
  } catch (error) {
    console.error("Error al obtener ajustes para Calendar API:", error);
  }
  
  // Escuchar eventos de cambio de autenticación de Google
  window.addEventListener('calendar-auth-changed', async (e) => {
    updateGoogleCalendarStatusUI(e.detail.connected);
    // Recargar vista si estamos en tareas
    if (activeTab === 'tasks') {
      await updateAppView();
    }
  });

  window.addEventListener('calendar-auth-error', (e) => {
    alert('Ocurrió un error al autenticar con Google. Verifica que el Client ID sea correcto y que tu cuenta esté autorizada.');
    updateGoogleCalendarStatusUI(false);
  });

  // Si se cuenta con Client ID, inicializar el cliente GIS
  if (settings.clientId) {
    // Retrasar levemente la inicialización por si el script de Google tarda en cargar
    setTimeout(() => {
      calendar.initCalendarClient(settings.clientId);
      if (calendar.isCalendarConnected()) {
        updateGoogleCalendarStatusUI(true);
      }
    }, 500);
  }
}

async function initSettingsOperations() {
  el.settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = el.inputClientId.value.trim();
    
    if (!clientId) {
      alert('Por favor ingresa un Client ID válido.');
      return;
    }

    await storage.saveSettings({ clientId });
    calendar.initCalendarClient(clientId);
    alert('Configuración guardada e inicializada con éxito.');
    renderSettingsView();
  });

  el.btnConnectGoogle.addEventListener('click', () => {
    try {
      calendar.connectCalendar();
    } catch (error) {
      alert(error.message);
    }
  });

  el.btnDisconnectGoogle.addEventListener('click', () => {
    calendar.disconnectCalendar();
    alert('Desconectado de Google Calendar.');
  });
}

async function renderSettingsView() {
  const settings = await storage.getSettings();
  el.inputClientId.value = settings.clientId || '';
  
  const connected = calendar.isCalendarConnected();
  updateGoogleCalendarStatusUI(connected);
}

async function updateGoogleCalendarStatusUI(connected) {
  const settings = await storage.getSettings();
  
  if (!settings.clientId) {
    el.calendarStatus.className = 'status-badge status-disconnected';
    el.calendarStatus.innerHTML = `<i data-lucide="alert-triangle"></i> Requiere Client ID`;
    el.btnConnectGoogle.classList.add('hidden');
    el.btnDisconnectGoogle.classList.add('hidden');
    return;
  }

  if (connected) {
    el.calendarStatus.className = 'status-badge status-connected';
    el.calendarStatus.innerHTML = `<i data-lucide="check-circle-2"></i> Conectado`;
    el.btnConnectGoogle.classList.add('hidden');
    el.btnDisconnectGoogle.classList.remove('hidden');
  } else {
    el.calendarStatus.className = 'status-badge status-disconnected';
    el.calendarStatus.innerHTML = `<i data-lucide="x-circle"></i> Desconectado`;
    el.btnConnectGoogle.classList.remove('hidden');
    el.btnDisconnectGoogle.classList.add('hidden');
  }
  
  if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// 7. OPERACIONES DE RESUMEN MENSUAL
// ==========================================

function initSummaryOperations() {
  // Configurar el selector de mes con el mes actual
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
  
  // Rellenar selector de meses (últimos 12 meses)
  el.summaryMonthSelect.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${months[d.getMonth()]} de ${d.getFullYear()}`;
    el.summaryMonthSelect.appendChild(option);
  }

  el.summaryMonthSelect.value = currentMonthKey;
  el.summaryMonthSelect.addEventListener('change', renderMonthlySummary);
}

async function renderMonthlySummary() {
  const selectedMonth = el.summaryMonthSelect.value;
  const allTasks = await storage.getTasks();
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  
  summary.initMonthlySummary(allTasks, selectedMonth, theme);
}

// ==========================================
// 8. AUXILIARES / UTILIDADES
// ==========================================

async function updateAppView() {
  el.selectedDateText.textContent = formatFullDate(currentDate);
  renderDateSlider();
  
  try {
    await renderTasks();
  } catch (error) {
    console.error("Error al cargar tareas:", error);
    hideLoadingState();
    el.tasksProgressText.textContent = 'Error de conexión';
    el.progressBar.style.width = '0%';
    el.pendingTasksList.innerHTML = `<div class="empty-state" style="color: #ef4444;"><i data-lucide="alert-circle" style="width: 24px; height: 24px; margin-bottom: 8px;"></i><br>Error al conectar con la base de datos.<br>${error.message}</div>`;
    el.completedTasksList.innerHTML = '';
  }

  try {
    await fetchAndRenderGoogleEvents();
  } catch (error) {
    console.error("Error al cargar Google Calendar:", error);
  }
  
  if (window.lucide) window.lucide.createIcons();
}

function showLoadingState() {
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('loading-overlay').classList.add('flex');
}

function hideLoadingState() {
  document.getElementById('loading-overlay').classList.remove('flex');
  document.getElementById('loading-overlay').classList.add('hidden');
}

function escapeHTML(str) {
  if (!str) return '';
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

// Handler de carga global en caso de que Google GIS se cargue después
window.gisLoaded = async function() {
  const settings = await storage.getSettings();
  if (settings.clientId) {
    calendar.initCalendarClient(settings.clientId);
    renderSettingsView();
  }
};
