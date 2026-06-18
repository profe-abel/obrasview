const ObraBudget = (() => {
  const STORAGE_KEY = 'obraview_budget';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getAll() { return load(); }

  function addItem(data) {
    const items = load();
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      code: data.code || '',
      description: data.description || '',
      unit: data.unit || 'ud',
      quantity: parseFloat(data.quantity) || 0,
      unitPrice: parseFloat(data.unitPrice) || 0,
      category: data.category || 'Materiales',
      bimLinked: !!data.bimLinked,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    item.total = item.quantity * item.unitPrice;
    items.push(item);
    save(items);
    return item;
  }

  function updateItem(id, data) {
    const items = load();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    Object.assign(items[idx], data);
    items[idx].total = items[idx].quantity * items[idx].unitPrice;
    items[idx].updatedAt = new Date().toISOString();
    save(items);
    return items[idx];
  }

  function deleteItem(id) {
    let items = load();
    items = items.filter(i => i.id !== id);
    save(items);
  }

  function getTotal() {
    return load().reduce((s, i) => s + i.total, 0);
  }

  function getByCategory() {
    const items = load();
    const cats = {};
    items.forEach(i => {
      cats[i.category] = (cats[i.category] || 0) + i.total;
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats).map(([name, value]) => ({
      name, value, pct: total > 0 ? (value / total * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }

  function exportCSV() {
    const items = load();
    const header = 'Código,Descripción,Unidad,Cantidad,P.Unitario,Total,Categoría,Vínculo BIM';
    const rows = items.map(i =>
      `"${i.code}","${i.description}","${i.unit}",${i.quantity},${i.unitPrice},${i.total},"${i.category}","${i.bimLinked ? 'Sí' : 'No'}"`
    );
    return header + '\n' + rows.join('\n');
  }

  function exportJSON() {
    const json = JSON.stringify(load(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presupuesto-5d.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCSV(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) throw new Error('CSV vacío o inválido');
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 6) continue;
      items.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        code: cols[0],
        description: cols[1],
        unit: cols[2],
        quantity: parseFloat(cols[3]) || 0,
        unitPrice: parseFloat(cols[4]) || 0,
        category: cols[6] || 'Materiales',
        bimLinked: (cols[7] || '').toLowerCase() === 'sí',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      items[items.length - 1].total = items[items.length - 1].quantity * items[items.length - 1].unitPrice;
    }
    save(items);
    return items;
  }

  function importXLSX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws);
          const items = data.map((row, i) => {
            const qty = parseFloat(row.Cantidad || row.quantity || row.qty || 0);
            const up = parseFloat(row['P.Unitario'] || row.unitPrice || row.unit_price || 0);
            return {
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + i,
              code: String(row.Código || row.code || ''),
              description: String(row.Descripción || row.description || ''),
              unit: String(row.Unidad || row.unit || 'ud'),
              quantity: qty,
              unitPrice: up,
              category: String(row.Categoría || row.category || 'Materiales'),
              bimLinked: !!(row['Vínculo BIM'] || row.bimLinked || '').toString().toLowerCase().includes('sí'),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
          items.forEach(i => { i.total = i.quantity * i.unitPrice; });
          save(items);
          resolve(items);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  return { getAll, addItem, updateItem, deleteItem, getTotal, getByCategory, exportCSV, exportJSON, importCSV, importXLSX };
})();
