const ObraWindowManager = (() => {
  let zCounter = 70;
  const windows = {};
  const container = document.getElementById('viewer-container');
  let dragState = null;

  function createWindow(opts) {
    const id = opts.id;
    if (windows[id]) { focus(id); return windows[id]; }

    const el = document.createElement('div');
    el.className = 'obra-window';
    el.dataset.windowId = id;
    el.style.cssText = `
      position: absolute;
      left: ${opts.x || 120}px;
      top: ${opts.y || 80}px;
      width: ${opts.width || 320}px;
      height: ${opts.height || 400}px;
      z-index: ${++zCounter};
      display: flex;
      flex-direction: column;
      background: rgba(22,22,42,0.9);
      backdrop-filter: blur(12px);
      border: 1px solid ${opts.accent || '#2a2a45'}44;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      min-width: 200px;
      min-height: 120px;
      overflow: hidden;
    `;
    if (opts.accent) el.style.borderColor = opts.accent;

    const handleBar = document.createElement('div');
    handleBar.className = 'ow-handle';

    const header = document.createElement('div');
    header.className = 'ow-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-bottom: 1px solid #2a2a45;
      cursor: grab;
      user-select: none;
      flex-shrink: 0;
    `;

    const dot = document.createElement('span');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${opts.accent || '#4a9eff'};flex-shrink:0`;
    header.appendChild(dot);

    const title = document.createElement('span');
    title.className = 'ow-title';
    title.style.cssText = 'font-size:13px;font-weight:600;color:#e3e0f1;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    title.textContent = opts.title || id;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:2px;flex-shrink:0';

    if (opts.minimizable !== false) {
      const minBtn = document.createElement('button');
      minBtn.innerHTML = 'remove';
      minBtn.className = 'ow-icon material-symbols-outlined';
      minBtn.style.cssText = 'font-size:14px;border:none;background:transparent;color:#888;cursor:pointer;padding:2px;border-radius:3px;line-height:1';
      minBtn.title = 'Minimizar';
      minBtn.addEventListener('click', (e) => { e.stopPropagation(); hide(id); });
      actions.appendChild(minBtn);
    }

    if (opts.closable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = 'close';
      closeBtn.className = 'ow-icon material-symbols-outlined';
      closeBtn.style.cssText = 'font-size:14px;border:none;background:transparent;color:#888;cursor:pointer;padding:2px;border-radius:3px;line-height:1';
      closeBtn.title = 'Cerrar';
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(id); });
      actions.appendChild(closeBtn);
    }

    header.appendChild(actions);

    const body = document.createElement('div');
    body.className = 'ow-body';
    body.style.cssText = 'flex:1;overflow:auto;position:relative';
    if (opts.body) {
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else body.appendChild(opts.body);
    }

    el.appendChild(handleBar);
    el.appendChild(header);
    el.appendChild(body);
    container.appendChild(el);

    const winData = { el, header, body, opts, visible: true, minimized: false, x: opts.x || 120, y: opts.y || 80 };
    windows[id] = winData;

    makeDraggable(el, header, winData);
    makeResizable(el, winData);

    el.addEventListener('mousedown', () => focus(id));

    // Mobile touch: swipe handleBar to close
    let touchStartY = 0;
    handleBar.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    handleBar.addEventListener('touchend', (e) => {
      if (touchStartY > 0 && (e.changedTouches[0].clientY - touchStartY) > 80) {
        hide(id);
      }
      touchStartY = 0;
    }, { passive: true });

    if (opts.onCreate) opts.onCreate(winData);

    return winData;
  }

  function makeDraggable(el, header, winData) {
    let offsetX, offsetY;
    header.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.ow-icon')) return;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      dragState = { el, winData, offsetX, offsetY };
      header.style.cursor = 'grabbing';
      el.style.transition = 'none';
      e.preventDefault();
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    const { el: dEl, winData: dWin, offsetX, offsetY } = dragState;
    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;
    const rect = container.getBoundingClientRect();
    const snapDist = 20;
    if (x < snapDist) x = 0;
    if (y < snapDist) y = 0;
    if (x + dEl.offsetWidth > rect.width - snapDist) x = rect.width - dEl.offsetWidth;
    if (y + dEl.offsetHeight > rect.height - snapDist) y = rect.height - dEl.offsetHeight;
    dEl.style.left = x + 'px';
    dEl.style.top = y + 'px';
    dWin.x = x;
    dWin.y = y;
  });

  document.addEventListener('mouseup', () => {
    if (dragState) {
      dragState.el.style.transition = '';
      dragState.header.style.cursor = 'grab';
      dragState = null;
    }
  });

  function makeResizable(el, winData) {
    const handles = ['nw','ne','sw','se','n','s','e','w'];
    handles.forEach(dir => {
      const h = document.createElement('div');
      h.className = 'ow-resize ow-resize-' + dir;
      h.style.cssText = `position:absolute;z-index:2;${getResizeStyle(dir)}`;
      h.dataset.dir = dir;
      el.appendChild(h);
      h.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const startW = el.offsetWidth, startH = el.offsetHeight;
        const startL = el.offsetLeft, startT = el.offsetTop;
        const minW = 200, minH = 120;

        function onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let newW = startW, newH = startH, newL = startL, newT = startT;
          const r = container.getBoundingClientRect();

          if (dir.includes('e')) { newW = Math.max(minW, startW + dx); }
          if (dir.includes('w')) { newW = Math.max(minW, startW - dx); newL = startL + startW - newW; }
          if (dir.includes('s')) { newH = Math.max(minH, startH + dy); }
          if (dir.includes('n')) { newH = Math.max(minH, startH - dy); newT = startT + startH - newH; }
          if (newL < 0) newL = 0;
          if (newT < 0) newT = 0;
          if (newL + newW > r.width) { newW = r.width - newL; }
          if (newT + newH > r.height) { newH = r.height - newT; }

          el.style.width = newW + 'px';
          el.style.height = newH + 'px';
          el.style.left = newL + 'px';
          el.style.top = newT + 'px';
          winData.x = newL;
          winData.y = newT;
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }

  function getResizeStyle(dir) {
    const styles = {
      'nw': 'top:-3px;left:-3px;width:12px;height:12px;cursor:nw-resize',
      'ne': 'top:-3px;right:-3px;width:12px;height:12px;cursor:ne-resize',
      'sw': 'bottom:-3px;left:-3px;width:12px;height:12px;cursor:sw-resize',
      'se': 'bottom:-3px;right:-3px;width:12px;height:12px;cursor:se-resize',
      'n': 'top:-3px;left:12px;right:12px;height:6px;cursor:n-resize',
      's': 'bottom:-3px;left:12px;right:12px;height:6px;cursor:s-resize',
      'e': 'right:-3px;top:12px;bottom:12px;width:6px;cursor:e-resize',
      'w': 'left:-3px;top:12px;bottom:12px;width:6px;cursor:w-resize',
    };
    return styles[dir] || '';
  }

  function focus(id) {
    const w = windows[id];
    if (!w) return;
    w.el.style.zIndex = ++zCounter;
    for (const key in windows) {
      const other = windows[key];
      if (key !== id) other.el.style.borderColor = other.opts.accent ? other.opts.accent + '44' : '#2a2a45';
    }
    if (w.opts.accent) w.el.style.borderColor = w.opts.accent;
    if (typeof ObraDock !== 'undefined' && ObraDock.setActive) {
      Object.keys(windows).forEach(k => ObraDock.setActive(k, k === id));
    }
    if (w.opts.onFocus) w.opts.onFocus(id);
  }

  function show(id) {
    const w = windows[id];
    if (!w) return;
    w.el.style.display = 'flex';
    w.visible = true;
    focus(id);
    if (w.opts.onShow) w.opts.onShow(id);
  }

  function hide(id) {
    const w = windows[id];
    if (!w) return;
    w.el.style.display = 'none';
    w.visible = false;
    if (w.opts.onHide) w.opts.onHide(id);
  }

  function toggle(id) {
    const w = windows[id];
    if (!w) return;
    if (w.el.style.display === 'none') show(id);
    else hide(id);
  }

  function close(id) {
    const w = windows[id];
    if (!w) return;
    if (w.opts.onClose && w.opts.onClose(id) === false) return;
    if (w.opts.onHide) w.opts.onHide(id);
    if (typeof ObraDock !== 'undefined' && ObraDock.setOpen) ObraDock.setOpen(id, false);
    w.el.remove();
    delete windows[id];
  }

  function get(id) { return windows[id]; }
  function getVisible() { return Object.keys(windows).filter(k => windows[k].visible); }
  function getAll() { return Object.keys(windows).map(k => windows[k]); }

  return { createWindow, show, hide, toggle, close, focus, get, getVisible, getAll };
})();
