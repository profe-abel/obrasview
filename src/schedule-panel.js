const ObraSchedule = (() => {
  let entries = null;
  let tasks = [];
  let panelVisible = false;

  function loadTasks() {
    try { tasks = JSON.parse(localStorage.getItem('obraview_schedule') || '[]'); } catch (e) { tasks = []; }
  }

  function saveTasks() {
    localStorage.setItem('obraview_schedule', JSON.stringify(tasks));
  }

  function init(entriesMap) {
    entries = entriesMap;
    loadTasks();
    if (tasks.length === 0) autoAssign();
    applyColors();
  }

  function autoAssign() {
    if (!entries) return;
    const storeys = new Map();
    for (const [, e] of entries) {
      const s = e.storey || 'Sin nivel';
      if (!storeys.has(s)) storeys.set(s, []);
      storeys.get(s).push(e);
    }

    const sorted = [...storeys.keys()].sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb || a.localeCompare(b);
    });

    const today = new Date();
    tasks = [];
    sorted.forEach((storey, i) => {
      const start = new Date(today);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const items = storeys.get(storey);
      const types = new Set(items.map(e => e.typeName));
      for (const type of types) {
        const count = items.filter(e => e.typeName === type).length;
        tasks.push({
          id: `task_${storey}_${type}_${i}`,
          storey, typeName: type,
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          count, status: 'pendiente',
        });
      }
    });
    saveTasks();
  }

  function getStatus(task) {
    const today = new Date().toISOString().slice(0, 10);
    if (task.status === 'completado') return 'completado';
    if (task.endDate < today) return 'atrasado';
    if (task.startDate <= today && task.endDate >= today) return 'progreso';
    return 'pendiente';
  }

  function applyColors() {
    if (!entries) return;
    const today = new Date().toISOString().slice(0, 10);
    const taskMap = new Map();
    for (const t of tasks) {
      const key = t.storey + '|' + t.typeName;
      taskMap.set(key, t);
    }

    const colorMap = { pendiente: 0x666688, progreso: 0x4a9eff, completado: 0x2ecc71, atrasado: 0xe74c3c };

    for (const [, entry] of entries) {
      const key = entry.storey + '|' + entry.typeName;
      const task = taskMap.get(key);
      const status = task ? getStatus(task) : 'pendiente';
      if (entry.mesh) {
        entry.mesh.traverse(node => {
          if (node.isMesh) {
            const color = colorMap[status] || 0x666688;
            if (node.material) {
              node.material = node.material.clone();
              node.material.color.setHex(color);
            }
          }
        });
      }
    }
  }

  function render() {
    const panel = getPanel();
    loadTasks();
    const statusCounts = { pendiente: 0, progreso: 0, completado: 0, atrasado: 0 };
    for (const t of tasks) {
      const s = getStatus(t);
      statusCounts[s] = (statusCounts[s] || 0) + t.count;
    }

    let html = `
      <div class="sch-header">
        <div class="sch-title">📅 Planificación</div>
        <button class="sch-close" onclick="ObraSchedule.togglePanel()">✕</button>
      </div>
      <div class="sch-summary">
        <span style="color:#666688">● ${statusCounts.pendiente||0}</span>
        <span style="color:#4a9eff">● ${statusCounts.progreso||0}</span>
        <span style="color:#2ecc71">● ${statusCounts.completado||0}</span>
        <span style="color:#e74c3c">● ${statusCounts.atrasado||0}</span>
        <button class="sch-auto" onclick="ObraSchedule.autoAssign(); ObraSchedule.render(); ObraSchedule.applyColors();">Auto</button>
      </div>
      <div class="sch-body">`;

    for (const t of tasks) {
      const status = getStatus(t);
      html += `<div class="sch-task" data-task-id="${t.id}">
        <div class="sch-task-info">
          <span class="sch-storey">${escapeHTML(t.storey)}</span>
          <span class="sch-type">${escapeHTML(t.typeName)}</span>
          <span class="sch-count">${t.count}</span>
        </div>
        <div class="sch-dates">
          <input type="date" class="sch-date" value="${t.startDate}" onchange="ObraSchedule.updateTask('${t.id}','startDate',this.value)">
          <span>→</span>
          <input type="date" class="sch-date" value="${t.endDate}" onchange="ObraSchedule.updateTask('${t.id}','endDate',this.value)">
          <span class="sch-status ${status}">${status}</span>
        </div>
      </div>`;
    }

    html += `</div>`;
    panel.innerHTML = html;
    panel.classList.add('visible');
    panelVisible = true;
  }

  function getPanel() {
    let panel = document.getElementById('schedule-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'schedule-panel';
      panel.className = 'schedule-panel';
      document.getElementById('app').appendChild(panel);
    }
    return panel;
  }

  function togglePanel() {
    if (panelVisible) {
      document.getElementById('schedule-panel')?.classList.remove('visible');
      panelVisible = false;
    } else {
      render();
    }
  }

  function updateTask(id, field, value) {
    const task = tasks.find(t => t.id === id);
    if (task) { task[field] = value; saveTasks(); applyColors(); }
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { init, render, togglePanel, updateTask, autoAssign, applyColors };
})();
