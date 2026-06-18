const ObraSimControls = (() => {
  let rubros = [];

  function init() {
    try { rubros = ObraScheduleManager.getRubros(); } catch (e) { rubros = []; }
    if (rubros.length === 0) return;
    ObraViewer.initSimulation(rubros);
    const win = ObraWindowManager.get('simulation');
    if (win) ObraWindowManager.show('simulation');
    render();
  }

  function render() {
    const win = ObraWindowManager.get('simulation');
    if (!win) return;
    const date = ObraViewer.getSimulationDate();
    const start = ObraViewer.getSimStartDate();
    const end = ObraViewer.getSimEndDate();
    const playing = ObraViewer.isSimPlaying();

    if (!date || !start || !end) {
      win.body.innerHTML = '<div style="padding:20px;text-align:center;color:#555;font-size:12px">Sin datos de programación</div>';
      return;
    }

    const totalMs = end.getTime() - start.getTime();
    const currentMs = date.getTime() - start.getTime();
    const pct = totalMs > 0 ? (currentMs / totalMs * 100) : 0;
    const fmtDate = (d) => d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

    win.body.innerHTML = `
      <div style="padding:8px 12px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <button class="sim-btn ${playing ? 'sim-btn-active' : ''}" id="sim-play-btn" onclick="ObraSimControls.togglePlay()" title="${playing ? 'Pausar' : 'Reproducir'}">
            <span class="material-symbols-outlined" style="font-size:16px">${playing ? 'pause' : 'play_arrow'}</span>
          </button>
          <span style="font-size:11px;font-weight:600;flex:1">Simulación 4D</span>
          <select id="sim-speed" style="font-size:10px;background:#1a1a30;border:1px solid #2a2a45;border-radius:3px;color:#ccc;padding:2px 4px" onchange="ObraSimControls.setSpeed(this.value)">
            <option value="0.1">0.1x</option>
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
          </select>
          <button class="sim-btn" onclick="ObraSimControls.reset()" title="Reiniciar"><span class="material-symbols-outlined" style="font-size:14px">replay</span></button>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="range" id="sim-slider" min="0" max="1000" value="${Math.round(pct * 10)}" step="1"
            style="flex:1;height:3px;accent-color:#4a9eff;cursor:pointer"
            oninput="ObraSimControls.seek(this.value)">
          <span style="font-size:9px;color:#888;white-space:nowrap;min-width:90px;text-align:right">${fmtDate(date)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:8px;color:#555;margin-top:2px">
          <span>${fmtDate(start)}</span>
          <span>${fmtDate(end)}</span>
        </div>
      </div>`;
  }

  function togglePlay() {
    if (ObraViewer.isSimPlaying()) {
      ObraViewer.pauseSimulation();
      render();
    } else {
      ObraViewer.playSimulation(rubros);
      render();
    }
  }

  function seek(val) {
    const start = ObraViewer.getSimStartDate();
    const end = ObraViewer.getSimEndDate();
    if (!start || !end) return;
    const pct = parseInt(val) / 1000;
    const totalMs = end.getTime() - start.getTime();
    const date = new Date(start.getTime() + totalMs * pct);
    ObraViewer.pauseSimulation();
    ObraViewer.applySimulationTime(date, rubros);
    render();
  }

  function setSpeed(val) {
    ObraViewer.setSimulationSpeed(parseFloat(val));
  }

  function reset() {
    const start = ObraViewer.getSimStartDate();
    if (start) {
      ObraViewer.pauseSimulation();
      ObraViewer.applySimulationTime(new Date(start), rubros);
      render();
    }
  }

  function update() {
    const btn = document.getElementById('sim-play-btn');
    if (btn) {
      const playing = ObraViewer.isSimPlaying();
      btn.classList.toggle('sim-btn-active', playing);
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px">${playing ? 'pause' : 'play_arrow'}</span>`;
    }
    const slider = document.getElementById('sim-slider');
    const label = slider?.nextElementSibling;
    const date = ObraViewer.getSimulationDate();
    const start = ObraViewer.getSimStartDate();
    const end = ObraViewer.getSimEndDate();
    if (slider && date && start && end) {
      const pct = (date.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * 100;
      slider.value = Math.round(pct * 10);
    }
    if (label && date) {
      label.textContent = date.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }

  return { init, render, togglePlay, seek, setSpeed, reset, update };
})();
