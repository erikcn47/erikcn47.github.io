// Módulo de almacenamiento local (localStorage)

const TASKS_KEY = 'minimal_tasks_app_tasks';
const SETTINGS_KEY = 'minimal_tasks_app_settings';

const DEFAULT_SETTINGS = {
  clientId: '',
  theme: 'dark',
  calendarEnabled: false,
  calendarName: 'primary'
};

/**
 * Obtener la lista de tareas guardadas.
 * @returns {Array} Array de tareas.
 */
export function getTasks() {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Guardar la lista de tareas.
 * @param {Array} tasks - Array de tareas a guardar.
 */
export function saveTasks(tasks) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

/**
 * Agregar una nueva tarea.
 * @param {Object} taskData - Datos de la tarea a agregar.
 * @returns {Object} La tarea creada con su ID.
 */
export function addTask(taskData) {
  const tasks = getTasks();
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title: taskData.title,
    description: taskData.description || '',
    date: taskData.date, // Formato YYYY-MM-DD
    time: taskData.time || '', // Formato HH:MM o vacío
    category: taskData.category || 'Personal',
    completed: false,
    googleEventId: taskData.googleEventId || null,
    synced: !!taskData.googleEventId,
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

/**
 * Actualizar una tarea existente.
 * @param {Object} updatedTask - Tarea con los cambios aplicados.
 * @returns {boolean} True si se actualizó correctamente, false en caso contrario.
 */
export function updateTask(updatedTask) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updatedTask };
    saveTasks(tasks);
    return true;
  }
  return false;
}

/**
 * Eliminar una tarea por su ID.
 * @param {string} taskId - ID de la tarea a eliminar.
 * @returns {Object|null} La tarea eliminada o null si no se encontró.
 */
export function deleteTask(taskId) {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    saveTasks(tasks);
    return deletedTask;
  }
  return null;
}

/**
 * Obtener la configuración de la aplicación.
 * @returns {Object} Configuración actual.
 */
export function getSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
}

/**
 * Guardar la configuración de la aplicación.
 * @param {Object} settings - Nueva configuración.
 */
export function saveSettings(settings) {
  const currentSettings = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...currentSettings, ...settings }));
}
