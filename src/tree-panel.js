const ObraTreePanel = (() => {
  let entries = null;
  let visible = false;
  let filterText = '';

  function getPanel() {
    let panel = document.getElementById('tree-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tree-panel';
      panel.className = 'tree-panel';
      document.getElementById('app').appendChild(panel);
    }
    return panel;
  }

  function build(entriesMap) {
    entries = entriesMap;
    render();
  }

  function render() {
    const panel = getPanel();
    if (!entries) return;

    const storeys = groupByStorey(entries);
    const total = entries.size;
    const visibleCount = ObraViewer.getVisibleCount();

    let html = `
      <div class="tree-header">
        <div class="tree-title">Explorar</div>
        <button class="tree-close" onclick="ObraTreePanel.hide()">✕</button>
      </div>
      <div class="tree-toolbar">
        <input class="tree-search" id="tree-search" type="text" placeholder="Buscar elemento…" value="${escapeHTML(filterText)}">
        <div class="tree-actions">
          <button class="tree-btn" onclick="ObraTreePanel.showAll()">Mostrar todo</button>
          <button class="tree-btn" onclick="ObraTreePanel.hideAll()">Ocultar todo</button>
        </div>
        <div class="tree-stats">${visibleCount} / ${total} visibles</div>
      </div>
      <div class="tree-body">`;

    for (const [storey, categories] of storeys) {
      const storeyLabel = storey || 'Sin nivel';
      html += `<div class="tree-storey">
        <div class="tree-storey-header" onclick="ObraTreePanel.toggleStorey(this)">
          <span class="tree-arrow">▶</span>
          <span>${escapeHTML(storeyLabel)}</span>
          <span class="tree-count">${categories.size} tipos</span>
        </div>
        <div class="tree-storey-body">`;

      for (const [typeName, items] of categories) {
        html += `<div class="tree-category">
          <div class="tree-cat-header" onclick="ObraTreePanel.toggleCategory(this)">
            <span class="tree-arrow">▶</span>
            <span>${escapeHTML(typeName)}</span>
            <span class="tree-count">${items.length}</span>
          </div>
          <div class="tree-cat-body">`;

        for (const item of items) {
          const match = !filterText || item.name.toLowerCase().includes(filterText.toLowerCase());
          const checked = match ? '' : 'style="display:none"';
          const visChecked = ObraViewer.getModelGroupChildren().find(c => c.userData.expressID === item.expressID)?.visible !== false;
          html += `<label class="tree-item" ${checked} data-eid="${item.expressID}">
            <input type="checkbox" ${visChecked ? 'checked' : ''}
              onchange="ObraTreePanel.toggle(${item.expressID}, this.checked)">
            <span class="tree-item-name">${escapeHTML(item.name)}</span>
          </label>`;
        }

        html += `</div></div>`;
      }

      html += `</div></div>`;
    }

    html += `</div>`;
    panel.innerHTML = html;
    panel.classList.add('visible');
    visible = true;

    document.getElementById('tree-search').addEventListener('input', (e) => {
      filterText = e.target.value;
      render();
    });
  }

  function groupByStorey(entriesMap) {
    const map = new Map();
    for (const [, entry] of entriesMap) {
      const s = entry.storey || '';
      if (!map.has(s)) map.set(s, new Map());
      const cats = map.get(s);
      if (!cats.has(entry.typeName)) cats.set(entry.typeName, []);
      cats.get(entry.typeName).push(entry);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }

  function toggle(expressID, checked) {
    ObraViewer.setElementVisibility(expressID, checked);
    updateStats();
  }

  function toggleStorey(el) {
    el.classList.toggle('collapsed');
    const body = el.nextElementSibling;
    if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
  }

  function toggleCategory(el) {
    el.classList.toggle('collapsed');
    const body = el.nextElementSibling;
    if (body) body.style.display = body.style.display === 'none' ? '' : 'none';
  }

  function showAll() {
    ObraViewer.showAllElements();
    filterText = '';
    render();
  }

  function hideAll() {
    ObraViewer.hideAllElements();
    render();
  }

  function updateStats() {
    const total = entries ? entries.size : 0;
    const visibleCount = ObraViewer.getVisibleCount();
    const el = document.querySelector('.tree-stats');
    if (el) el.textContent = `${visibleCount} / ${total} visibles`;
  }

  function togglePanel() {
    if (visible) hide();
    else if (entries) render();
  }

  function hide() {
    const panel = document.getElementById('tree-panel');
    if (panel) panel.classList.remove('visible');
    visible = false;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { build, render, toggle, toggleStorey, toggleCategory, showAll, hideAll, togglePanel, hide };
})();
