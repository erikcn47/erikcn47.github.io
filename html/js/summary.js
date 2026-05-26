// Módulo de estadísticas y resumen mensual

let completedChartInstance = null;
let categoryChartInstance = null;

/**
 * Obtener todos los días de un mes/año específico.
 * @param {number} year - Año.
 * @param {number} month - Mes (0-11).
 * @returns {Array<string>} Array de fechas en formato YYYY-MM-DD.
 */
function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    const dayStr = date.getDate().toString().padStart(2, '0');
    const monthStr = (date.getMonth() + 1).toString().padStart(2, '0');
    days.push(`${date.getFullYear()}-${monthStr}-${dayStr}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Nombre en español para un mes (0-11).
 * @param {number} monthIndex - Índice del mes.
 * @returns {string}
 */
function getMonthNameSpanish(monthIndex) {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthIndex];
}

/**
 * Nombre en español para un día de la semana.
 * @param {number} dayIndex - Índice del día (0-6).
 * @returns {string}
 */
function getDayNameSpanish(dayIndex) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayIndex];
}

/**
 * Procesar las tareas del mes seleccionado para generar estadísticas y resumen.
 * @param {Array} allTasks - Lista de todas las tareas.
 * @param {string} monthKey - Mes en formato "YYYY-MM".
 * @param {string} currentTheme - Tema actual ('light' o 'dark') para adaptar los colores de los gráficos.
 */
export function initMonthlySummary(allTasks, monthKey, currentTheme = 'dark') {
  const [year, month] = monthKey.split('-').map(Number);
  const monthIndex = month - 1;

  // Filtrar tareas que pertenecen al mes seleccionado
  const monthlyTasks = allTasks.filter(task => task.date.startsWith(monthKey));
  const completedTasks = monthlyTasks.filter(task => task.completed);
  
  // Calcular métricas principales
  const totalTasksCount = monthlyTasks.length;
  const completedTasksCount = completedTasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const syncedTasksCount = monthlyTasks.filter(task => task.synced).length;

  // Actualizar las métricas en la interfaz
  document.getElementById('metric-total-tasks').textContent = totalTasksCount;
  document.getElementById('metric-completed-tasks').textContent = completedTasksCount;
  document.getElementById('metric-completion-rate').textContent = `${completionRate}%`;
  document.getElementById('metric-synced-tasks').textContent = syncedTasksCount;

  // Renderizar gráficos
  renderCharts(monthlyTasks, year, monthIndex, currentTheme);

  // Generar resumen escrito inteligente
  generateWrittenSummary(monthlyTasks, completedTasks, monthIndex);
}

/**
 * Renderizar gráficos de Chart.js adaptados al tema visual.
 */
function renderCharts(monthlyTasks, year, monthIndex, currentTheme) {
  // Destruir instancias previas si existen
  if (completedChartInstance) completedChartInstance.destroy();
  if (categoryChartInstance) categoryChartInstance.destroy();

  if (!window.Chart) {
    console.error('Chart.js no está cargado.');
    return;
  }

  // Estilos según el tema (Claro / Oscuro)
  const isDark = currentTheme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 : slate-500
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  const accentColor = '#8b5cf6'; // Violet-500
  const accentColorLight = 'rgba(139, 92, 246, 0.15)';

  // 1. Datos para el gráfico de Tareas Completadas Diarias
  const days = getDaysInMonth(year, monthIndex);
  const dailyLabels = days.map(d => d.split('-')[2]); // Solo los números de día "01", "02", ...
  const dailyCompletedCounts = days.map(dayStr => {
    return monthlyTasks.filter(t => t.date === dayStr && t.completed).length;
  });

  // Configuración del gráfico de línea diaria
  const ctxDaily = document.getElementById('chart-completed-daily').getContext('2d');
  completedChartInstance = new window.Chart(ctxDaily, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: 'Tareas Completadas',
        data: dailyCompletedCounts,
        borderColor: accentColor,
        backgroundColor: accentColorLight,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: accentColor,
        pointBorderColor: isDark ? '#0b0f19' : '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#ffffff' : '#0f172a',
          borderColor: accentColor,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => `Día ${items[0].label} de ${getMonthNameSpanish(monthIndex)}`,
            label: (item) => `${item.formattedValue} tarea(s) completada(s)`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Outfit, sans-serif' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { 
            color: textColor, 
            stepSize: 1,
            precision: 0,
            font: { family: 'Outfit, sans-serif' } 
          },
          min: 0
        }
      }
    }
  });

  // 2. Datos para el gráfico de Categorías
  const categories = ['Trabajo', 'Personal', 'Estudio', 'Salud', 'Otros'];
  const categoryColors = [
    '#6366f1', // Indigo (Trabajo)
    '#ec4899', // Pink (Personal)
    '#f59e0b', // Amber (Estudio)
    '#10b981', // Emerald (Salud)
    '#64748b'  // Slate (Otros)
  ];
  const categoryCounts = categories.map(cat => {
    return monthlyTasks.filter(t => t.category === cat).length;
  });

  const hasData = categoryCounts.some(count => count > 0);

  const ctxCategory = document.getElementById('chart-categories').getContext('2d');
  categoryChartInstance = new window.Chart(ctxCategory, {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: hasData ? categoryCounts : [1], // Mostrar un placeholder si no hay tareas
        backgroundColor: hasData ? categoryColors : [isDark ? '#1e293b' : '#e2e8f0'],
        borderWidth: isDark ? 2 : 1,
        borderColor: isDark ? '#1e293b' : '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { family: 'Outfit, sans-serif', size: 12 },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          enabled: hasData, // Desactivar tooltip si es el placeholder vacío
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#ffffff' : '#0f172a',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          padding: 10
        }
      },
      cutout: '70%'
    }
  });
}

/**
 * Generar un resumen de productividad redactado en español a partir del análisis de las tareas.
 */
function generateWrittenSummary(monthlyTasks, completedTasks, monthIndex) {
  const container = document.getElementById('summary-text-container');
  const monthName = getMonthNameSpanish(monthIndex);
  
  if (monthlyTasks.length === 0) {
    container.innerHTML = `
      <p class="summary-paragraph">No tienes tareas registradas para el mes de <strong>${monthName}</strong>.</p>
      <p class="summary-paragraph">Crea tareas en tu calendario de tareas y márcalas como completadas para poder generar tu resumen analítico de productividad.</p>
    `;
    return;
  }

  const total = monthlyTasks.length;
  const completed = completedTasks.length;
  const rate = Math.round((completed / total) * 100);

  // 1. Determinar el día de la semana más activo (en base a completadas)
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // D, L, M, MI, J, V, S
  completedTasks.forEach(task => {
    const [year, month, dayNum] = task.date.split('-').map(Number);
    const day = new Date(year, month - 1, dayNum).getDay();
    weekdayCounts[day]++;
  });

  let maxWeekdayVal = -1;
  let maxWeekdayIndex = -1;
  weekdayCounts.forEach((count, index) => {
    if (count > maxWeekdayVal && count > 0) {
      maxWeekdayVal = count;
      maxWeekdayIndex = index;
    }
  });

  // 2. Determinar la categoría con más tareas creadas
  const categories = ['Trabajo', 'Personal', 'Estudio', 'Salud', 'Otros'];
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: monthlyTasks.filter(t => t.category === cat).length,
    completed: monthlyTasks.filter(t => t.category === cat && t.completed).length
  }));

  categoryCounts.sort((a, b) => b.count - a.count);
  const primaryCategory = categoryCounts[0].count > 0 ? categoryCounts[0] : null;

  // 3. Redactar el texto
  let paragraphs = [];

  // Párrafo 1: Resumen general de volumen
  paragraphs.push(`
    Durante el mes de <strong>${monthName}</strong> has gestionado un volumen total de <strong>${total} tareas</strong>, 
    de las cuales has marcado como completadas <strong>${completed}</strong>. Esto representa una tasa de finalización 
    del <strong class="highlight-stat">${rate}%</strong>.
  `);

  // Párrafo 2: Datos de productividad y categoría estrella
  let p2 = '';
  if (primaryCategory) {
    p2 += `Tu área de enfoque principal ha sido la categoría de <strong>${primaryCategory.name}</strong>, que acumuló el ${Math.round((primaryCategory.count / total) * 100)}% de tu agenda mensual (${primaryCategory.count} tareas). `;
    if (primaryCategory.completed > 0) {
      p2 += `En esta categoría lograste completar <strong>${primaryCategory.completed} tareas</strong> con éxito. `;
    }
  }

  if (maxWeekdayIndex !== -1) {
    p2 += `Analizando tus hábitos, tu día de mayor efectividad en la semana suele ser el <strong>${getDayNameSpanish(maxWeekdayIndex)}</strong>, acumulando la mayor concentración de tareas completadas.`;
  }
  
  if (p2) {
    paragraphs.push(p2);
  }

  // Párrafo 3: Conclusiones y consejos basados en la tasa de éxito
  let p3 = '';
  if (rate >= 80) {
    p3 = `<strong>¡Excelente rendimiento!</strong> Has mantenido un ritmo de trabajo brillante este mes. Has logrado estructurar tus días y cumplir tus metas con una tasa sobresaliente de finalización. Para el próximo mes, continúa con este gran hábito, asegurándote de equilibrar las tareas demandantes con momentos de descanso.`;
  } else if (rate >= 50) {
    p3 = `<strong>Buen trabajo este mes.</strong> Has mantenido una consistencia sólida y completado la mayoría de tus responsabilidades importantes. Para optimizar aún más tu productividad el próximo mes, intenta agrupar tareas similares por bloques de tiempo y no dudes en posponer o descartar aquellas tareas secundarias que no aporten valor real.`;
  } else {
    p3 = `<strong>Un mes de ritmo más calmado.</strong> Has completado una parte de tus objetivos, pero muchas tareas han quedado pendientes. Esto suele ocurrir cuando fijamos metas demasiado amplias o imprecisas. Para el próximo mes, te recomendamos aplicar el minimalismo al máximo: planifica un máximo de 3 tareas clave al día e intenta desglosarlas en pasos extremadamente pequeños. ¡Cada pequeño paso cuenta!`;
  }
  paragraphs.push(p3);

  // Renderizar al contenedor
  container.innerHTML = paragraphs.map(p => `<p class="summary-paragraph">${p}</p>`).join('');
}
