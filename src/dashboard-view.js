const ObraDashboard = (() => {
  let scheduledRender = null;

  function render() {
    const win = ObraWindowManager.get('dashboard');
    if (!win) return;

    // Compute KPIs from live data
    const issues = ObraStorage.getIssues();
    const criticalIssues = issues.filter(i => i.status === 'pendiente').length;

    let avgAvance = 0;
    let rubroCount = 0;
    let totalBudget = 0;
    let cats = [];
    try {
      const raw = localStorage.getItem('obraview_schedule_rubros');
      if (raw) {
        const rubros = JSON.parse(raw);
        rubroCount = rubros.length;
        if (rubroCount > 0) avgAvance = rubros.reduce((s, r) => s + (parseInt(r.avance) || 0), 0) / rubroCount;
      }
    } catch (e) {}

    if (typeof ObraBudget !== 'undefined') {
      totalBudget = ObraBudget.getTotal();
      cats = ObraBudget.getByCategory();
    }

    const fmt = (n) => '$ ' + n.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fmtShort = (n) => {
      if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
      return '$' + n.toFixed(1);
    };

    // S-Curve data (generate from rubros distribution)
    const sPoints = generateSCurve();
    const planPath = buildSCurvePath(sPoints.plan);
    const realPath = buildSCurvePath(sPoints.real);

    // Donut chart segments
    const donutSegments = cats.map((c, i) => {
      const colors = ['#4a9eff', '#10b981', '#ffb961', '#ebb2ff', '#e74c3c'];
      return { ...c, color: colors[i % colors.length] };
    });
    const donutSVG = buildDonutSVG(donutSegments);

    // Issue severity breakdown
    const severityCounts = { pendiente: 0, progreso: 0, resuelto: 0 };
    issues.forEach(i => { if (severityCounts[i.status] !== undefined) severityCounts[i.status]++; });
    const maxSeverity = Math.max(severityCounts.pendiente, severityCounts.progreso, severityCounts.resuelto, 1);
    const sevColors = { pendiente: '#e74c3c', progreso: '#f39c12', resuelto: '#2ecc71' };
    const sevLabels = { pendiente: 'Pendientes', progreso: 'En progreso', resuelto: 'Resueltas' };

    const sevHTML = Object.entries(severityCounts).map(([k, v]) =>
      `<div>
        <div class="d-flex" style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
          <span style="color:#aaa">${sevLabels[k]}</span>
          <span style="color:#e3e0f1;font-weight:600">${v}</span>
        </div>
        <div style="height:4px;background:#2a2a45;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${(v / maxSeverity * 100).toFixed(1)}%;background:${sevColors[k]};border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>`
    ).join('');

    const kpiAvancePct = avgAvance.toFixed(1);
    const avanceSegments = Math.round(avgAvance / 20);

    win.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #2a2a45;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:10px;height:10px;border-radius:50%;background:#10b981"></div>
            <span style="font-size:14px;font-weight:600">Dashboard de Control de Proyecto</span>
            <span style="font-size:10px;background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:1px 8px;border-radius:4px">4D/5D LIVE</span>
          </div>
          <button class="bgt-btn" onclick="ObraDashboard.render()" title="Actualizar">↻</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:14px">
          <!-- KPI cards -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
            <div class="dash-card">
              <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Presupuesto Total</div>
              <div style="font-size:20px;font-weight:700;color:#e3e0f1;margin-top:2px">${totalBudget > 0 ? fmtShort(totalBudget) : '$ —'}</div>
              <div style="height:3px;background:#2a2a45;border-radius:4px;margin-top:8px;overflow:hidden">
                <div style="height:100%;width:${cats.length > 0 ? '100' : '0'}%;background:#10b981;border-radius:4px"></div>
              </div>
            </div>
            <div class="dash-card">
              <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Avance General</div>
              <div style="font-size:20px;font-weight:700;color:#e3e0f1;margin-top:2px">${kpiAvancePct}%</div>
              <div style="display:flex;gap:3px;margin-top:8px">
                ${[0,1,2,3,4].map(i => `<div style="height:3px;flex:1;border-radius:4px;background:${i < avanceSegments ? '#10b981' : '#2a2a45'}"></div>`).join('')}
              </div>
            </div>
            <div class="dash-card">
              <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Rubros Programados</div>
              <div style="font-size:20px;font-weight:700;color:#e3e0f1;margin-top:2px">${rubroCount}</div>
              <div style="height:3px;background:#2a2a45;border-radius:4px;margin-top:8px;overflow:hidden">
                <div style="height:100%;width:${rubroCount > 0 ? '100' : '0'}%;background:#4a9eff;border-radius:4px"></div>
              </div>
            </div>
            <div class="dash-card" style="border-color:${criticalIssues > 0 ? 'rgba(231,76,60,0.4)' : '#2a2a45'}">
              <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px">Incidencias Pendientes</div>
              <div style="font-size:20px;font-weight:700;color:${criticalIssues > 0 ? '#e74c3c' : '#e3e0f1'};margin-top:2px">${criticalIssues}</div>
              <div style="display:flex;gap:3px;margin-top:8px">
                ${[0,1,2].map(i => `<div style="width:8px;height:8px;border-radius:50%;background:${i === 0 && criticalIssues > 0 ? '#e74c3c' : '#2a2a45'};${i === 0 && criticalIssues > 0 ? 'animation:pulse-dash 1.5s infinite' : ''}"></div>`).join('')}
              </div>
            </div>
          </div>
          <!-- Charts grid -->
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px">
            <!-- S-Curve -->
            <div style="border:1px solid #2a2a45;border-radius:8px;padding:14px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div>
                  <div style="font-size:13px;font-weight:600">Curva S de Progreso</div>
                  <div style="font-size:10px;color:#666">Planificado vs Real</div>
                </div>
                <div style="display:flex;gap:12px">
                  <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#aaa"><div style="width:16px;height:2px;background:#4a9eff"></div>Plan</div>
                  <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#aaa"><div style="width:16px;height:2px;background:#10b981"></div>Real</div>
                </div>
              </div>
              <div style="position:relative;height:180px;border-left:1px solid #2a2a45;border-bottom:1px solid #2a2a45;margin-left:30px;margin-bottom:20px">
                <svg style="width:100%;height:100%;overflow:visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <line stroke="#2a2a45" stroke-dasharray="2,2" stroke-width="0.5" x1="0" x2="100" y1="20" y2="20"></line>
                  <line stroke="#2a2a45" stroke-dasharray="2,2" stroke-width="0.5" x1="0" x2="100" y1="40" y2="40"></line>
                  <line stroke="#2a2a45" stroke-dasharray="2,2" stroke-width="0.5" x1="0" x2="100" y1="60" y2="60"></line>
                  <line stroke="#2a2a45" stroke-dasharray="2,2" stroke-width="0.5" x1="0" x2="100" y1="80" y2="80"></line>
                  <path d="${planPath}" fill="none" opacity="0.4" stroke="#4a9eff" stroke-width="1.5"></path>
                  <path d="${realPath}" fill="none" stroke="#10b981" stroke-width="2.5"></path>
                </svg>
                <div style="position:absolute;left:-30px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-between;font-size:8px;color:#666">
                  <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
                <div style="position:absolute;left:0;right:0;bottom:-18px;display:flex;justify-content:space-between;font-size:8px;color:#666">
                  <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                </div>
              </div>
            </div>
            <!-- Cost distribution donut -->
            <div style="border:1px solid #2a2a45;border-radius:8px;padding:14px">
              <div style="font-size:13px;font-weight:600;margin-bottom:4px">Distribución (5D)</div>
              <div style="font-size:10px;color:#666;margin-bottom:12px">Desglose de costos</div>
              ${donutSegments.length > 0 ? `
              <div style="display:flex;align-items:center;gap:12px">
                <div style="width:80px;height:80px;flex-shrink:0">${donutSVG}</div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                  ${donutSegments.map(c => `
                    <div style="display:flex;align-items:center;justify-content:space-between;font-size:10px">
                      <div style="display:flex;align-items:center;gap:4px">
                        <div style="width:6px;height:6px;border-radius:50%;background:${c.color}"></div>
                        <span style="color:#aaa">${c.name}</span>
                      </div>
                      <span style="color:#e3e0f1;font-weight:600">${c.pct.toFixed(1)}%</span>
                    </div>`).join('')}
                </div>
              </div>` : '<div style="color:#555;font-size:12px;text-align:center;padding:20px">Sin datos de presupuesto</div>'}
            </div>
          </div>
          <!-- Issue severity -->
          <div style="border:1px solid #2a2a45;border-radius:8px;padding:14px">
            <div style="font-size:13px;font-weight:600;margin-bottom:10px">Estado de Incidencias</div>
            ${issues.length > 0 ? sevHTML : '<div style="color:#555;font-size:12px">Sin incidencias registradas</div>'}
          </div>
        </div>
      </div>`;
  }

  function generateSCurve() {
    // Generate realistic S-curve points based on rubro count
    const pts = 20;
    const plan = [];
    const real = [];
    let rubroCount = 0;
    try {
      const raw = localStorage.getItem('obraview_schedule_rubros');
      if (raw) rubroCount = JSON.parse(raw).length;
    } catch (e) {}
    const skew = Math.min(rubroCount / 20, 1) * 0.15;
    for (let i = 0; i <= pts; i++) {
      const t = i / pts;
      // Logistic function for S-curve
      const planY = 1 / (1 + Math.exp(-12 * (t - 0.5)));
      const realY = 1 / (1 + Math.exp(-12 * (t - 0.5 + skew)));
      plan.push({ x: t * 100, y: (1 - planY) * 100 });
      real.push({ x: t * 100, y: (1 - realY) * 100 });
    }
    return { plan, real };
  }

  function buildSCurvePath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  function buildDonutSVG(segments) {
    if (!segments || segments.length === 0) return '';
    const total = segments.reduce((s, c) => s + c.pct, 0) || 100;
    const r = 16;
    const cx = 18, cy = 18;
    let offset = 0;
    const slices = segments.map(c => {
      const pct = c.pct / total;
      const dashLen = pct * 100;
      const slice = `<circle cx="${cx}" cy="${cy}" fill="none" r="${r}" stroke="${c.color}" stroke-dasharray="${dashLen.toFixed(1)} ${(100 - dashLen).toFixed(1)}" stroke-dashoffset="${-offset}" stroke-width="4"></circle>`;
      offset += dashLen;
      return slice;
    }).join('');
    return `<svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)">${slices}</svg>`;
  }

  return { render };
})();
