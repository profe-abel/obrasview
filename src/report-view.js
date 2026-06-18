const ObraReportView = (() => {
  function generateReport() {
    const rubros = ObraScheduleManager.getRubros();
    const entries = ObraScheduleManager.getEntries();
    const totalElements = entries ? entries.size : 0;
    const assignedEids = new Set();
    for (const r of rubros) {
      const eids = ObraScheduleManager.getRubroEids(r);
      for (const eid of eids) assignedEids.add(eid);
    }
    const assignedCount = assignedEids.size;

    let minDate = Infinity, maxDate = -Infinity;
    for (const r of rubros) {
      if (r.startDate && r.endDate) {
        const s = new Date(r.startDate).getTime();
        const e = new Date(r.endDate).getTime();
        if (s < minDate) minDate = s;
        if (e > maxDate) maxDate = e;
      }
    }
    const totalDays = minDate !== Infinity ? Math.ceil((maxDate - minDate) / 86400000) : 0;

    let screenshot = '';
    try {
      const renderer = ObraViewer.getRenderer();
      if (renderer) screenshot = renderer.domElement.toDataURL('image/png');
    } catch (e) {}

    const modelName = (ObraApp.getCurrentModel && ObraApp.getCurrentModel()?.modelName) || 'Sin modelo';
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const w = window.open('', '_blank');
    if (!w) { alert('Permití ventanas emergentes para ver el reporte'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe de Programación - ' + escHTML(modelName) + '</title><style>' +
      '@page{margin:12mm}' +
      'body{font-family:Segoe UI,Arial,sans-serif;color:#222;font-size:12px;line-height:1.5;padding:20px}' +
      'h1{font-size:20px;color:#1a1a2e;border-bottom:2px solid #4a9eff;padding-bottom:6px}' +
      'h2{font-size:14px;color:#333;margin-top:18px}' +
      '.meta{color:#666;font-size:11px;margin-bottom:14px}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px}' +
      'th,td{padding:5px 8px;text-align:left;border-bottom:1px solid #ddd}' +
      'th{background:#4a9eff;color:#fff;font-weight:600}' +
      '.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;vertical-align:middle}' +
      '.gantt{margin:8px 0}' +
      '.gr{display:flex;align-items:center;margin-bottom:4px}' +
      '.gl{width:120px;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.gt{flex:1;height:18px;background:#eee;border-radius:3px;position:relative}' +
      '.gb{position:absolute;top:1px;height:16px;border-radius:3px;min-width:4px}' +
      '.gf{position:absolute;top:0;left:0;height:100%;background:rgba(255,255,255,0.3)}' +
      '.stats{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}' +
      '.sc{background:#f5f7fa;border-radius:8px;padding:10px 14px;flex:1;min-width:100px}' +
      '.sc .n{font-size:22px;font-weight:700;color:#4a9eff}' +
      '.sc .l{font-size:10px;color:#666;text-transform:uppercase}' +
      '.shot{margin:12px 0;text-align:center}' +
      '.shot img{max-width:100%;max-height:300px;border:1px solid #ddd;border-radius:6px}' +
      '.ftr{margin-top:20px;font-size:10px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:8px}' +
      '@media print{.shot img{max-height:200px}}' +
    '</style></head><body>');

    w.document.write('<h1>Informe de Programaci\u00f3n</h1>');
    w.document.write('<div class="meta"><strong>Proyecto:</strong> ' + escHTML(modelName) + '<br>');
    w.document.write('<strong>Fecha:</strong> ' + today + '<br>');
    w.document.write('<strong>Duraci\u00f3n total:</strong> ' + totalDays + ' d\u00edas &middot; <strong>Rubros:</strong> ' + rubros.length + ' &middot; <strong>Elementos:</strong> ' + totalElements + ' (' + assignedCount + ' asignados)</div>');

    if (rubros.length > 0) {
      w.document.write('<h2>Rubros</h2><table><tr><th>Rubro</th><th>Inicio</th><th>Fin</th><th>Duraci\u00f3n</th><th>Avance</th><th>Elementos</th></tr>');
      for (const r of rubros) {
        const dur = r.startDate && r.endDate ? Math.ceil((new Date(r.endDate) - new Date(r.startDate)) / 86400000) + 1 : '—';
        const count = ObraScheduleManager.getRubroEids(r).length;
        w.document.write('<tr><td><span class="dot" style="background:' + r.color + '"></span>' + escHTML(r.nombre) + '</td><td>' + (r.startDate || '—') + '</td><td>' + (r.endDate || '—') + '</td><td>' + dur + '</td><td>' + (r.avance || 0) + '%</td><td>' + count + '</td></tr>');
      }
      w.document.write('</table>');
    }

    const withDates = rubros.filter(r => r.startDate && r.endDate);
    if (withDates.length > 0) {
      const sorted = [...withDates].sort((a, b) => a.startDate.localeCompare(b.startDate));
      let minD = Infinity, maxD = -Infinity;
      for (const r of sorted) {
        const s = new Date(r.startDate).getTime(), e = new Date(r.endDate).getTime();
        if (s < minD) minD = s;
        if (e > maxD) maxD = e;
      }
      const dayMs = 86400000, totalD = Math.ceil((maxD - minD) / dayMs) || 1;

      w.document.write('<h2>Cronograma</h2><div class="gantt">');
      for (const r of sorted) {
        const s = new Date(r.startDate).getTime(), e = new Date(r.endDate).getTime();
        const left = Math.max(0, ((s - minD) / dayMs) / totalD * 100);
        const width = Math.min(100 - left, ((e - s) / dayMs) / totalD * 100);
        w.document.write('<div class="gr"><div class="gl">' + escHTML(r.nombre) + '</div><div class="gt"><div class="gb" style="left:' + left + '%;width:' + Math.max(width, 2) + '%;background:' + r.color + '"><div class="gf" style="width:' + Math.min(100, Math.max(0, r.avance || 0)) + '%"></div></div></div></div>');
      }
      w.document.write('</div>');
    }

    if (screenshot) {
      w.document.write('<h2>Vista 3D del modelo</h2><div class="shot"><img src="' + screenshot + '" alt="Vista 3D"></div>');
    }

    w.document.write('<h2>Resumen</h2><div class="stats">');
    w.document.write('<div class="sc"><div class="n">' + rubros.length + '</div><div class="l">Rubros</div></div>');
    w.document.write('<div class="sc"><div class="n">' + totalElements + '</div><div class="l">Elementos totales</div></div>');
    w.document.write('<div class="sc"><div class="n">' + assignedCount + '</div><div class="l">Elementos asignados</div></div>');
    w.document.write('<div class="sc"><div class="n">' + totalDays + '</div><div class="l">D\u00edas totales</div></div>');
    w.document.write('</div>');
    w.document.write('<div class="ftr">Generado por ObraView &mdash; ' + today + '</div>');

    w.document.write('<script>window.onload=function(){window.print();window.close()};<' + '/script>');
    w.document.write('</body></html>');
    w.document.close();
  }

  function escHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  return { generateReport };
})();
