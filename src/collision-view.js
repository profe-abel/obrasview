const ObraCollisionView = (() => {
  let lastResults = [];

  function open() {
    const win = ObraWindowManager.get('collision');
    if (!win) return;
    ObraWindowManager.show('collision');
    render();
    populateTypes();
  }

  function close() {
    ObraWindowManager.hide('collision');
  }

  function populateTypes() {
    if (typeof ObraApp === 'undefined') return;
    const entries = ObraApp.getEntries ? ObraApp.getEntries() : null;
    if (!entries) return;
    const types = ObraTools.getTypeNames(entries);
    const selA = document.getElementById('col-type-a');
    const selB = document.getElementById('col-type-b');
    if (selA) selA.innerHTML = '<option value="">Categoría A</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
    if (selB) selB.innerHTML = '<option value="">Categoría B</option>' + types.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  function getSeverity(vol) {
    if (vol > 5) return { label: 'Crítica', color: '#e74c3c', level: 3 };
    if (vol > 1) return { label: 'Alta', color: '#e67e22', level: 2 };
    if (vol > 0.1) return { label: 'Media', color: '#f39c12', level: 1 };
    return { label: 'Baja', color: '#3498db', level: 0 };
  }

  function render() {
    const win = ObraWindowManager.get('collision');
    if (!win) return;
    const tolerance = parseFloat(document.getElementById('col-tolerance')?.value) || 0;

    const resultsHTML = lastResults.length === 0
      ? '<div style="padding:20px;text-align:center;color:#555;font-size:12px">Sin resultados. Seleccioná dos categorías y detectá colisiones.</div>'
      : lastResults.map((r, i) => {
          const sev = getSeverity(r.volume || 0);
          return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(42,42,69,0.5);font-size:11px">
            <span style="width:16px;text-align:right;color:#555">${i+1}</span>
            <span style="width:6px;height:6px;border-radius:50%;background:${sev.color};flex-shrink:0"></span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.a.typeName} — ${r.b.typeName}</span>
            <span class="col-severity ${'col-severity-' + sev.label.toLowerCase()}">${sev.label}</span>
          </div>`;
        }).join('');

    const resultCount = lastResults.length;

    win.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div style="padding:10px 12px;border-bottom:1px solid #2a2a45">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <select id="col-type-a" style="padding:5px 6px;border:1px solid #2a2a45;border-radius:4px;background:#1a1a30;color:#e0e0e0;font-size:11px"><option value="">Categoría A</option></select>
            <select id="col-type-b" style="padding:5px 6px;border:1px solid #2a2a45;border-radius:4px;background:#1a1a30;color:#e0e0e0;font-size:11px"><option value="">Categoría B</option></select>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <label style="font-size:10px;color:#666;display:flex;align-items:center;gap:4px">
              Tolerancia
              <input type="range" id="col-tolerance" min="0" max="50" value="0" step="1" style="width:60px;height:3px;accent-color:#e74c3c" oninput="ObraCollisionView.render()">
              <span id="col-tol-val" style="font-family:JetBrains Mono;font-size:10px;color:#e74c3c;min-width:20px">${tolerance}mm</span>
            </label>
            <span style="flex:1"></span>
            <button class="bgt-btn" style="background:#e74c3c;color:#fff;border-color:#e74c3c" onclick="ObraCollisionView.run()">Detectar</button>
            <button class="bgt-btn" onclick="ObraCollisionView.clearResults()">Limpiar</button>
          </div>
          ${resultCount > 0 ? `<div style="font-size:10px;color:#aaa">${resultCount} colisión${resultCount !== 1 ? 'es' : ''} encontrada${resultCount !== 1 ? 's' : ''}</div>` : ''}
        </div>
        <div style="flex:1;overflow-y:auto" id="col-results-list">
          ${resultsHTML}
        </div>
        <div style="padding:6px 10px;border-top:1px solid #2a2a45;display:flex;gap:4px;flex-shrink:0">
          <button class="bgt-btn" onclick="ObraCollisionView.exportBCF()" ${lastResults.length === 0 ? 'disabled style="opacity:0.4"' : ''}>Exportar BCF</button>
          <button class="bgt-btn" onclick="ObraCollisionView.exportJSON()" ${lastResults.length === 0 ? 'disabled style="opacity:0.4"' : ''}>Exportar JSON</button>
        </div>
      </div>`;
    setTimeout(() => {
      win.body.querySelectorAll('.col-severity').forEach(el => {
        const text = el.textContent;
        el.className = 'col-severity';
        if (text === 'Crítica') el.classList.add('col-severity-critical');
        else if (text === 'Alta') el.classList.add('col-severity-high');
        else if (text === 'Media') el.classList.add('col-severity-medium');
        else if (text === 'Baja') el.classList.add('col-severity-low');
      });
    }, 0);
  }

  function run() {
    if (typeof ObraApp === 'undefined') return;
    const entries = ObraApp.getEntries ? ObraApp.getEntries() : null;
    if (!entries) return;
    const typeA = document.getElementById('col-type-a')?.value;
    const typeB = document.getElementById('col-type-b')?.value;
    if (!typeA || !typeB) { alert('Seleccioná dos categorías'); return; }
    const tolerance = parseFloat(document.getElementById('col-tolerance')?.value) || 0;

    const results = ObraTools.detectCollisions(entries, typeA, typeB);

    // Calculate approximate overlap volume for each result
    lastResults = results.map(r => {
      let volume = 0;
      try {
        const group = ObraViewer.getModelGroup();
        const aChild = group.children.find(c => c.userData.expressID === r.a.expressID);
        const bChild = group.children.find(c => c.userData.expressID === r.b.expressID);
        if (aChild && bChild) {
          const boxA = new THREE.Box3().setFromObject(aChild);
          const boxB = new THREE.Box3().setFromObject(bChild);
          const intersect = boxA.intersect(boxB);
          if (!intersect.isEmpty()) {
            const size = new THREE.Vector3();
            intersect.getSize(size);
            volume = size.x * size.y * size.z;
          }
        }
      } catch (e) {}
      return { ...r, volume: Math.round(volume * 100) / 100 };
    });

    render();
  }

  function clearResults() {
    ObraTools.clearCollisions();
    lastResults = [];
    render();
  }

  function exportJSON() {
    ObraTools.exportCollisionsJSON();
  }

  function exportBCF() {
    const bcf = {
      version: '2.1',
      topic: {
        title: 'Colisiones - ObraView',
        description: lastResults.length + ' colisiones detectadas',
        creationDate: new Date().toISOString(),
      },
      collisions: lastResults.map((r, i) => ({
        index: i + 1,
        severity: getSeverity(r.volume).label,
        elementA: { id: r.a.expressID, type: r.a.typeName, name: r.a.name },
        elementB: { id: r.b.expressID, type: r.b.typeName, name: r.b.name },
        overlapVolume: r.volume + ' m³',
      })),
    };
    const json = JSON.stringify(bcf, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colisiones.bcf';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { open, close, render, run, clearResults, exportJSON, exportBCF };
})();
