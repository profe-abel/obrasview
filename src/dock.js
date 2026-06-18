const ObraDock = (() => {
  let dockEl = null;
  const items = {};

  function init() {
    dockEl = document.createElement('div');
    dockEl.id = 'obra-dock';
    document.body.appendChild(dockEl);
  }

  function addItem(id, opts) {
    const btn = document.createElement('button');
    btn.className = 'dock-btn';
    btn.dataset.dockId = id;
    btn.title = opts.label || id;

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.setProperty('--accent', opts.accent || '#4a9eff');
    btn.appendChild(dot);

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = opts.icon || 'folder';
    btn.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'dock-label';
    label.textContent = opts.label || id;
    btn.appendChild(label);

    btn.addEventListener('click', (e) => {
      if (opts.onClick) opts.onClick(e, id);
    });

    dockEl.appendChild(btn);
    items[id] = { btn, opts };
    return btn;
  }

  function setActive(id, active) {
    const item = items[id];
    if (!item) return;
    item.btn.classList.toggle('active', active);
  }

  function setOpen(id, open) {
    const item = items[id];
    if (!item) return;
    item.btn.classList.toggle('open', open);
  }

  function getItem(id) { return items[id]; }

  return { init, addItem, setActive, setOpen, getItem };
})();
