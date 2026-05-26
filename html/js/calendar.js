// Módulo de integración con Google Calendar API (v3)

let tokenClient = null;
let accessToken = sessionStorage.getItem('google_calendar_access_token') || null;

/**
 * Verificar si la aplicación está conectada con Google Calendar (tiene un token guardado).
 * @returns {boolean}
 */
export function isCalendarConnected() {
  return !!accessToken;
}

/**
 * Obtener el token de acceso actual.
 * @returns {string|null}
 */
export function getAccessToken() {
  return accessToken;
}

/**
 * Inicializar el cliente de Google Identity Services.
 * @param {string} clientId - El Client ID del proyecto de Google Cloud.
 */
export function initCalendarClient(clientId) {
  if (!clientId) return;
  
  try {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            console.error('Error de OAuth:', tokenResponse.error);
            window.dispatchEvent(new CustomEvent('calendar-auth-error', { detail: tokenResponse }));
            return;
          }
          
          accessToken = tokenResponse.access_token;
          sessionStorage.setItem('google_calendar_access_token', accessToken);
          window.dispatchEvent(new CustomEvent('calendar-auth-changed', { detail: { connected: true } }));
        },
      });
      console.log('Cliente OAuth de Google Calendar inicializado.');
    } else {
      console.warn('El script de Google Identity Services no se ha cargado aún.');
    }
  } catch (error) {
    console.error('Error al inicializar el cliente GIS:', error);
  }
}

/**
 * Iniciar el flujo de inicio de sesión con Google para obtener el token de acceso.
 */
export function connectCalendar() {
  if (!tokenClient) {
    throw new Error('El cliente de Google no está inicializado. Verifica el Client ID en Ajustes.');
  }
  // Solicita el token. Abrirá el popup de Google.
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 * Cerrar sesión en Google Calendar limpiando el token.
 */
export function disconnectCalendar() {
  if (accessToken) {
    try {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        window.google.accounts.oauth2.revoke(accessToken, () => {
          console.log('Token de Google revocado.');
        });
      }
    } catch (e) {
      console.warn('No se pudo revocar el token en los servidores de Google, limpiando localmente:', e);
    }
  }
  accessToken = null;
  sessionStorage.removeItem('google_calendar_access_token');
  window.dispatchEvent(new CustomEvent('calendar-auth-changed', { detail: { connected: false } }));
}

/**
 * Realizar una llamada HTTP fetch a la API de Google Calendar.
 * @param {string} endpoint - El endpoint relativo de la API.
 * @param {Object} options - Opciones de fetch (método, body, etc.).
 * @returns {Promise<Object>} La respuesta en formato JSON.
 */
async function makeRequest(endpoint, options = {}) {
  if (!accessToken) {
    throw new Error('No conectado a Google Calendar. Por favor inicia sesión.');
  }

  const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
  
  // Clonar las cabeceras e inyectar el token de autorización
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // El token ha expirado o no es válido
    disconnectCalendar();
    throw new Error('La sesión de Google ha expirado. Por favor conéctate de nuevo.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error en la API de Google Calendar: ${response.status}`);
  }

  if (response.status === 204) {
    return null; // No content (ej. DELETE exitoso)
  }

  return response.json();
}

/**
 * Obtener los eventos del calendario nativos de Google para un día específico.
 * @param {string} dateString - Fecha en formato YYYY-MM-DD.
 * @returns {Promise<Array>} Lista de eventos de Google Calendar.
 */
export async function fetchCalendarEvents(dateString) {
  if (!accessToken) return [];

  // Calcular el inicio y fin del día en UTC
  const timeMin = new Date(`${dateString}T00:00:00`).toISOString();
  const timeMax = new Date(`${dateString}T23:59:59`).toISOString();

  try {
    const data = await makeRequest(`/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`);
    return data.items || [];
  } catch (error) {
    console.error('Error al obtener eventos de Google Calendar:', error);
    throw error;
  }
}

/**
 * Crear un evento en Google Calendar basado en una tarea de la aplicación.
 * @param {Object} task - La tarea creada en la aplicación.
 * @returns {Promise<string>} El ID del evento creado en Google.
 */
export async function createCalendarEvent(task) {
  if (!accessToken) return null;

  const eventBody = {
    summary: task.completed ? `✅ ${task.title}` : task.title,
    description: `${task.description}\n\n[Creada en Minimal Tasks]`,
  };

  if (task.time) {
    // Tarea con hora específica. Añadimos 1 hora por defecto para el fin del evento.
    const startDateTime = `${task.date}T${task.time}:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

    // Obtener offset de zona horaria local para que se guarde en la hora local correcta del usuario
    eventBody.start = { dateTime: startDate.toISOString() };
    eventBody.end = { dateTime: endDate.toISOString() };
  } else {
    // Evento de todo el día.
    // En Google Calendar, el día de fin de un evento de todo el día es exclusivo (el día después).
    const start = task.date;
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = nextDay.toISOString().split('T')[0];

    eventBody.start = { date: start };
    eventBody.end = { date: end };
  }

  try {
    const event = await makeRequest('/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(eventBody)
    });
    return event.id;
  } catch (error) {
    console.error('Error al crear evento en Google Calendar:', error);
    throw error;
  }
}

/**
 * Actualizar el estado o texto de un evento existente en Google Calendar.
 * @param {string} eventId - El ID del evento de Google.
 * @param {Object} task - La tarea actualizada.
 */
export async function updateCalendarEvent(eventId, task) {
  if (!accessToken || !eventId) return;

  const eventBody = {
    summary: task.completed ? `✅ ${task.title}` : task.title,
    description: `${task.description}\n\n[Creada en Minimal Tasks]`,
  };

  if (task.time) {
    const startDateTime = `${task.date}T${task.time}:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    eventBody.start = { dateTime: startDate.toISOString() };
    eventBody.end = { dateTime: endDate.toISOString() };
  } else {
    const start = task.date;
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = nextDay.toISOString().split('T')[0];

    eventBody.start = { date: start };
    eventBody.end = { date: end };
  }

  try {
    await makeRequest(`/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(eventBody)
    });
  } catch (error) {
    console.error('Error al actualizar evento de Google Calendar:', error);
    throw error;
  }
}

/**
 * Eliminar un evento en Google Calendar.
 * @param {string} eventId - El ID del evento de Google.
 */
export async function deleteCalendarEvent(eventId) {
  if (!accessToken || !eventId) return;

  try {
    await makeRequest(`/calendars/primary/events/${eventId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error al eliminar evento de Google Calendar:', error);
    // Si el evento fue eliminado manualmente en Google Calendar, puede dar 410 Gone o 404 Not Found.
    // Ignoramos estos errores para no bloquear al usuario en la app.
  }
}
