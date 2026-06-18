const ObraDock = (() => {
  let dockEl = null;
  const items = {};

  function init() {
    dockEl = document.createElement('div');
    dockEl.id = 'obra-dock';
    dockEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(22, 22, 42, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 50;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(dockEl);
  }

  function addItem(id, opts) {
    const btn = document.createElement('button');
    btn.className = 'dock-btn';
    btn.dataset.dockId = id;
    btn.title = opts.label || id;
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-width: 48px;
      height: 48px;
      padding: 4px 8px;
      background: transparent;
      border: none;
      border-radius: 12px;
      color: #e0e0e0;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent, ${opts.accent || '#4a9eff'});
      transition: all 0.3s ease;
    `;
    btn.appendChild(dot);

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = opts.icon || 'folder';
    icon.style.cssText = 'font-size: 20px;';
    btn.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'dock-label';
    label.textContent = opts.label || id;
    label.style.cssText = `
      font-size: 10px;
      color: #aaa;
      white-space: nowrap;
      transition: color 0.2s ease;
    `;
    btn.appendChild(label);

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
      icon.style.color = '#fff';
      label.style.color = '#fff';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = 'transparent';
      icon.style.color = '';
      label.style.color = '';
    });

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
    const dot = item.btn.querySelector('.dot');
    if (dot) {
      if (active) {
        dot.style.animation = 'pulse 2s infinite';
        dot.style.boxShadow = '0 0 12px var(--accent, #4a9eff)';
      } else {
        dot.style.animation = '';
        dot.style.boxShadow = '';
      }
    }
  }

  function setOpen(id, open) {
    const item = items[id];
    if (!item) return;
    item.btn.classList.toggle('open', open);
  }

  function getItem(id) { return items[id]; }

  return { init, addItem, setActive, setOpen, getItem };
})();
