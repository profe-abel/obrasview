const ObraApp = (() => {
  let initialized = false;
  let currentModel = null;

  const state = {
    loading: false,
    entries: null,
    selectedId: null,
    selectedIds: [],
  };

  function init() {
    if (initialized) return;
    const container = document.getElementById('viewer-container');
    if (!container) return;

    ObraViewer.init(container);
    initialized = true;
    container.classList.remove('loading');
    ObraI18n.init();
    document.getElementById('version-badge').textContent = ObraI18n.__('phase3');

    setupFileInput();
    setupDragDrop(container);
    setupClickSelect();
    setupToolbar();
    setupTooltipHover(container);
    setupContextMenu(container);
    setupClipping();
    setupBoxSelect(container);
    setupFloatingWindows(container);
    setupDropdownMenus();
  }

  function setupDropdownMenus() {
    const dropdown = document.getElementById('file-dropdown');
    if (!dropdown) return;
    const btn = dropdown.querySelector('.dropdown-btn');
    const menu = dropdown.querySelector('.dropdown-menu');
    const items = menu.querySelectorAll('.dropdown-item');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.remove('open');
        const action = item.dataset.action;
        switch (action) {
          case 'new-project':
            showConfirmModal(
              'Nuevo proyecto',
              '¿Limpiar todo? Se perderán los cambios no guardados.',
              () => {
                ObraTools.clearAll();
                ObraStorage._clear?.();
                localStorage.removeItem('obraview_schedule_rubros');
                location.reload();
              }
            );
            break;
          case 'save-project':
            ObraProject.saveAs();
            break;
          case 'load-project':
            document.getElementById('file-load-project').click();
            break;
          case 'settings':
            ObraWindowManager.toggle('settings');
            break;
        }
      });
    });

    document.getElementById('file-load-project').addEventListener('change', function() {
      if (this.files[0]) {
        ObraProject.load(this.files[0])
          .then(() => { alert('Proyecto cargado correctamente'); location.reload(); })
          .catch(err => alert('Error: ' + err.message));
      }
    });
  }

  function showConfirmModal(title, message, onConfirm) {
    const overlay = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    titleEl.textContent = title;
    msgEl.textContent = message;
    overlay.classList.add('visible');

    const controller = new AbortController();
    const cleanup = () => {
      overlay.classList.remove('visible');
      controller.abort();
    };

    okBtn.addEventListener('click', () => { cleanup(); onConfirm(); }, { signal: controller.signal });
    cancelBtn.addEventListener('click', cleanup, { signal: controller.signal });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); }, { signal: controller.signal });
  }

  function setupFileInput() {
    const btn = document.getElementById('btn-load');
    const input = document.getElementById('file-input');
    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      await loadModel(files);
      input.value = '';
    });
  }

  function setupDragDrop(container) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.style.outline = '2px dashed #4a9eff';
    });
    container.addEventListener('dragleave', () => {
      container.style.outline = 'none';
    });
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.style.outline = 'none';
      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;
      await loadModel(files);
    });
  }

  function setupClickSelect() {
    const container = document.getElementById('viewer-container');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('click', (e) => {
      if (state.loading) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, ObraViewer.getCamera());
      const meshes = ObraViewer.getFlatMeshCache();
      if (meshes.length === 0) return;
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit.parent && !hit.userData.expressID) hit = hit.parent;
        const id = hit.userData.expressID;
        if (id && state.entries && state.entries.has(id)) {
          if (e.ctrlKey) {
            const idx = state.selectedIds.indexOf(id);
            if (idx >= 0) state.selectedIds.splice(idx, 1);
            else state.selectedIds.push(id);
            if (state.selectedIds.length === 0) {
              state.selectedId = null;
              ObraViewer.clearHighlight();
              ObraPropertiesPanel.hide();
            } else {
              state.selectedId = id;
              ObraViewer.highlightElements(state.selectedIds, 0xffaa00);
              showProperties(id);
            }
          } else {
            state.selectedIds = [id];
            state.selectedId = id;
            ObraViewer.highlightElement(id, 0xffaa00);
            showProperties(id);
          }
        }
      } else if (!e.ctrlKey) {
        state.selectedId = null;
        state.selectedIds = [];
        ObraViewer.clearHighlight();
        ObraPropertiesPanel.hide();
      }
    });
  }

  async function loadModel(files) {
    if (state.loading) return;
    // Handle FileList or single file
    const fileList = files instanceof FileList ? Array.from(files) : (Array.isArray(files) ? files : files ? [files] : []);
    if (fileList.length === 0) return;
    const objFile = fileList.find(f => /\.obj$/i.test(f.name));
    const ifcFile = fileList.find(f => /\.ifc/i.test(f.name));
    const companionFiles = [...fileList]; // all files for OBJ (MTL+textures)
    const file = objFile || ifcFile || fileList[0];
    if (!file) return;

    state.loading = true;

    const btn = document.getElementById('btn-load');
    const progress = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const badge = document.getElementById('model-badge');
    const status = document.getElementById('model-status');

    btn.disabled = true;
    btn.textContent = ObraI18n.__('loading');
    progressContainer.style.display = 'block';
    progress.style.width = '0%';
    status.textContent = ObraI18n.__('statusLoadingIfc');

    try {
      const isOBJ = objFile && /\.obj$/i.test(objFile.name);
      let result, group;
      if (isOBJ) {
        status.textContent = ObraI18n.__('statusLoadingObj');
        result = await ObraIfcLoader.loadOBJ(objFile, companionFiles);
        currentModel = result;
        state.entries = result.entries;
        ObraViewer.removeDemoCube();
        ObraViewer.clearModel();
        group = new THREE.Group();
        for (const [, entry] of result.entries) {
          if (entry.mesh) group.add(entry.mesh);
        }
      } else {
        await ObraIfcLoader.init();
        status.textContent = ObraI18n.__('statusReading');
        result = await ObraIfcLoader.loadFile(file, (pct) => {
          progress.style.width = `${pct * 50}%`;
        });
        currentModel = result;
        state.entries = result.entries;
        status.textContent = ObraI18n.__('statusGenerating');
        ObraViewer.removeDemoCube();
        ObraViewer.clearModel();
        group = await ObraIfcLoader.generateMeshes(result.modelID, result.entries, (pct) => {
          progress.style.width = `${pct * 100}%`;
        });
      }

      const meshCount = group.children.length;
      document.querySelector('.empty-state')?.remove();
      ObraViewer.addModel(group);

      if (meshCount === 0) {
        status.textContent = ObraI18n.__('statusNoGeo', { count: result.itemCount });
        status.style.color = '#ffaa00';
        setTimeout(() => { status.style.color = ''; }, 5000);
      } else {
        ObraViewer.fitToModel();
      }

      ObraTreePanel.build(result.entries);
      ObraScheduleManager.init(result.entries);

      badge.textContent = result.modelName;
      status.textContent = ObraI18n.__('statusSummary', { count: result.itemCount, meshCount });
      progress.style.width = '100%';
      setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);

      document.getElementById('phase-badge').textContent =
        ObraI18n.__('statusModelLoaded', { name: result.modelName, meshCount });

    } catch (err) {
      status.textContent = ObraI18n.__('statusLoadError', { msg: err.message || '' });
      console.error(err);
      setTimeout(() => { progressContainer.style.display = 'none'; }, 3000);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Cargar IFC';
      state.loading = false;
    }
  }

  async function showProperties(expressID) {
    if (!currentModel || !state.entries) return;
    const entry = state.entries.get(expressID);
    if (!entry) return;

    let props = entry.properties;
    if (!props) {
      props = await ObraIfcLoader.getProperties(currentModel.modelID, expressID);
      entry.properties = props;
    }

    ObraPropertiesPanel.show(entry, props);
  }

  function setupToolbar() {
    document.querySelectorAll('#view-toolbar .vbtn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'fit') {
          ObraViewer.fitToModel();
        } else {
          document.querySelectorAll('#view-toolbar .vbtn[data-view]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          ObraViewer.setView(view);
        }
      });
    });
    const walkBtn = document.getElementById('walk-btn');
    if (walkBtn) {
      walkBtn.addEventListener('click', () => {
        ObraViewer.toggleWalkMode();
        walkBtn.classList.toggle('active');
        if (ObraViewer.isWalkMode()) {
          ObraViewer.setEyeLevel(ObraSettings.get('eyeLevel') || 1.6);
        }
      });
    }
    const simBtn = document.getElementById('sim-btn');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        const win = ObraWindowManager.get('simulation');
        if (!win) return;
        if (win.el.style.display === 'none') {
          ObraSimControls.init();
        } else {
          ObraViewer.pauseSimulation();
          ObraViewer.clearScheduleColors();
          ObraWindowManager.hide('simulation');
        }
      });
    }
  }

  function toggleMeasure() {
    const active = ObraTools.toggleMeasure();
    const btn = document.getElementById('measure-btn');
    const container = document.getElementById('viewer-container');
    if (active) {
      btn.style.background = '#4a9eff';
      btn.style.color = '#fff';
      ObraTools.init();
      container.addEventListener('click', onMeasureClick);
    } else {
      btn.style.background = '';
      btn.style.color = '';
      container.removeEventListener('click', onMeasureClick);
    }
  }

  function onMeasureClick(e) {
    ObraTools.handleClick(e);
  }

  let clipAxis = null;

  function setupClipping() {
    const slider = document.getElementById('clip-slider');
    const btnX = document.querySelector('.clip-btn[data-axis="x"]');
    const btnY = document.querySelector('.clip-btn[data-axis="y"]');
    const btnZ = document.querySelector('.clip-btn[data-axis="z"]');
    const resetBtn = document.getElementById('clip-reset');

    document.querySelectorAll('.clip-btn[data-axis]').forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.dataset.axis;
        clipAxis = clipAxis === axis ? null : axis;
        document.querySelectorAll('.clip-btn[data-axis]').forEach(b => b.classList.toggle('active', b.dataset.axis === clipAxis));
        if (clipAxis) {
          ObraViewer.setClipping(clipAxis, parseFloat(slider.value));
        } else {
          ObraViewer.resetClipping();
        }
      });
    });

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      document.getElementById('clip-val').textContent = val.toFixed(1);
      if (clipAxis) ObraViewer.setClipping(clipAxis, val);
    });

    resetBtn.addEventListener('click', () => {
      clipAxis = null;
      slider.value = '0';
      document.getElementById('clip-val').textContent = '0';
      document.querySelectorAll('.clip-btn[data-axis]').forEach(b => b.classList.remove('active'));
      ObraViewer.resetClipping();
    });
  }

  let boxSelectStart = null;
  let boxSelectRect = null;

  function setupBoxSelect(container) {
    const rectEl = document.getElementById('sel-rect');
    const camera = ObraViewer.getCamera();

    container.addEventListener('mousedown', (e) => {
      if (state.loading || e.button !== 0 || e.ctrlKey) return;
      if (ObraTools && ObraTools.isActive && ObraTools.isActive()) return;
      boxSelectStart = { x: e.clientX, y: e.clientY };
      boxSelectRect = null;
    });

    container.addEventListener('mousemove', (e) => {
      if (!boxSelectStart || !rectEl) return;
      const dx = e.clientX - boxSelectStart.x;
      const dy = e.clientY - boxSelectStart.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) { rectEl.style.display = 'none'; return; }
      const rect = container.getBoundingClientRect();
      const left = Math.min(boxSelectStart.x, e.clientX) - rect.left;
      const top = Math.min(boxSelectStart.y, e.clientY) - rect.top;
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      const ltr = dx >= 0;
      rectEl.style.left = left + 'px';
      rectEl.style.top = top + 'px';
      rectEl.style.width = w + 'px';
      rectEl.style.height = h + 'px';
      rectEl.style.borderColor = ltr ? '#4a9eff' : '#2ecc71';
      rectEl.style.background = ltr ? 'rgba(74,158,255,0.1)' : 'rgba(46,204,113,0.1)';
      rectEl.style.display = 'block';
      boxSelectRect = { left, top, w, h, ltr, clientLeft: left + rect.left, clientTop: top + rect.top };
    });

    container.addEventListener('mouseup', (e) => {
      if (!boxSelectStart || !boxSelectRect) { boxSelectStart = null; if (rectEl) rectEl.style.display = 'none'; return; }
      if (rectEl) rectEl.style.display = 'none';
      const r = boxSelectRect;
      boxSelectStart = null;
      boxSelectRect = null;
      if (r.w < 10 || r.h < 10) return;

      const rect = container.getBoundingClientRect();
      const ndcMin = { x: (r.left / rect.width) * 2 - 1, y: -((r.top + r.h) / rect.height) * 2 + 1 };
      const ndcMax = { x: ((r.left + r.w) / rect.width) * 2 - 1, y: -(r.top / rect.height) * 2 + 1 };

      const eids = ObraViewer.selectByRect(camera, ndcMin, ndcMax, state.entries, r.ltr);
      if (eids.length > 0) {
        state.selectedIds = eids;
        state.selectedId = eids[0];
        ObraViewer.highlightElements(eids, 0xffaa00);
        state.entries.get(eids[0]) ? showProperties(eids[0]) : null;
      } else {
        state.selectedIds = [];
        state.selectedId = null;
        ObraViewer.clearHighlight();
        ObraPropertiesPanel.hide();
      }
    });
  }

  function setupFloatingWindows(container) {
    ObraDock.init();

    const _t = (k, p) => (typeof ObraI18n !== 'undefined' ? ObraI18n.__(k, p) : k);
    const panelConfigs = {
      tree: { title: _t('panelTree'), accent: '#9b59b6', icon: 'account_tree', x: 20, y: 60, w: 300, h: 500 },
      properties: { title: _t('panelProperties'), accent: '#f39c12', icon: 'info', x: 340, y: 60, w: 320, h: 420 },
      gantt: { title: _t('panelGantt'), accent: '#4a9eff', icon: 'timeline', x: 680, y: 60, w: 660, h: 480 },
      issues: { title: _t('panelIssues'), accent: '#e74c3c', icon: 'error_outline', x: 100, y: 140, w: 300, h: 420 },
      budget: { title: _t('panelBudget'), accent: '#f39c12', icon: 'payments', x: 400, y: 80, w: 720, h: 520 },
      dashboard: { title: _t('panelDashboard'), accent: '#10b981', icon: 'monitoring', x: 100, y: 40, w: 860, h: 580 },
      simulation: { title: _t('panelSimulation'), accent: '#4a9eff', icon: 'speed', x: 200, y: 300, w: 420, h: 100, minimizable: true, closable: true },
      collision: { title: _t('panelCollision'), accent: '#e67e22', icon: 'search_check', x: 300, y: 120, w: 420, h: 400 },
      settings: { title: _t('panelSettings'), accent: '#888', icon: 'settings', x: 500, y: 200, w: 340, h: 340, minimizable: true, closable: true },
    };

    // Create windows and dock buttons
    Object.keys(panelConfigs).forEach((id, i) => {
      const c = panelConfigs[id];
      const win = ObraWindowManager.createWindow({
        id, title: c.title, accent: c.accent,
        x: c.x + i * 20, y: c.y + i * 20, width: c.w, height: c.h, body: '',
      });
      win.opts.onShow = () => ObraDock.setOpen(id, true);
      win.opts.onHide = () => ObraDock.setOpen(id, false);
      ObraDock.addItem(id, {
        icon: c.icon, label: c.title, accent: c.accent,
        onClick: () => {
          if (id === 'properties' && !ObraPropertiesPanel._hasContent) return;
          ObraWindowManager.toggle(id);
          ObraDock.setOpen(id, ObraWindowManager.get(id) && !(ObraWindowManager.get(id).el.style.display === 'none'));
        },
      });
    });

    // Helper: style an element to fill a floating window body
    function absorbPanel(el, winBody) {
      if (!el || el.parentNode === winBody) return;
      el.classList.add('ow-absorbed');
      if (!el.classList.contains('visible')) el.classList.add('visible');
      winBody.appendChild(el);
    }

    // MutationObserver: watch for dynamically-created panel elements
    const panelSelectors = {
      tree: '#tree-panel',
      properties: '#properties-panel',
      gantt: '#schedule-panel',
      issues: '#issue-list',
      collision: '#collision-panel',
    };
    const obs = new MutationObserver(() => {
      Object.keys(panelSelectors).forEach(id => {
        const win = ObraWindowManager.get(id);
        if (!win) return;
        const el = document.querySelector(panelSelectors[id]);
        if (el && el.parentNode !== win.body) absorbPanel(el, win.body);
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Initial absorption for elements that already exist
    Object.keys(panelSelectors).forEach(id => {
      const win = ObraWindowManager.get(id);
      if (!win) return;
      const el = document.querySelector(panelSelectors[id]);
      if (el) absorbPanel(el, win.body);
    });

    // Override panel toggle functions to use floating windows
    if (ObraTreePanel && ObraTreePanel.togglePanel) {
      ObraTreePanel.togglePanel = function() {
        if (!document.getElementById('tree-panel')) ObraTreePanel.render();
        ObraWindowManager.toggle('tree');
      };
    }
    if (GanttView && GanttView.togglePanel) {
      GanttView.togglePanel = function() {
        if (!document.getElementById('gantt-panel')) GanttView.render();
        ObraWindowManager.toggle('gantt');
      };
    }

    // Hook collision
    const colWin = ObraWindowManager.get('collision');
    if (colWin) {
      colWin.opts.onShow = function() { ObraDock.setOpen('collision', true); };
      colWin.opts.onHide = function() { ObraDock.setOpen('collision', false); };
    }

    // Hook simulation window: hide by default, no dock button (accessed via toolbar)
    const simWin = ObraWindowManager.get('simulation');
    if (simWin) {
      simWin.opts.onShow = function() { ObraDock.setOpen('simulation', true); };
      simWin.opts.onHide = function() { ObraDock.setOpen('simulation', false); ObraViewer.pauseSimulation(); };
      ObraWindowManager.hide('simulation');
    }

    // Hook dashboard
    const dashWin = ObraWindowManager.get('dashboard');
    if (dashWin) {
      dashWin.opts.onShow = function() { ObraDock.setOpen('dashboard', true); ObraDashboard.render(); };
      dashWin.opts.onHide = function() { ObraDock.setOpen('dashboard', false); };
    }

    // Hook budget: render on first show
    const budgetWin = ObraWindowManager.get('budget');
    if (budgetWin) {
      budgetWin.opts.onShow = function() {
        ObraDock.setOpen('budget', true);
        ObraBudgetView.render();
      };
      budgetWin.opts.onHide = function() { ObraDock.setOpen('budget', false); };
    }

    // Initialize settings and hook settings window
    ObraSettings.init();
    const setWin = ObraWindowManager.get('settings');
    if (setWin) {
      setWin.opts.onShow = function() {
        ObraDock.setOpen('settings', true);
        ObraSettings.buildPanelUI(setWin.body);
      };
      setWin.opts.onHide = function() { ObraDock.setOpen('settings', false); };
    }

    // Hook properties panel show/hide
    const origPropShow = ObraPropertiesPanel.show;
    if (origPropShow) {
      ObraPropertiesPanel._origShow = origPropShow;
      ObraPropertiesPanel.show = function(entry, props) {
        ObraPropertiesPanel._hasContent = true;
        origPropShow.call(this, entry, props);
        const win = ObraWindowManager.get('properties');
        const panelEl = document.getElementById('properties-panel');
        if (win && panelEl) absorbPanel(panelEl, win.body);
        ObraWindowManager.show('properties');
      };
      ObraPropertiesPanel.hide = function() { ObraWindowManager.hide('properties'); };
    }
  }

  function setupTooltipHover(container) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoverId = null;
    container.addEventListener('mousemove', (e) => {
      if (!state.entries) { ObraViewer.hideTooltip(); return; }
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, ObraViewer.getCamera());
      const meshes = ObraViewer.getFlatMeshCache();
      if (meshes.length === 0) { ObraViewer.hideTooltip(); ObraViewer.clearHover(); hoverId = null; return; }
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        let hit = hits[0].object;
        while (hit.parent && !hit.userData.expressID) hit = hit.parent;
        const id = hit.userData.expressID;
        if (id && state.entries.has(id)) {
          const entry = state.entries.get(id);
          ObraViewer.showTooltip(`${entry.typeName} — ${entry.name}`);
          if (id !== hoverId) { ObraViewer.clearHover(); ObraViewer.hoverElement(id); hoverId = id; }
        } else {
          ObraViewer.hideTooltip();
          if (hoverId) { ObraViewer.clearHover(); hoverId = null; }
        }
      } else {
        ObraViewer.hideTooltip();
        if (hoverId) { ObraViewer.clearHover(); hoverId = null; }
      }
    });
  }

  function setupContextMenu(container) {
    const menu = document.getElementById('context-menu');
    const modelGroup = ObraViewer.getModelGroup();

    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      menu.style.display = 'none';
      if (!state.entries) return;

      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, ObraViewer.getCamera());
      const meshes = ObraViewer.getFlatMeshCache();
      const hits = raycaster.intersectObjects(meshes);
      let hitId = null;
      if (hits.length > 0) {
        let hit = hits[0].object;
        while (hit.parent && !hit.userData.expressID) hit = hit.parent;
        hitId = hit.userData.expressID;
      }

      let html = '';
      if (hitId && state.entries.has(hitId)) {
        const entry = state.entries.get(hitId);
        html += `<div class="ctx-item" data-action="select" data-eid="${hitId}">${ObraI18n.__('ctxSelect')}</div>`;
        html += `<div class="ctx-item" data-action="select-similar" data-type="${entry.typeName}" data-name="${entry.name}">${ObraI18n.__('ctxSelectSimilar')}</div>`;
        html += `<div class="ctx-item" data-action="isolate" data-eid="${hitId}">${ObraI18n.__('ctxIsolate')}</div>`;
        html += `<div class="ctx-item" data-action="hide" data-eid="${hitId}">${ObraI18n.__('ctxHide')}</div>`;
        html += `<div class="ctx-item" data-action="pin" data-eid="${hitId}">${ObraI18n.__('ctxAddIssue')}</div>`;
        html += `<div class="ctx-divider"></div>`;
      }
      html += `<div class="ctx-item" data-action="showall">${ObraI18n.__('ctxShowAll')}</div>`;
      menu.innerHTML = html;
      menu.style.left = Math.min(e.clientX - rect.left, rect.width - 180) + 'px';
      menu.style.top = Math.min(e.clientY - rect.top, rect.height - 200) + 'px';
      menu.style.display = 'block';
    });

    container.addEventListener('click', () => { menu.style.display = 'none'; });
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.ctx-item');
      if (!item) return;
      menu.style.display = 'none';
      const action = item.dataset.action;
      const eid = item.dataset.eid ? parseInt(item.dataset.eid) : null;
      switch (action) {
        case 'select':
          if (eid) { state.selectedId = eid; state.selectedIds = [eid]; ObraViewer.clearHighlight(); ObraViewer.highlightElement(eid, 0xffaa00); showProperties(eid); }
          break;
        case 'select-similar': {
          const typeName = item.dataset.type;
          const similar = [];
          for (const [, entry] of state.entries) {
            if (entry.typeName === typeName) similar.push(entry.expressID);
          }
          state.selectedIds = similar;
          if (similar.length > 0) {
            state.selectedId = similar[0];
            ObraViewer.highlightElements(similar, 0xffaa00);
            showProperties(similar[0]);
          }
          break;
        }
        case 'isolate':
          if (eid) ObraViewer.isolateElement(eid);
          break;
        case 'hide':
          if (eid) { ObraViewer.setElementVisibility(eid, false); if (ObraTreePanel && ObraTreePanel.render) ObraTreePanel.render(); }
          break;
        case 'showall':
          ObraViewer.showAllElements();
          if (ObraTreePanel && ObraTreePanel.render) ObraTreePanel.render();
          break;
        case 'pin':
          if (eid && state.entries.has(eid)) {
            const entry = state.entries.get(eid);
            ObraTools.initMarkers();
            const target = modelGroup.children.find(c => c.userData.expressID === eid);
            if (!target) break;
            const box = new THREE.Box3().setFromObject(target);
            if (box && !box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3());
              ObraTools.addMarkerAtPosition(center);
              const idx = ObraTools.getMarkers().length - 1;
              pendingMarkerIndex = idx;
              const panel = document.getElementById('issue-panel');
              panel.classList.add('visible');
              document.getElementById('iss-preview').textContent = `${entry.typeName} — ${entry.name}`;
              document.getElementById('iss-title').value = '';
              document.getElementById('iss-desc').value = '';
              document.getElementById('iss-status').value = 'pendiente';
            }
          }
          break;
      }
    });
  }

  function toggleCollision() {
    const win = ObraWindowManager.get('collision');
    if (win) {
      if (win.el.style.display !== 'none') { ObraWindowManager.hide('collision'); return; }
      ObraCollisionView.open();
      return;
    }
    const panel = document.getElementById('collision-panel');
    const isOpen = panel.classList.toggle('visible');
    if (isOpen && state.entries) {
      const types = ObraTools.getTypeNames(state.entries);
      const selA = document.getElementById('col-type-a');
      const selB = document.getElementById('col-type-b');
      selA.innerHTML = '<option value="">Categoría A</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
      selB.innerHTML = '<option value="">Categoría B</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
    }
  }

  function runCollision() {
    if (!state.entries) return;
    const typeA = document.getElementById('col-type-a').value;
    const typeB = document.getElementById('col-type-b').value;
    if (!typeA || !typeB) { alert('Seleccioná dos categorías'); return; }
    const results = ObraTools.detectCollisions(state.entries, typeA, typeB);
    const el = document.getElementById('col-results');
    if (results.length === 0) {
      el.innerHTML = '<div style="color:#2ecc71;padding:6px 0">✓ Sin colisiones detectadas</div>';
    } else {
      el.innerHTML = results.map((r, i) =>
        `<div class="col-item"><span>#${i+1} ${r.a.typeName} — ${r.b.typeName}</span><span style="color:#e74c3c">${r.a.name} vs ${r.b.name}</span></div>`
      ).join('');
    }
  }

  function clearCollision() {
    ObraTools.clearCollisions();
    document.getElementById('col-results').innerHTML = '';
  }

  function exportCollision() {
    ObraTools.exportCollisionsJSON();
  }

  let pendingMarkerIndex = -1;

  function togglePinMode() {
    const active = ObraTools.toggleMarkerMode();
    const btn = document.getElementById('pin-btn');
    const container = document.getElementById('viewer-container');
    if (active) {
      btn.style.background = '#4a9eff';
      btn.style.color = '#fff';
      ObraTools.initMarkers();
      container.addEventListener('click', onPinClick);
    } else {
      btn.style.background = '';
      btn.style.color = '';
      container.removeEventListener('click', onPinClick);
    }
  }

  function onPinClick(e) {
    const marker = ObraTools.addMarkerAtClick(e);
    if (marker) {
      const idx = ObraTools.getMarkers().length - 1;
      pendingMarkerIndex = idx;
      const panel = document.getElementById('issue-panel');
      panel.classList.add('visible');
      const pos = marker.position;
      document.getElementById('iss-preview').textContent =
        `Posición: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
      document.getElementById('iss-title').value = '';
      document.getElementById('iss-desc').value = '';
      document.getElementById('iss-status').value = 'pendiente';
    }
  }

  function saveIssue() {
    const title = document.getElementById('iss-title').value.trim();
    if (!title) { alert('Escribí un título'); return; }
    const desc = document.getElementById('iss-desc').value.trim();
    const status = document.getElementById('iss-status').value;
    const photoInput = document.getElementById('iss-photo');
    const photoFile = photoInput.files[0];
    const marker = ObraTools.getMarkers()[pendingMarkerIndex];
    if (!marker) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const issue = ObraStorage.addIssue({
        title, description: desc, status,
        photo: e.target ? e.target.result : null,
        x: marker.position.x, y: marker.position.y, z: marker.position.z,
      });
      ObraTools.setMarkerIssue(pendingMarkerIndex, issue.id);
      updateMarkerColor(issue);
      document.getElementById('issue-panel').classList.remove('visible');
      renderIssueList();
    };
    if (photoFile) { reader.readAsDataURL(photoFile); }
    else {
      const issue = ObraStorage.addIssue({
        title, description: desc, status,
        x: marker.position.x, y: marker.position.y, z: marker.position.z,
      });
      ObraTools.setMarkerIssue(pendingMarkerIndex, issue.id);
      updateMarkerColor(issue);
      document.getElementById('issue-panel').classList.remove('visible');
      renderIssueList();
    }
    photoInput.value = '';
    document.getElementById('iss-photo-name').textContent = '';
  }

  function cancelIssue() {
    if (pendingMarkerIndex >= 0) {
      ObraTools.removeMarker(pendingMarkerIndex);
    }
    pendingMarkerIndex = -1;
    document.getElementById('issue-panel').classList.remove('visible');
  }

  function updateMarkerColor(issue) {
    const colorMap = { pendiente: 0xff4444, progreso: 0x4a9eff, resuelto: 0x2ecc71 };
    const color = colorMap[issue.status] || 0xff4444;
    ObraTools.updateMarkerColor(issue.id, color);
  }

  // Show photo filename when selected
  document.getElementById('iss-photo')?.addEventListener('change', function() {
    document.getElementById('iss-photo-name').textContent = this.files[0]?.name || '';
  });

  function toggleIssueList() {
    const win = ObraWindowManager.get('issues');
    if (win) {
      const showing = win.el.style.display !== 'none';
      if (showing) { ObraWindowManager.hide('issues'); return; }
      ObraWindowManager.show('issues');
      renderIssueList();
      return;
    }
    const panel = document.getElementById('issue-list');
    panel.classList.toggle('visible');
    if (panel.classList.contains('visible')) renderIssueList();
  }

  function renderIssueList() {
    const issues = ObraStorage.getIssues();
    const el = document.getElementById('issue-list-body');
    if (issues.length === 0) {
      el.innerHTML = '<div style="padding:12px;color:#666;font-size:12px">Sin incidencias aún</div>';
      return;
    }
    el.innerHTML = issues.map(i =>
      `<div class="il-item" onclick="ObraApp.editIssue('${i.id}')">
        <span class="il-status ${i.status}">${i.status}</span>
        <strong>${escapeHTML(i.title)}</strong>
        <div style="color:#666;font-size:10px;margin-top:2px">${new Date(i.createdAt).toLocaleDateString()}</div>
      </div>`
    ).reverse().join('');
  }

  function editIssue(id) {
    const issue = ObraStorage.getIssues().find(i => i.id === id);
    if (!issue) return;
    const newStatus = prompt('Estado (pendiente / progreso / resuelto):', issue.status);
    if (newStatus && ['pendiente', 'progreso', 'resuelto'].includes(newStatus)) {
      const updated = ObraStorage.updateIssue(id, { status: newStatus });
      if (updated) updateMarkerColor(updated);
      renderIssueList();
    }
  }

  function importIssues(event) {
    const file = event.target.files[0];
    if (!file) return;
    ObraStorage.importJSON(file)
      .then(() => { alert('Incidencias importadas'); renderIssueList(); })
      .catch(err => alert('Error: ' + err.message));
    event.target.value = '';
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function getCurrentModel() { return currentModel; }
  function getEntries() { return state.entries; }
  function getSelectedId() { return state.selectedId; }
  function getSelectedIds() { return state.selectedIds; }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init, loadModel, getCurrentModel, getEntries, getSelectedId, getSelectedIds,
    toggleMeasure, toggleCollision, runCollision, clearCollision, exportCollision,
    togglePinMode, saveIssue, cancelIssue, toggleIssueList, importIssues, editIssue,
  };
})();
