const ObraApp = (() => {
  let initialized = false;
  let currentModel = null;

  const state = {
    loading: false,
    entries: null,
    selectedId: null,
  };

  function init() {
    if (initialized) return;
    const container = document.getElementById('viewer-container');
    if (!container) return;

    ObraViewer.init(container);
    initialized = true;
    container.classList.remove('loading');
    document.getElementById('version-badge').textContent = 'Fase 3';

    setupFileInput();
    setupDragDrop(container);
    setupClickSelect();
    setupToolbar();
    setupTooltipHover(container);
    setupContextMenu(container);
    setupClipping();
  }

  function setupFileInput() {
    const btn = document.getElementById('btn-load');
    const input = document.getElementById('file-input');
    if (!btn || !input) return;

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await loadModel(file);
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
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.ifc') || file.name.endsWith('.ifczip') || file.name.endsWith('.obj'))) {
        await loadModel(file);
      }
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
      const modelGroup = ObraViewer.getModelGroup();
      const meshes = [];
      modelGroup.children.forEach(child => {
        child.traverse(node => { if (node.isMesh) meshes.push(node); });
      });

      if (meshes.length === 0) return;
      const intersects = raycaster.intersectObjects(meshes);

      ObraViewer.clearHighlight();

      if (intersects.length > 0) {
        let hit = intersects[0].object;
        while (hit.parent && !hit.userData.expressID) hit = hit.parent;
        const id = hit.userData.expressID;
        if (id && state.entries && state.entries.has(id)) {
          state.selectedId = id;
          ObraViewer.highlightElement(id, 0xffaa00);
          showProperties(id);
        }
      } else {
        state.selectedId = null;
        ObraPropertiesPanel.hide();
      }
    });
  }

  async function loadModel(file) {
    if (state.loading) return;
    state.loading = true;

    const btn = document.getElementById('btn-load');
    const progress = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const badge = document.getElementById('model-badge');
    const status = document.getElementById('model-status');

    btn.disabled = true;
    btn.textContent = 'Cargando…';
    progressContainer.style.display = 'block';
    progress.style.width = '0%';
    status.textContent = 'Inicializando motor IFC…';

    try {
      const isOBJ = /\.obj$/i.test(file.name);
      let result, group;
      if (isOBJ) {
        status.textContent = 'Cargando OBJ…';
        result = await ObraIfcLoader.loadOBJ(file);
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
        status.textContent = 'Leyendo archivo…';
        result = await ObraIfcLoader.loadFile(file, (pct) => {
          progress.style.width = `${pct * 50}%`;
        });
        currentModel = result;
        state.entries = result.entries;
        status.textContent = 'Generando geometría 3D…';
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
        status.textContent = `⚠ ${result.itemCount} elementos encontrados, pero ninguno con geometría visible. Puede ser un modelo sin geometría 3D.`;
        status.style.color = '#ffaa00';
        setTimeout(() => { status.style.color = ''; }, 5000);
      } else {
        ObraViewer.fitToModel();
      }

      ObraTreePanel.build(result.entries);
      ObraSchedule.init(result.entries);

      badge.textContent = result.modelName;
      status.textContent = `${result.itemCount} elementos · ${meshCount} con geometría 3D`;
      progress.style.width = '100%';
      setTimeout(() => { progressContainer.style.display = 'none'; }, 1000);

      document.getElementById('phase-badge').textContent =
        `Fase 3 — ${result.modelName} · ${meshCount} mallas 3D`;

    } catch (err) {
      status.textContent = `Error: ${err.message || 'No se pudo cargar el archivo'}`;
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
    document.querySelectorAll('#view-toolbar .vbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'fit') {
          ObraViewer.fitToModel();
        } else {
          document.querySelectorAll('#view-toolbar .vbtn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          ObraViewer.setView(view);
        }
      });
    });
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

  function setupTooltipHover(container) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    container.addEventListener('mousemove', (e) => {
      if (!state.entries) { ObraViewer.hideTooltip(); return; }
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, ObraViewer.getCamera());
      const modelGroup = ObraViewer.getModelGroup();
      const meshes = [];
      modelGroup.children.forEach(child => {
        child.traverse(node => { if (node.isMesh) meshes.push(node); });
      });
      if (meshes.length === 0) { ObraViewer.hideTooltip(); return; }
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        let hit = hits[0].object;
        while (hit.parent && !hit.userData.expressID) hit = hit.parent;
        const id = hit.userData.expressID;
        if (id && state.entries.has(id)) {
          const entry = state.entries.get(id);
          ObraViewer.showTooltip(`${entry.typeName} — ${entry.name}`);
        } else {
          ObraViewer.hideTooltip();
        }
      } else {
        ObraViewer.hideTooltip();
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
      const meshes = [];
      modelGroup.children.forEach(child => {
        child.traverse(node => { if (node.isMesh) meshes.push(node); });
      });
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
        html += `<div class="ctx-item" data-action="select" data-eid="${hitId}">🎯 Seleccionar</div>`;
        html += `<div class="ctx-item" data-action="isolate" data-eid="${hitId}">🔍 Aislar</div>`;
        html += `<div class="ctx-item" data-action="hide" data-eid="${hitId}">👁 Ocultar</div>`;
        html += `<div class="ctx-item" data-action="pin" data-eid="${hitId}">📌 Agregar incidencia</div>`;
        html += `<div class="ctx-divider"></div>`;
      }
      html += `<div class="ctx-item" data-action="showall">👁 Mostrar todo</div>`;
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
          if (eid) { state.selectedId = eid; ObraViewer.clearHighlight(); ObraViewer.highlightElement(eid, 0xffaa00); showProperties(eid); }
          break;
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
            const box = new THREE.Box3().setFromObject(modelGroup.children.find(c => c.userData.expressID === eid));
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

  document.addEventListener('DOMContentLoaded', init);

  return {
    init, loadModel, getCurrentModel, getEntries, getSelectedId,
    toggleMeasure, toggleCollision, runCollision, clearCollision, exportCollision,
    togglePinMode, saveIssue, cancelIssue, toggleIssueList, importIssues, editIssue,
  };
})();
