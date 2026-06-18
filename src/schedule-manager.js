const ObraScheduleManager = (() => {
  const STORAGE_KEY = 'obraview_schedule_rubros';
  let entries = null;

  function getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { rubros: [], escala: 'días' };
    } catch (e) {
      return { rubros: [], escala: 'días' };
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo guardar programación', e);
    }
  }

  function init(entriesMap) {
    entries = entriesMap;
  }

  function getEntries() { return entries; }

  function getRubros() {
    return getData().rubros;
  }

  function getEscala() {
    return getData().escala;
  }

  function setEscala(val) {
    const data = getData();
    data.escala = val;
    saveData(data);
  }

  function addRubro(rubro) {
    const data = getData();
    rubro.id = 'R' + Date.now().toString(36).toUpperCase();
    rubro.filters = rubro.filters || [];
    rubro.avance = rubro.avance || 0;
    data.rubros.push(rubro);
    saveData(data);
    return rubro;
  }

  function updateRubro(id, updates) {
    const data = getData();
    const idx = data.rubros.findIndex(r => r.id === id);
    if (idx === -1) return null;
    data.rubros[idx] = { ...data.rubros[idx], ...updates, id: data.rubros[idx].id };
    saveData(data);
    return data.rubros[idx];
  }

  function deleteRubro(id) {
    const data = getData();
    data.rubros = data.rubros.filter(r => r.id !== id);
    saveData(data);
    return data.rubros;
  }

  function computeFilterEids(filter) {
    if (!entries) return [];
    if (filter.type === 'expressIds') {
      return filter.eids.filter(eid => entries.has(eid));
    }
    if (filter.type === 'levelType') {
      const result = [];
      for (const [, entry] of entries) {
        if (entry.storey === filter.storey && entry.typeName === filter.typeName) {
          result.push(entry.expressID);
        }
      }
      return result;
    }
    if (filter.type === 'nameMatch') {
      const pattern = filter.pattern || '';
      if (!pattern) return [];
      const parts = pattern.split('*').map(p => p.replace(/[.+^${}()|[\]\\]/g, '\\$&'));
      const re = new RegExp('^' + parts.join('.*') + '$', 'i');
      const result = [];
      for (const [, entry] of entries) {
        if (re.test(entry.name)) result.push(entry.expressID);
      }
      return result;
    }
    if (filter.type === 'zRange') {
      const zMin = filter.zMin !== undefined ? filter.zMin : -Infinity;
      const zMax = filter.zMax !== undefined ? filter.zMax : Infinity;
      const result = [];
      const box = new THREE.Box3();
      for (const [, entry] of entries) {
        if (!entry.mesh) continue;
        box.setFromObject(entry.mesh);
        const cz = (box.min.z + box.max.z) / 2;
        if (cz >= zMin && cz <= zMax) result.push(entry.expressID);
      }
      return result;
    }
    if (filter.type === 'volumeRange') {
      const volMin = filter.volMin !== undefined ? filter.volMin : 0;
      const volMax = filter.volMax !== undefined ? filter.volMax : Infinity;
      const result = [];
      const box = new THREE.Box3();
      const size = new THREE.Vector3();
      for (const [, entry] of entries) {
        if (!entry.mesh) continue;
        box.setFromObject(entry.mesh);
        box.getSize(size);
        const vol = size.x * size.y * size.z;
        if (vol >= volMin && vol <= volMax) result.push(entry.expressID);
      }
      return result;
    }
    return [];
  }

  function getRubroEids(rubro) {
    const eidSet = new Set();
    for (const filter of (rubro.filters || [])) {
      const ids = computeFilterEids(filter);
      for (const id of ids) eidSet.add(id);
    }
    return [...eidSet];
  }

  function buildColorMap() {
    const colorMap = new Map();
    const rubros = getRubros();
    for (const rubro of rubros) {
      const eids = getRubroEids(rubro);
      const colorHex = parseInt(rubro.color.replace('#', ''), 16);
      for (const eid of eids) {
        colorMap.set(eid, colorHex);
      }
    }
    return colorMap;
  }

  function getStoreys() {
    if (!entries) return [];
    const storeySet = new Set();
    for (const [, entry] of entries) {
      if (entry.storey) storeySet.add(entry.storey);
    }
    return [...storeySet].sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb || a.localeCompare(b);
    });
  }

  function getTypeNames() {
    if (!entries) return [];
    const typeSet = new Set();
    for (const [, entry] of entries) {
      if (entry.typeName) typeSet.add(entry.typeName);
    }
    return [...typeSet].sort();
  }

  function importCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vacío o sin datos');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const colRubro = headers.indexOf('rubro');
    const colInicio = headers.indexOf('inicio');
    const colFin = headers.indexOf('fin');
    const colColor = headers.indexOf('color');
    const colNivel = headers.indexOf('nivel');
    const colTipo = headers.indexOf('tipo');
    const colAvance = headers.indexOf('avance');
    if (colRubro === -1 || colInicio === -1 || colFin === -1) {
      throw new Error('CSV debe tener columnas: Rubro, Inicio, Fin');
    }
    const rubros = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length < 3) continue;
      const nombre = vals[colRubro].trim();
      if (!nombre) continue;
      const inicio = vals[colInicio].trim();
      const fin = vals[colFin].trim();
      const color = (vals[colColor] || '#999999').trim();
      const nivel = vals[colNivel] ? vals[colNivel].trim() : '';
      const tipo = vals[colTipo] ? vals[colTipo].trim() : '';
      const avance = colAvance >= 0 ? Math.min(100, Math.max(0, parseInt(vals[colAvance]) || 0)) : 0;
      const filters = [];
      if (nivel && tipo) {
        filters.push({ type: 'levelType', storey: nivel, typeName: tipo });
      }
      rubros.push({ nombre, color, startDate: inicio, endDate: fin, filters, avance });
    }
    return rubros;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  }

  function exportCSV() {
    const rubros = getRubros();
    const rows = [['Rubro', 'Inicio', 'Fin', 'Color', 'Avance', 'Nivel', 'Tipo']];
    for (const r of rubros) {
      const levelFilters = (r.filters || []).filter(f => f.type === 'levelType');
      if (levelFilters.length === 0) {
        rows.push([r.nombre, r.startDate || '', r.endDate || '', r.color, String(r.avance || 0), '', '']);
      } else {
        for (const f of levelFilters) {
          rows.push([r.nombre, r.startDate || '', r.endDate || '', r.color, String(r.avance || 0), f.storey, f.typeName]);
        }
      }
    }
    const csv = rows.map(row => row.map(v => {
      const s = String(v);
      return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programacion-obra.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importXLSX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (typeof XLSX === 'undefined') throw new Error('Librería XLSX no cargada');
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (data.length < 2) throw new Error('Archivo vacío o sin datos');
          const headers = data[0].map(h => String(h).toLowerCase().trim());
          const colRubro = headers.indexOf('rubro');
          const colInicio = headers.indexOf('inicio');
          const colFin = headers.indexOf('fin');
          const colColor = headers.indexOf('color');
          const colNivel = headers.indexOf('nivel');
          const colTipo = headers.indexOf('tipo');
          const colAvance = headers.indexOf('avance');
          if (colRubro === -1 || colInicio === -1 || colFin === -1) {
            throw new Error('El archivo debe tener columnas: Rubro, Inicio, Fin');
          }
          const rubros = [];
          for (let i = 1; i < data.length; i++) {
            const vals = data[i];
            if (!vals || vals.length < 3) continue;
            const nombre = String(vals[colRubro] || '').trim();
            if (!nombre) continue;
            const inicio = String(vals[colInicio] || '').trim();
            const fin = String(vals[colFin] || '').trim();
            const color = vals[colColor] ? String(vals[colColor]).trim() : '#999999';
            const nivel = vals[colNivel] ? String(vals[colNivel]).trim() : '';
            const tipo = vals[colTipo] ? String(vals[colTipo]).trim() : '';
            const avance = colAvance >= 0 ? Math.min(100, Math.max(0, parseInt(vals[colAvance]) || 0)) : 0;
            const filters = [];
            if (nivel && tipo) filters.push({ type: 'levelType', storey: nivel, typeName: tipo });
            rubros.push({ nombre, color, startDate: inicio, endDate: fin, filters, avance });
          }
          resolve(rubros);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('No se pudo leer'));
      reader.readAsArrayBuffer(file);
    });
  }

  function exportXLSX() {
    if (typeof XLSX === 'undefined') { alert('Librería XLSX no cargada'); return; }
    const rubros = getRubros();
    const rows = [['Rubro', 'Inicio', 'Fin', 'Color', 'Avance', 'Nivel', 'Tipo']];
    for (const r of rubros) {
      const levelFilters = (r.filters || []).filter(f => f.type === 'levelType');
      if (levelFilters.length === 0) {
        rows.push([r.nombre, r.startDate || '', r.endDate || '', r.color, r.avance || 0, '', '']);
      } else {
        for (const f of levelFilters) {
          rows.push([r.nombre, r.startDate || '', r.endDate || '', r.color, r.avance || 0, f.storey, f.typeName]);
        }
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Auto column widths
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rubros');
    XLSX.writeFile(wb, 'programacion-obra.xlsx');
  }

  function exportJSON() {
    const data = getData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programacion-obra.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.rubros || !Array.isArray(data.rubros)) throw new Error('Formato inválido');
          saveData(data);
          resolve(data);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('No se pudo leer'));
      reader.readAsText(file);
    });
  }

  return {
    init, getEntries,
    getRubros, addRubro, updateRubro, deleteRubro,
    getEscala, setEscala,
    getRubroEids, buildColorMap,
    getStoreys, getTypeNames,
    importCSV, exportCSV, importXLSX, exportXLSX,
    exportJSON, importJSON,
  };
})();
