const ObraPropertiesPanel = (() => {
  let visible = false;

  function getPanel() {
    let panel = document.getElementById('properties-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'properties-panel';
      panel.className = 'properties-panel';
      document.getElementById('app').appendChild(panel);
    }
    return panel;
  }

  function show(entry, props) {
    const panel = getPanel();
    visible = true;

    const typeColors = {
      IfcWall: '#e74c3c', IfcSlab: '#3498db', IfcBeam: '#2ecc71',
      IfcColumn: '#9b59b6', IfcDoor: '#f39c12', IfcWindow: '#1abc9c',
      IfcRoof: '#e67e22', IfcStair: '#34495e',
    };
    const color = typeColors[entry.typeName] || '#666';

    let html = `
      <div class="panel-header" style="border-left: 3px solid ${color};">
        <div class="panel-title">${escapeHTML(entry.name)}</div>
        <button class="panel-close" onclick="ObraPropertiesPanel.hide()">✕</button>
      </div>
      <div class="panel-body">
        <div class="prop-group">
          <div class="prop-row"><span class="prop-label">Tipo</span><span class="prop-value">${entry.typeName}</span></div>
          <div class="prop-row"><span class="prop-label">ID</span><span class="prop-value">${entry.expressID}</span></div>
          <div class="prop-row"><span class="prop-label">Nivel</span><span class="prop-value">${entry.storey || '—'}</span></div>
        </div>
        <div class="prop-divider"></div>
        <div class="prop-group">
          <div class="prop-section-title">Propiedades IFC</div>
    `;

    if (props && Object.keys(props).length > 0) {
      const sorted = Object.entries(props).sort(([a], [b]) => a.localeCompare(b));
      for (const [key, val] of sorted) {
        if (key === 'expressID' || key === 'type') continue;
        const shortKey = key.replace(/^(Name|Description|Tag|GlobalId)\.value$/, '$1')
                           .replace(/\.value$/, '')
                           .replace(/^.*\./, '');
        html += `<div class="prop-row"><span class="prop-label">${escapeHTML(shortKey)}</span><span class="prop-value">${escapeHTML(String(val).slice(0, 80))}</span></div>`;
      }
    } else {
      html += `<div class="prop-row"><span class="prop-label" style="color:#666">Sin propiedades adicionales</span></div>`;
    }

    html += `
        </div>
      </div>
    `;

    panel.innerHTML = html;
    panel.classList.add('visible');
  }

  function hide() {
    const panel = document.getElementById('properties-panel');
    if (panel) {
      panel.classList.remove('visible');
    }
    visible = false;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { show, hide };
})();
