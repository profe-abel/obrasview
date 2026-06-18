const GanttView = (() => {
  let panelVisible = false;
  let currentTab = 'rubros';
  let editingRubroId = null;

  // Drag state
  let dragRubroId = null;
  let _moveDragTip = null;
  let dragMode = null; // 'left', 'right', 'move'
  let dragStartX = 0;
  let dragOrigStart = null;
  let dragOrigEnd = null;
  let dragChartWidth = 0;
  let dragTotalDays = 0;
  let dragMinDate = 0;

  function togglePanel() {
    if (panelVisible) {
      const panel = document.getElementById('gantt-panel');
      if (panel) panel.classList.remove('visible');
      panelVisible = false;
    } else {
      render();
    }
  }

  function render() {
    let panel = document.getElementById('gantt-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gantt-panel';
      panel.className = 'gantt-panel';
      document.getElementById('app').appendChild(panel);
    }
    panel.innerHTML = buildLayout();
    panel.classList.add('visible');
    panelVisible = true;
    showTab(currentTab);
    applyEventListeners(panel);
  }

  function buildLayout() {
    return `
      <div class="gantt-header">
        <div class="gantt-title">📊 Programación</div>
        <button class="gantt-close" data-action="close">✕</button>
      </div>
      <div class="gantt-tabs">
        <button class="gtab ${currentTab === 'rubros' ? 'active' : ''}" data-tab="rubros">Rubros</button>
        <button class="gtab ${currentTab === 'gantt' ? 'active' : ''}" data-tab="gantt">Gantt</button>
        <button class="gtab ${currentTab === 'colores' ? 'active' : ''}" data-tab="colores">3D</button>
        <button class="gtab ${currentTab === 'importar' ? 'active' : ''}" data-tab="importar">Importar</button>
      </div>
      <div class="gantt-body">
        <div class="gantt-tab-content" data-tab="rubros">${buildRubrosTab()}</div>
        <div class="gantt-tab-content" data-tab="gantt" style="display:none">${buildGanttTab()}</div>
        <div class="gantt-tab-content" data-tab="colores" style="display:none">${buildColoresTab()}</div>
        <div class="gantt-tab-content" data-tab="importar" style="display:none">${buildImportarTab()}</div>
      </div>
    `;
  }

  /* ==================== RUBROS TAB ==================== */

  function buildRubrosTab() {
    const rubros = ObraScheduleManager.getRubros();
    let html = `<div class="gr-actions"><button class="btn btn-primary" data-action="new-rubro">+ Nuevo Rubro</button></div>`;
    if (rubros.length === 0) {
      html += `<div class="gr-empty">Sin rubros. Creá uno nuevo o importá un CSV.</div>`;
    } else {
      html += `<div class="gr-list">`;
      for (const r of rubros) {
        const isEditing = editingRubroId === r.id;
        html += `<div class="gr-item" data-rubro-id="${r.id}">`;
        if (isEditing) {
          html += buildRubroForm(r);
        } else {
          html += buildRubroSummary(r);
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
    return html;
  }

  function buildRubroSummary(r) {
    const desde = r.startDate ? r.startDate.split('-').reverse().join('/') : '—';
    const hasta = r.endDate ? r.endDate.split('-').reverse().join('/') : '—';
    const filtros = (r.filters || []).map(f => {
      if (f.type === 'levelType') return `${f.storey} / ${f.typeName}`;
      if (f.type === 'expressIds') return `${f.eids.length} elementos`;
      if (f.type === 'nameMatch') return `Nombre: ${f.pattern}`;
      if (f.type === 'zRange') return `Z: ${f.zMin}–${f.zMax}m`;
      if (f.type === 'volumeRange') return `Vol: ${f.volMin}–${f.volMax}m³`;
      return '';
    }).filter(Boolean).join(', ');
    const av = Math.min(100, Math.max(0, r.avance || 0));
    return `
      <div class="gr-summary">
        <span class="gr-color" style="background:${r.color}"></span>
        <span class="gr-name" data-action="inline-edit" data-id="${r.id}">${esc(r.nombre)}</span>
        <span class="gr-dates">${desde} → ${hasta}</span>
      </div>
      <div class="gr-avance"><div class="gr-avance-fill" style="width:${av}%"></div></div>
      <div class="gr-meta">
        <span class="gr-filtros">${filtros || 'Sin asignación'}</span>
        <span class="gr-actions-small">
          <button class="gr-btn" data-action="edit-rubro" data-id="${r.id}">✎</button>
          <button class="gr-btn gr-btn-danger" data-action="delete-rubro" data-id="${r.id}">✕</button>
        </span>
      </div>
    `;
  }

  function buildRubroForm(r) {
    const storeys = ObraScheduleManager.getStoreys();
    const types = ObraScheduleManager.getTypeNames();
    const filtrosHTML = (r.filters || []).map((f, i) => {
      if (f.type === 'levelType') {
        return `<div class="gr-filtro-item">${esc(f.storey)} / ${esc(f.typeName)} <button class="gr-btn gr-btn-danger" data-action="remove-filter" data-idx="${i}">✕</button></div>`;
      }
      if (f.type === 'expressIds') {
        return `<div class="gr-filtro-item">${f.eids.length} elementos <button class="gr-btn gr-btn-danger" data-action="remove-filter" data-idx="${i}">✕</button></div>`;
      }
      if (f.type === 'nameMatch') {
        return `<div class="gr-filtro-item">Nombre: ${esc(f.pattern)} <button class="gr-btn gr-btn-danger" data-action="remove-filter" data-idx="${i}">✕</button></div>`;
      }
      if (f.type === 'zRange') {
        return `<div class="gr-filtro-item">Z: ${f.zMin}–${f.zMax}m <button class="gr-btn gr-btn-danger" data-action="remove-filter" data-idx="${i}">✕</button></div>`;
      }
      if (f.type === 'volumeRange') {
        return `<div class="gr-filtro-item">Vol: ${f.volMin}–${f.volMax}m³ <button class="gr-btn gr-btn-danger" data-action="remove-filter" data-idx="${i}">✕</button></div>`;
      }
      return '';
    }).join('');

    return `
      <div class="gr-form">
        <div class="gr-field">
          <label>Nombre</label>
          <input class="gr-input" id="grf-name" value="${esc(r.nombre)}">
        </div>
        <div class="gr-field">
          <label>Color</label>
          <input class="gr-input gr-color-input" id="grf-color" type="color" value="${r.color}">
        </div>
        <div class="gr-field-row">
          <div class="gr-field">
            <label>Inicio</label>
            <input class="gr-input" id="grf-start" type="date" value="${r.startDate || ''}">
          </div>
          <div class="gr-field">
            <label>Fin</label>
            <input class="gr-input" id="grf-end" type="date" value="${r.endDate || ''}">
          </div>
        </div>
        <div class="gr-field">
          <label>Avance: ${r.avance || 0}%</label>
          <input class="gr-input" id="grf-avance" type="range" min="0" max="100" value="${r.avance || 0}" style="accent-color:${r.color}">
        </div>
        <div class="gr-field">
          <label style="color:#4a9eff;font-weight:600">Asignación por nivel + tipo</label>
          <div class="gr-filtro-add">
            <select class="gr-input gr-select" id="grf-storey">
              <option value="">— Nivel —</option>
              ${storeys.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
            </select>
            <select class="gr-input gr-select" id="grf-type">
              <option value="">— Tipo —</option>
              ${types.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
            </select>
            <button class="gr-btn gr-btn-add" data-action="add-filter-lt">+</button>
          </div>
        </div>
        <div class="gr-field">
          <label style="color:#4a9eff;font-weight:600">Asignación por nombre (usa * comodín)</label>
          <div class="gr-filtro-add">
            <input class="gr-input" id="grf-name-pat" placeholder="Ej: Viga* , *Cimiento*" style="flex:1">
            <button class="gr-btn gr-btn-add" data-action="add-filter-name">+</button>
            <button class="gr-btn" data-action="preview-name" title="Vista previa">👁</button>
          </div>
        </div>
        <div class="gr-field">
          <label style="color:#4a9eff;font-weight:600">Asignación por altura Z</label>
          <div class="gr-filtro-add">
            <input class="gr-input" id="grf-zmin" type="number" step="0.1" placeholder="Z min (m)" style="flex:1">
            <span style="color:#555;font-size:11px">→</span>
            <input class="gr-input" id="grf-zmax" type="number" step="0.1" placeholder="Z max (m)" style="flex:1">
            <button class="gr-btn gr-btn-add" data-action="add-filter-z">+</button>
            <button class="gr-btn" data-action="preview-z" title="Vista previa">👁</button>
          </div>
        </div>
        <div class="gr-field">
          <label style="color:#4a9eff;font-weight:600">Asignación por volumen</label>
          <div class="gr-filtro-add">
            <input class="gr-input" id="grf-volmin" type="number" step="0.01" placeholder="Vol min (m³)" style="flex:1">
            <span style="color:#555;font-size:11px">→</span>
            <input class="gr-input" id="grf-volmax" type="number" step="0.01" placeholder="Vol max (m³)" style="flex:1">
            <button class="gr-btn gr-btn-add" data-action="add-filter-vol">+</button>
            <button class="gr-btn" data-action="preview-vol" title="Vista previa">👁</button>
          </div>
        </div>
        <div class="gr-field">
          <label style="color:#4a9eff;font-weight:600">Asignar selección actual</label>
          <div style="display:flex;gap:4px;align-items:center">
            <button class="gr-btn" data-action="assign-selection">Asignar (${ObraApp.getSelectedId() ? ObraApp.getSelectedId() : 'nada seleccionado'})</button>
          </div>
        </div>
        ${filtrosHTML ? `<div class="gr-filtros-list">${filtrosHTML}</div>` : ''}
        <div class="gr-form-actions">
          <button class="btn btn-primary" data-action="save-rubro" data-id="${r.id}">Guardar</button>
          <button class="btn btn-secondary" data-action="cancel-edit">Cancelar</button>
        </div>
      </div>
    `;
  }

  /* ==================== GANTT TAB ==================== */

  function buildGanttTab() {
    const rubros = ObraScheduleManager.getRubros().filter(r => r.startDate && r.endDate);
    if (rubros.length === 0) {
      return `<div class="gr-empty">Sin rubros con fechas. Creá rubros primero.</div>`;
    }

    const escala = ObraScheduleManager.getEscala();
    const sorted = [...rubros].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    let minDate = Infinity, maxDate = -Infinity;
    for (const r of sorted) {
      const s = new Date(r.startDate).getTime();
      const e = new Date(r.endDate).getTime();
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
    }
    if (minDate === Infinity) { minDate = Date.now(); maxDate = Date.now() + 86400000 * 30; }
    const dayMs = 86400000;
    const totalDays = Math.ceil((maxDate - minDate) / dayMs) || 1;

    let html = `
      <div class="gg-header">
        <span class="gg-title">Cronograma</span>
        <select class="gg-escala" data-action="set-escala">
          <option value="días" ${escala === 'días' ? 'selected' : ''}>Días</option>
          <option value="semanas" ${escala === 'semanas' ? 'selected' : ''}>Semanas</option>
          <option value="meses" ${escala === 'meses' ? 'selected' : ''}>Meses</option>
        </select>
      </div>
      <div class="gg-chart">
      <div class="gg-tooltip" id="gg-tooltip"></div>`;

    // Draw scale ticks
    const tickStep = escala === 'días' ? 1 : escala === 'semanas' ? 7 : 30;
    let ticks = [];
    for (let d = 0; d <= totalDays; d += tickStep) {
      const date = new Date(minDate + d * dayMs);
      ticks.push({ left: (d / totalDays) * 100, label: date.toLocaleDateString('es-ES', escala === 'días' ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: 'short' }) });
    }

    html += `<div class="gg-ticks">`;
    for (const t of ticks) {
      html += `<div class="gg-tick" style="left:${t.left}%">${t.label}</div>`;
    }
    html += `</div>`;

    // Draw grid lines
    html += `<div class="gg-grid">`;
    for (const t of ticks) {
      html += `<div class="gg-gridline" style="left:${t.left}%"></div>`;
    }
    html += `</div>`;

    // Today line
    const todayMs = Date.now();
    if (todayMs >= minDate && todayMs <= maxDate) {
      const todayLeft = ((todayMs - minDate) / dayMs) / totalDays * 100;
      html += `<div class="gg-today" style="left:${todayLeft}%"></div>`;
    }

    // Draw bars
    html += `<div class="gg-bars" id="gg-bars">`;
    for (const r of sorted) {
      const s = new Date(r.startDate).getTime();
      const e = new Date(r.endDate).getTime();
      const left = Math.max(0, ((s - minDate) / dayMs) / totalDays * 100);
      const width = Math.min(100 - left, ((e - s) / dayMs) / totalDays * 100);
      const asignados = ObraScheduleManager.getRubroEids(r).length;
      const av = Math.min(100, Math.max(0, r.avance || 0));
      html += `<div class="gg-bar-row" data-rubro-id="${r.id}">
        <div class="gg-bar-label">${esc(r.nombre)}</div>
        <div class="gg-bar-track">
          <div class="gg-bar" style="left:${left}%;width:${Math.max(width, 2)}%;background:${r.color}" data-rubro-id="${r.id}">
            <div class="gg-bar-fill" style="width:${av}%"></div>
            <div class="gg-bar-handle gg-handle-left" data-rubro-id="${r.id}"></div>
            <div class="gg-bar-handle gg-handle-right" data-rubro-id="${r.id}"></div>
          </div>
          <div class="gg-avance-slider" data-rubro-id="${r.id}">
            <input type="range" min="0" max="100" value="${av}" data-rubro-id="${r.id}" data-action="avance-slider" style="accent-color:${r.color}">
            <span class="gg-avance-pct" data-rubro-id="${r.id}">${av}%</span>
          </div>
        </div>
      </div>`;
    }
    html += `</div>`;

    html += `</div>`;
    return html;
  }

  /* ==================== COLORES TAB ==================== */

  function buildColoresTab() {
    const rubros = ObraScheduleManager.getRubros();
    let html = `
      <div class="gc-actions">
        <button class="btn btn-primary" data-action="apply-colors">Aplicar colores</button>
        <button class="btn btn-secondary" data-action="clear-colors">Limpiar</button>
        <button class="btn btn-secondary" data-action="generate-report" style="margin-left:auto">📄 Reporte PDF</button>
      </div>
      <div class="gc-leyenda">`;
    if (rubros.length === 0) {
      html += `<div class="gr-empty">Sin rubros. Creá rubros con asignación para ver colores.</div>`;
    } else {
      for (const r of rubros) {
        const count = ObraScheduleManager.getRubroEids(r).length;
        html += `<div class="gc-item">
          <span class="gc-swatch" style="background:${r.color}"></span>
          <span class="gc-name">${esc(r.nombre)}</span>
          <span class="gc-count">${count} elem.</span>
        </div>`;
      }
    }
    html += `</div>`;
    return html;
  }

  /* ==================== IMPORTAR TAB ==================== */

  function buildImportarTab() {
    return `
      <div class="gi-section">
        <label class="gi-label">📥 Importar CSV</label>
        <p class="gi-hint">Columnas: <code>Rubro, Inicio, Fin, Color, Avance, Nivel, Tipo</code></p>
        <input type="file" class="gi-file" accept=".csv" data-action="import-csv">
        <div id="gi-preview"></div>
      </div>
      <div class="gi-section">
        <label class="gi-label">📥 Importar XLSX (Excel)</label>
        <p class="gi-hint">Mismas columnas que CSV. Abre directo en Excel.</p>
        <input type="file" class="gi-file" accept=".xlsx,.xls" data-action="import-xlsx">
        <div id="gi-preview-xlsx"></div>
      </div>
      <div class="gi-section">
        <label class="gi-label">📤 Exportar</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-secondary" data-action="export-csv">CSV</button>
          <button class="btn btn-secondary" data-action="export-xlsx">XLSX</button>
          <button class="btn btn-secondary" data-action="export-json">JSON</button>
        </div>
      </div>
      <div class="gi-section">
        <label class="gi-label">📥 Importar JSON</label>
        <input type="file" class="gi-file" accept=".json" data-action="import-json">
      </div>
    `;
  }

  /* ==================== EVENTS ==================== */

  function applyEventListeners(panel) {
    // Tab switching
    panel.querySelectorAll('.gtab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        render();
      });
    });

    // Close
    panel.querySelector('[data-action="close"]')?.addEventListener('click', togglePanel);

    // New rubro
    panel.querySelector('[data-action="new-rubro"]')?.addEventListener('click', () => {
      editingRubroId = '__new__';
      render();
    });

    // Edit rubro
    panel.querySelectorAll('[data-action="edit-rubro"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingRubroId = btn.dataset.id;
        render();
      });
    });

    // Inline name edit
    panel.querySelectorAll('[data-action="inline-edit"]').forEach(el => {
      el.addEventListener('dblclick', () => {
        const id = el.dataset.id;
        editingRubroId = id;
        render();
      });
    });

    // Cancel edit
    panel.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => {
      editingRubroId = null;
      render();
    });

    // Delete rubro
    panel.querySelectorAll('[data-action="delete-rubro"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este rubro?')) {
          ObraScheduleManager.deleteRubro(btn.dataset.id);
          render();
        }
      });
    });

    // Save rubro
    panel.querySelector('[data-action="save-rubro"]')?.addEventListener('click', () => {
      const name = document.getElementById('grf-name')?.value.trim();
      if (!name) { alert('Escribí un nombre'); return; }
      const color = document.getElementById('grf-color')?.value || '#999999';
      const startDate = document.getElementById('grf-start')?.value || '';
      const endDate = document.getElementById('grf-end')?.value || '';
      const avanceEl = document.getElementById('grf-avance');
      const avance = avanceEl ? parseInt(avanceEl.value) : 0;
      const id = editingRubroId;
      const existing = ObraScheduleManager.getRubros().find(r => r.id === id);
      const data = { nombre: name, color, startDate, endDate, avance };
      if (existing) {
        data.filters = existing.filters || [];
      } else {
        data.filters = [];
      }
      if (id === '__new__') {
        ObraScheduleManager.addRubro(data);
      } else {
        ObraScheduleManager.updateRubro(id, data);
      }
      editingRubroId = null;
      render();
    });

    // Add level+type filter
    panel.querySelector('[data-action="add-filter-lt"]')?.addEventListener('click', () => {
      const storey = document.getElementById('grf-storey')?.value;
      const typeName = document.getElementById('grf-type')?.value;
      if (!storey || !typeName) { alert('Seleccioná nivel y tipo'); return; }
      const id = editingRubroId;
      const rubros = ObraScheduleManager.getRubros();
      let rubro = rubros.find(r => r.id === id);
      if (!rubro && id === '__new__') {
        rubro = { id: '__new__', filters: [] };
      }
      if (!rubro) return;
      const filters = [...(rubro.filters || [])];
      filters.push({ type: 'levelType', storey, typeName });
      if (id === '__new__') {
        const name = document.getElementById('grf-name')?.value.trim() || 'Nuevo rubro';
        const color = document.getElementById('grf-color')?.value || '#cccccc';
        const startDate = document.getElementById('grf-start')?.value || '';
        const endDate = document.getElementById('grf-end')?.value || '';
        const avance = parseInt(document.getElementById('grf-avance')?.value || '0');
        const newR = ObraScheduleManager.addRubro({ nombre: name, color, startDate, endDate, avance, filters });
        editingRubroId = newR.id;
        render();
      } else {
        ObraScheduleManager.updateRubro(id, { filters });
        render();
      }
    });

    // Add name pattern filter
    panel.querySelector('[data-action="add-filter-name"]')?.addEventListener('click', () => {
      const pattern = document.getElementById('grf-name-pat')?.value.trim();
      if (!pattern) { alert('Escribí un patrón de nombre'); return; }
      addFilterToRubro({ type: 'nameMatch', pattern });
    });

    // Preview name pattern filter
    panel.querySelector('[data-action="preview-name"]')?.addEventListener('click', () => {
      const pattern = document.getElementById('grf-name-pat')?.value.trim();
      if (!pattern) return;
      const eids = ObraScheduleManager.getRubroEids({ filters: [{ type: 'nameMatch', pattern }] });
      ObraViewer.clearHighlight();
      ObraViewer.previewElements(eids, 0x66bbff);
    });

    // Add Z range filter
    panel.querySelector('[data-action="add-filter-z"]')?.addEventListener('click', () => {
      const zMin = parseFloat(document.getElementById('grf-zmin')?.value);
      const zMax = parseFloat(document.getElementById('grf-zmax')?.value);
      if (isNaN(zMin) || isNaN(zMax)) { alert('Ingresá valores de altura Z'); return; }
      addFilterToRubro({ type: 'zRange', zMin, zMax });
    });

    // Preview Z range filter
    panel.querySelector('[data-action="preview-z"]')?.addEventListener('click', () => {
      const zMin = parseFloat(document.getElementById('grf-zmin')?.value);
      const zMax = parseFloat(document.getElementById('grf-zmax')?.value);
      if (isNaN(zMin) || isNaN(zMax)) return;
      const eids = ObraScheduleManager.getRubroEids({ filters: [{ type: 'zRange', zMin, zMax }] });
      ObraViewer.clearHighlight();
      ObraViewer.previewElements(eids, 0x66bbff);
    });

    // Add volume filter
    panel.querySelector('[data-action="add-filter-vol"]')?.addEventListener('click', () => {
      const volMin = parseFloat(document.getElementById('grf-volmin')?.value);
      const volMax = parseFloat(document.getElementById('grf-volmax')?.value);
      if (isNaN(volMin) || isNaN(volMax)) { alert('Ingresá valores de volumen'); return; }
      addFilterToRubro({ type: 'volumeRange', volMin, volMax });
    });

    // Preview volume filter
    panel.querySelector('[data-action="preview-vol"]')?.addEventListener('click', () => {
      const volMin = parseFloat(document.getElementById('grf-volmin')?.value);
      const volMax = parseFloat(document.getElementById('grf-volmax')?.value);
      if (isNaN(volMin) || isNaN(volMax)) return;
      const eids = ObraScheduleManager.getRubroEids({ filters: [{ type: 'volumeRange', volMin, volMax }] });
      ObraViewer.clearHighlight();
      ObraViewer.previewElements(eids, 0x66bbff);
    });

    // Assign current selection
    panel.querySelector('[data-action="assign-selection"]')?.addEventListener('click', () => {
      const selectedId = ObraApp.getSelectedId();
      if (!selectedId) { alert('Seleccioná un elemento en el modelo 3D primero'); return; }
      const id = editingRubroId;
      const rubros = ObraScheduleManager.getRubros();
      let rubro = rubros.find(r => r.id === id);
      if (!rubro && id === '__new__') {
        const name = document.getElementById('grf-name')?.value.trim() || 'Nuevo rubro';
        const color = document.getElementById('grf-color')?.value || '#cccccc';
        const startDate = document.getElementById('grf-start')?.value || '';
        const endDate = document.getElementById('grf-end')?.value || '';
        const avance = parseInt(document.getElementById('grf-avance')?.value || '0');
        const newR = ObraScheduleManager.addRubro({
          nombre: name, color, startDate, endDate, avance,
          filters: [{ type: 'expressIds', eids: [selectedId] }]
        });
        editingRubroId = newR.id;
        render();
        return;
      }
      if (!rubro) return;
      const filters = [...(rubro.filters || [])];
      const existingIdx = filters.findIndex(f => f.type === 'expressIds');
      if (existingIdx >= 0) {
        const eids = filters[existingIdx].eids;
        if (!eids.includes(selectedId)) eids.push(selectedId);
      } else {
        filters.push({ type: 'expressIds', eids: [selectedId] });
      }
      ObraScheduleManager.updateRubro(id, { filters });
      render();
    });

    // Remove filter
    panel.querySelectorAll('[data-action="remove-filter"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const id = editingRubroId;
        const rubro = ObraScheduleManager.getRubros().find(r => r.id === id);
        if (!rubro) return;
        const filters = [...(rubro.filters || [])];
        filters.splice(idx, 1);
        ObraScheduleManager.updateRubro(id, { filters });
        render();
      });
    });

    // Set escala
    panel.querySelector('[data-action="set-escala"]')?.addEventListener('change', (e) => {
      ObraScheduleManager.setEscala(e.target.value);
      render();
    });

    // Avance slider in Gantt (delegated)
    panel.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-action="avance-slider"]');
      if (!inp) return;
      const id = inp.dataset.rubroId;
      const val = parseInt(inp.value);
      const pct = panel.querySelector(`.gg-avance-pct[data-rubro-id="${id}"]`);
      if (pct) pct.textContent = val + '%';
    });
    panel.addEventListener('change', (e) => {
      const inp = e.target.closest('[data-action="avance-slider"]');
      if (!inp) return;
      const id = inp.dataset.rubroId;
      const val = parseInt(inp.value);
      ObraScheduleManager.updateRubro(id, { avance: val });
      const bars = document.getElementById('gg-bars');
      if (bars) {
        const chart = bars.closest('.gg-chart');
        if (chart) {
          const newContent = extractGanttContent();
          if (newContent) chart.innerHTML = newContent;
        }
      }
    });

    // Apply colors
    panel.querySelector('[data-action="apply-colors"]')?.addEventListener('click', () => {
      const colorMap = ObraScheduleManager.buildColorMap();
      ObraViewer.applyScheduleColors(colorMap);
    });

    // Clear colors
    panel.querySelector('[data-action="clear-colors"]')?.addEventListener('click', () => {
      ObraViewer.clearScheduleColors();
    });

    // Generate report
    panel.querySelector('[data-action="generate-report"]')?.addEventListener('click', () => {
      ObraReportView.generateReport();
    });

    // Import CSV
    panel.querySelector('[data-action="import-csv"]')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const rubros = ObraScheduleManager.importCSV(ev.target.result);
          const preview = document.getElementById('gi-preview');
          if (preview) {
            preview.innerHTML = `<div style="color:#2ecc71;padding:6px 0">✓ ${rubros.length} rubros leídos. <button class="btn btn-primary" data-action="confirm-import">Importar</button></div>`;
            preview.querySelector('[data-action="confirm-import"]')?.addEventListener('click', () => {
              for (const r of rubros) ObraScheduleManager.addRubro(r);
              editingRubroId = null;
              currentTab = 'rubros';
              render();
            });
          }
        } catch (err) {
          const preview = document.getElementById('gi-preview');
          if (preview) preview.innerHTML = `<div style="color:#e74c3c;padding:6px 0">✕ ${err.message}</div>`;
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Import JSON
    panel.querySelector('[data-action="import-json"]')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ObraScheduleManager.importJSON(file)
        .then(() => { alert('Programación importada'); editingRubroId = null; render(); })
        .catch(err => alert('Error: ' + err.message));
      e.target.value = '';
    });

    // Export CSV
    panel.querySelector('[data-action="export-csv"]')?.addEventListener('click', () => {
      ObraScheduleManager.exportCSV();
    });

    // Export XLSX
    panel.querySelector('[data-action="export-xlsx"]')?.addEventListener('click', () => {
      ObraScheduleManager.exportXLSX();
    });

    // Export JSON
    panel.querySelector('[data-action="export-json"]')?.addEventListener('click', () => {
      ObraScheduleManager.exportJSON();
    });

    // Import XLSX
    panel.querySelector('[data-action="import-xlsx"]')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ObraScheduleManager.importXLSX(file).then(rubros => {
        const preview = document.getElementById('gi-preview-xlsx');
        if (preview) {
          preview.innerHTML = `<div style="color:#2ecc71;padding:6px 0">✓ ${rubros.length} rubros leídos. <button class="btn btn-primary" data-action="confirm-import-xlsx">Importar</button></div>`;
          preview.querySelector('[data-action="confirm-import-xlsx"]')?.addEventListener('click', () => {
            for (const r of rubros) ObraScheduleManager.addRubro(r);
            editingRubroId = null;
            currentTab = 'rubros';
            render();
          });
        }
      }).catch(err => {
        const preview = document.getElementById('gi-preview-xlsx');
        if (preview) preview.innerHTML = `<div style="color:#e74c3c;padding:6px 0">✕ ${err.message}</div>`;
      });
      e.target.value = '';
    });

    // Gantt drag & drop
    setupGanttDrag(panel);

    // Gantt tooltip
    setupGanttTooltip(panel);
  }

  /* ==================== DRAG & DROP ==================== */

  function setupGanttDrag(panel) {
    const barsContainer = panel.querySelector('#gg-bars');
    if (!barsContainer) return;

    barsContainer.addEventListener('mousedown', (e) => {
      const bar = e.target.closest('.gg-bar');
      if (!bar) return;

      const rubroId = bar.dataset.rubroId;
      const rubro = ObraScheduleManager.getRubros().find(r => r.id === rubroId);
      if (!rubro || !rubro.startDate || !rubro.endDate) return;

      const track = bar.closest('.gg-bar-track');
      if (!track) return;

      const chart = bar.closest('.gg-chart');
      if (!chart) return;

      const rect = track.getBoundingClientRect();
      const chartRect = chart.querySelector('.gg-ticks')?.getBoundingClientRect();
      if (!chartRect) return;

      const relX = e.clientX - rect.left;

      // Compute global date range
      const rubros = ObraScheduleManager.getRubros().filter(r => r.startDate && r.endDate);
      let minDate = Infinity, maxDate = -Infinity;
      for (const r of rubros) {
        const s = new Date(r.startDate).getTime();
        const en = new Date(r.endDate).getTime();
        if (s < minDate) minDate = s;
        if (en > maxDate) maxDate = en;
      }
      if (minDate === Infinity) return;
      const dayMs = 86400000;
      const totalDays = Math.ceil((maxDate - minDate) / dayMs) || 1;

      // Determine drag mode
      const barWidth = bar.offsetWidth;
      const edgeZone = Math.min(10, barWidth * 0.25);
      let mode;
      if (relX < edgeZone) mode = 'left';
      else if (relX > barWidth - edgeZone) mode = 'right';
      else mode = 'move';

      dragRubroId = rubroId;
      dragMode = mode;
      dragStartX = e.clientX;
      dragOrigStart = rubro.startDate;
      dragOrigEnd = rubro.endDate;
      dragChartWidth = rect.width;
      dragTotalDays = totalDays;
      dragMinDate = minDate;

      document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragRubroId) return;
      const dx = e.clientX - dragStartX;
      const daysDelta = (dx / dragChartWidth) * dragTotalDays;

      const rubro = ObraScheduleManager.getRubros().find(r => r.id === dragRubroId);
      if (!rubro) return;

      let newStart, newEnd;
      const origS = new Date(dragOrigStart).getTime();
      const origE = new Date(dragOrigEnd).getTime();

      if (dragMode === 'left') {
        newStart = new Date(origS + daysDelta * 86400000);
        newEnd = new Date(origE);
      } else if (dragMode === 'right') {
        newStart = new Date(origS);
        newEnd = new Date(origE + daysDelta * 86400000);
      } else { // move
        newStart = new Date(origS + daysDelta * 86400000);
        newEnd = new Date(origE + daysDelta * 86400000);
      }

      // Don't allow dates to cross/invert
      if (newEnd <= newStart) return;

      const fmt = (d) => d.toISOString().slice(0, 10);
      const updates = { startDate: fmt(newStart), endDate: fmt(newEnd) };

      // Live preview on the bar
      const panel = document.getElementById('gantt-panel');
      if (panel) {
        const barEl = panel.querySelector(`.gg-bar[data-rubro-id="${dragRubroId}"]`);
        if (barEl) {
          // Recalculate position
          const left = Math.max(0, ((newStart.getTime() - dragMinDate) / 86400000) / dragTotalDays * 100);
          const width = Math.min(100 - left, ((newEnd.getTime() - newStart.getTime()) / 86400000) / dragTotalDays * 100);
          barEl.style.left = left + '%';
          barEl.style.width = Math.max(width, 2) + '%';
        }
        updateDragTooltip(rubro.nombre, updates.startDate, updates.endDate);
      }
    });

    document.addEventListener('mouseup', () => {
      if (!dragRubroId) return;
      // Clean up drag tip listener
      if (typeof _moveDragTip === 'function') {
        document.removeEventListener('mousemove', _moveDragTip);
        _moveDragTip = null;
      }
      const rubro = ObraScheduleManager.getRubros().find(r => r.id === dragRubroId);
      if (rubro) {
        // Use the computed values from the bar's CSS position
        const panel = document.getElementById('gantt-panel');
        if (panel) {
          const barEl = panel.querySelector(`.gg-bar[data-rubro-id="${dragRubroId}"]`);
          if (barEl) {
            const track = barEl.closest('.gg-bar-track');
            if (track) {
              const trackRect = track.getBoundingClientRect();
              const leftPct = parseFloat(barEl.style.left);
              const widthPct = parseFloat(barEl.style.width);

              const rubros = ObraScheduleManager.getRubros().filter(r => r.startDate && r.endDate);
              let minDate = Infinity, maxDate = -Infinity;
              for (const r of rubros) {
                const s = new Date(r.startDate).getTime();
                const en = new Date(r.endDate).getTime();
                if (s < minDate) minDate = s;
                if (en > maxDate) maxDate = en;
              }
              const dayMs = 86400000;
              const totalDays = Math.ceil((maxDate - minDate) / dayMs) || 1;

              const newStart = new Date(minDate + (leftPct / 100) * totalDays * dayMs);
              const newEnd = new Date(minDate + ((leftPct + widthPct) / 100) * totalDays * dayMs);

              const fmt = (d) => d.toISOString().slice(0, 10);
              ObraScheduleManager.updateRubro(dragRubroId, { startDate: fmt(newStart), endDate: fmt(newEnd) });
            }
          }
        }
      }
      dragRubroId = null;
      dragMode = null;
      document.body.style.cursor = '';
      hideDragTooltip();
      // Re-render Gantt
      const panel = document.getElementById('gantt-panel');
      if (panel) {
        const chart = panel.querySelector('.gg-chart');
        if (chart) {
          const newContent = extractGanttContent();
          if (newContent) chart.innerHTML = newContent;
        }
      }
    });
  }

  function updateDragTooltip(name, start, end) {
    let tip = document.getElementById('gg-drag-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'gg-drag-tooltip';
      tip.style.cssText = 'position:fixed;background:rgba(22,22,42,0.95);color:#fff;padding:4px 10px;border-radius:6px;font-size:11px;border:1px solid #4a9eff;pointer-events:none;z-index:100;white-space:nowrap;';
      document.body.appendChild(tip);
    }
    tip.textContent = `${name}: ${start} → ${end}`;
    tip.style.display = 'block';
    // Follow cursor
    _moveDragTip = (ev) => {
      tip.style.left = (ev.clientX + 12) + 'px';
      tip.style.top = (ev.clientY - 30) + 'px';
    };
    document.addEventListener('mousemove', _moveDragTip);
  }

  function hideDragTooltip() {
    const tip = document.getElementById('gg-drag-tooltip');
    if (tip) tip.style.display = 'none';
  }

  /* ==================== TOOLTIP ==================== */

  function setupGanttTooltip(panel) {
    const bars = panel.querySelector('#gg-bars');
    if (!bars) return;
    let tooltipTimer = null;

    bars.addEventListener('mouseover', (e) => {
      const bar = e.target.closest('.gg-bar');
      if (!bar) return;
      const rubroId = bar.dataset.rubroId;
      const rubro = ObraScheduleManager.getRubros().find(r => r.id === rubroId);
      if (!rubro) return;
      const asignados = ObraScheduleManager.getRubroEids(rubro).length;
      const av = rubro.avance || 0;
      const tip = document.getElementById('gg-tooltip');
      if (!tip) return;
      tip.innerHTML = `
        <strong>${esc(rubro.nombre)}</strong><br>
        ${rubro.startDate} → ${rubro.endDate}<br>
        Avance: ${av}% &middot; ${asignados} elementos
      `;
      tip.style.display = 'block';
    });

    bars.addEventListener('mousemove', (e) => {
      const tip = document.getElementById('gg-tooltip');
      if (!tip || tip.style.display === 'none') return;
      const chart = bars.closest('.gg-chart');
      if (!chart) return;
      const chartRect = chart.getBoundingClientRect();
      tip.style.left = (e.clientX - chartRect.left + 10) + 'px';
      tip.style.top = (e.clientY - chartRect.top - 50) + 'px';
    });

    bars.addEventListener('mouseout', (e) => {
      const bar = e.target.closest('.gg-bar');
      if (!bar) return;
      const tip = document.getElementById('gg-tooltip');
      if (tip) tip.style.display = 'none';
    });
  }

  /* ==================== HELPERS ==================== */

  function addFilterToRubro(filter) {
    const id = editingRubroId;
    const rubros = ObraScheduleManager.getRubros();
    let rubro = rubros.find(r => r.id === id);
    if (!rubro && id === '__new__') {
      const name = document.getElementById('grf-name')?.value.trim() || 'Nuevo rubro';
      const color = document.getElementById('grf-color')?.value || '#cccccc';
      const startDate = document.getElementById('grf-start')?.value || '';
      const endDate = document.getElementById('grf-end')?.value || '';
      const avance = parseInt(document.getElementById('grf-avance')?.value || '0');
      const newR = ObraScheduleManager.addRubro({
        nombre: name, color, startDate, endDate, avance,
        filters: [filter],
      });
      editingRubroId = newR.id;
      render();
      return;
    }
    if (!rubro) return;
    const filters = [...(rubro.filters || []), filter];
    ObraScheduleManager.updateRubro(id, { filters });
    render();
  }

  function extractGanttContent() {
    const panel = document.getElementById('gantt-panel');
    if (!panel) return null;
    // Rebuild just the gantt chart content
    const rubros = ObraScheduleManager.getRubros().filter(r => r.startDate && r.endDate);
    if (rubros.length === 0) return '<div class="gr-empty">Sin rubros con fechas.</div>';
    const escala = ObraScheduleManager.getEscala();
    const sorted = [...rubros].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    let minDate = Infinity, maxDate = -Infinity;
    for (const r of sorted) {
      const s = new Date(r.startDate).getTime();
      const e = new Date(r.endDate).getTime();
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
    }
    const dayMs = 86400000;
    const totalDays = Math.ceil((maxDate - minDate) / dayMs) || 1;
    const tickStep = escala === 'días' ? 1 : escala === 'semanas' ? 7 : 30;

    let ticks = [];
    for (let d = 0; d <= totalDays; d += tickStep) {
      const date = new Date(minDate + d * dayMs);
      ticks.push({ left: (d / totalDays) * 100, label: date.toLocaleDateString('es-ES', escala === 'días' ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: 'short' }) });
    }

    let html = `<div class="gg-tooltip" id="gg-tooltip"></div>`;
    html += `<div class="gg-ticks">${ticks.map(t => `<div class="gg-tick" style="left:${t.left}%">${t.label}</div>`).join('')}</div>`;
    html += `<div class="gg-grid">${ticks.map(t => `<div class="gg-gridline" style="left:${t.left}%"></div>`).join('')}</div>`;

    const todayMs = Date.now();
    if (todayMs >= minDate && todayMs <= maxDate) {
      const todayLeft = ((todayMs - minDate) / dayMs) / totalDays * 100;
      html += `<div class="gg-today" style="left:${todayLeft}%"></div>`;
    }

    html += `<div class="gg-bars" id="gg-bars">`;
    for (const r of sorted) {
      const s = new Date(r.startDate).getTime();
      const e = new Date(r.endDate).getTime();
      const left = Math.max(0, ((s - minDate) / dayMs) / totalDays * 100);
      const width = Math.min(100 - left, ((e - s) / dayMs) / totalDays * 100);
      const asignados = ObraScheduleManager.getRubroEids(r).length;
      const av = Math.min(100, Math.max(0, r.avance || 0));
      html += `<div class="gg-bar-row" data-rubro-id="${r.id}">
        <div class="gg-bar-label">${esc(r.nombre)}</div>
        <div class="gg-bar-track">
          <div class="gg-bar" style="left:${left}%;width:${Math.max(width, 2)}%;background:${r.color}" data-rubro-id="${r.id}">
            <div class="gg-bar-fill" style="width:${av}%"></div>
            <div class="gg-bar-handle gg-handle-left" data-rubro-id="${r.id}"></div>
            <div class="gg-bar-handle gg-handle-right" data-rubro-id="${r.id}"></div>
          </div>
          <div class="gg-avance-slider" data-rubro-id="${r.id}">
            <input type="range" min="0" max="100" value="${av}" data-rubro-id="${r.id}" data-action="avance-slider" style="accent-color:${r.color}">
            <span class="gg-avance-pct" data-rubro-id="${r.id}">${av}%</span>
          </div>
        </div>
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  function showTab(tab) {
    const panel = document.getElementById('gantt-panel');
    if (!panel) return;
    panel.querySelectorAll('.gantt-tab-content').forEach(el => {
      el.style.display = el.dataset.tab === tab ? '' : 'none';
    });
    panel.querySelectorAll('.gtab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { togglePanel };
})();
