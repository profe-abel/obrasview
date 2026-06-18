const ObraBudgetView = (() => {
  let editId = null;

  function render() {
    const win = ObraWindowManager.get('budget');
    if (!win) return;
    const items = ObraBudget.getAll();
    const total = ObraBudget.getTotal();
    const cats = ObraBudget.getByCategory();

    const fmt = (n) => '$ ' + n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const qtyFmt = (n) => n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const catBars = cats.map(c =>
      `<div>
        <div class="flex justify-between items-end mb-1">
          <span style="font-size:12px;color:#aaa">${c.name}</span>
          <span style="font-size:11px;color:#f39c12;font-weight:600">${c.pct.toFixed(1)}%</span>
        </div>
        <div style="height:4px;background:#2a2a45;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${c.pct}%;background:#f39c12;border-radius:4px"></div>
        </div>
        <p style="font-size:10px;color:#666;margin-top:2px">${fmt(c.value)}</p>
      </div>`
    ).join('');

    const rows = items.map((i, idx) =>
      `<div class="bgt-row ${idx === 0 ? 'bgt-active' : ''}" data-id="${i.id}" onclick="ObraBudgetView.selectRow(this)" ondblclick="ObraBudgetView.editItem('${i.id}')">
        <div class="bgt-cell bgt-cell-desc"><span class="material-symbols-outlined" style="font-size:14px;color:${i.bimLinked ? '#f39c12' : '#555'}">${i.bimLinked ? 'link' : 'link_off'}</span>${i.code ? '<span style="color:#888;font-size:10px;font-family:JetBrains Mono">' + i.code + '</span> ' : ''}${escapeHTML(i.description)}</div>
        <div class="bgt-cell bgt-cell-unit">${i.unit}</div>
        <div class="bgt-cell bgt-cell-num">${qtyFmt(i.quantity)}</div>
        <div class="bgt-cell bgt-cell-num">${fmt(i.unitPrice)}</div>
        <div class="bgt-cell bgt-cell-num bgt-total">${fmt(i.total)}</div>
        <div class="bgt-cell bgt-cell-status"><span class="bgt-badge ${i.bimLinked ? 'bgt-linked' : 'bgt-unlinked'}">${i.bimLinked ? 'ASIGNADO' : 'SIN ASIGNAR'}</span></div>
      </div>`
    ).join('');

    win.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #2a2a45;flex-shrink:0">
          <div style="display:flex;gap:16px;align-items:center">
            <div>
              <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Presupuesto Total</div>
              <div style="font-size:18px;font-weight:700;color:#e3e0f1">${fmt(total)}</div>
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="bgt-btn" onclick="ObraBudgetView.showForm()" title="Agregar rubro">+ Rubro</button>
            <button class="bgt-btn" onclick="ObraBudgetView.exportCSV()" title="Exportar CSV">CSV</button>
            <button class="bgt-btn" onclick="ObraBudgetView.exportJSON()" title="Exportar JSON">JSON</button>
            <button class="bgt-btn" onclick="document.getElementById('file-import-budget').click()" title="Importar">⬆</button>
            <input type="file" id="file-import-budget" accept=".csv,.xlsx" style="display:none" onchange="ObraBudgetView.importFile(event)">
          </div>
        </div>
        <div id="bgt-form" style="display:${editId !== null ? 'block' : 'none'};padding:8px 12px;border-bottom:1px solid #2a2a45;flex-shrink:0">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-bottom:6px">
            <input class="bgt-input" id="bgt-code" placeholder="Código">
            <input class="bgt-input" id="bgt-desc" placeholder="Descripción">
            <select class="bgt-input" id="bgt-unit"><option value="m³">m³</option><option value="m²">m²</option><option value="kg">kg</option><option value="ud">ud</option><option value="hr">hr</option><option value="gl">gl</option></select>
            <input class="bgt-input" id="bgt-qty" type="number" step="0.01" placeholder="Cantidad">
            <input class="bgt-input" id="bgt-price" type="number" step="0.01" placeholder="P. Unitario">
            <select class="bgt-input" id="bgt-category"><option>Materiales</option><option>Mano de Obra</option><option>Equipos</option></select>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#888"><input type="checkbox" id="bgt-bim"> Vínculo BIM</label>
          </div>
          <div style="display:flex;gap:4px">
            <button class="bgt-btn bgt-btn-primary" onclick="ObraBudgetView.saveForm()">${editId ? 'Actualizar' : 'Agregar'}</button>
            <button class="bgt-btn" onclick="ObraBudgetView.cancelForm()">Cancelar</button>
            ${editId ? '<button class="bgt-btn bgt-btn-danger" onclick="ObraBudgetView.deleteItem()" style="margin-left:auto">Eliminar</button>' : ''}
          </div>
        </div>
        <div id="bgt-header" style="display:grid;grid-template-columns:1.5fr 70px 100px 110px 110px 90px;padding:4px 12px;border-bottom:1px solid #2a2a45;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0">
          <div>Descripción</div><div style="text-align:center">Unidad</div><div style="text-align:right">Cantidad</div><div style="text-align:right">P. Unitario</div><div style="text-align:right">Total</div><div style="text-align:center">BIM</div>
        </div>
        <div style="flex:1;overflow-y:auto" id="bgt-rows">${rows || '<div style="padding:20px;text-align:center;color:#555;font-size:13px">Sin rubros aún. Haz clic en "+ Rubro" para agregar.</div>'}</div>
        <div style="padding:8px 12px;border-top:1px solid #2a2a45;flex-shrink:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${catBars || '<div style="color:#555;font-size:11px">Sin categorías</div>'}</div>
      </div>`;
    editId = null;
  }

  function showForm(data) {
    editId = data ? data.id : null;
    render();
    if (data) {
      document.getElementById('bgt-code').value = data.code || '';
      document.getElementById('bgt-desc').value = data.description || '';
      document.getElementById('bgt-unit').value = data.unit || 'ud';
      document.getElementById('bgt-qty').value = data.quantity || 0;
      document.getElementById('bgt-price').value = data.unitPrice || 0;
      document.getElementById('bgt-category').value = data.category || 'Materiales';
      document.getElementById('bgt-bim').checked = !!data.bimLinked;
    }
  }

  function saveForm() {
    const data = {
      code: document.getElementById('bgt-code').value.trim(),
      description: document.getElementById('bgt-desc').value.trim(),
      unit: document.getElementById('bgt-unit').value,
      quantity: document.getElementById('bgt-qty').value,
      unitPrice: document.getElementById('bgt-price').value,
      category: document.getElementById('bgt-category').value,
      bimLinked: document.getElementById('bgt-bim').checked,
    };
    if (!data.description) { alert('Ingresa una descripción'); return; }
    if (editId) ObraBudget.updateItem(editId, data);
    else ObraBudget.addItem(data);
    editId = null;
    render();
  }

  function cancelForm() { editId = null; render(); }
  function editItem(id) {
    const item = ObraBudget.getAll().find(i => i.id === id);
    if (item) showForm(item);
  }
  function deleteItem() {
    if (editId && confirm('¿Eliminar este rubro?')) { ObraBudget.deleteItem(editId); editId = null; render(); }
  }

  function selectRow(el) {
    document.querySelectorAll('.bgt-row').forEach(r => r.classList.remove('bgt-active'));
    if (el) el.classList.add('bgt-active');
  }

  function exportCSV() {
    const csv = ObraBudget.exportCSV();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'presupuesto-5d.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() { ObraBudget.exportJSON(); }

  function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.name.endsWith('.xlsx')) {
      ObraBudget.importXLSX(file).then(() => { render(); alert('Importado correctamente'); }).catch(err => alert('Error: ' + err.message));
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try { ObraBudget.importCSV(e.target.result); render(); alert('Importado correctamente'); }
        catch (err) { alert('Error: ' + err.message); }
      };
      reader.readAsText(file, 'UTF-8');
    }
    event.target.value = '';
  }

  function escapeHTML(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render, showForm, saveForm, cancelForm, editItem, deleteItem, selectRow, exportCSV, exportJSON, importFile };
})();
