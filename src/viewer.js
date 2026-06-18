const ObraViewer = (() => {
  let scene, camera, renderer, controls;
  let canvas, container;
  const modelGroup = new THREE.Group();
  let demoItems = [];
  let tooltipEl = null;
  let clipAxis = null;
  let clipPosition = 0;
  let clipPlane = null;
  let flatMeshCache = [];
  let boxCache = new Map();

  function init(containerEl) {
    container = containerEl;
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 10000);
    camera.position.set(10, 8, 10);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;

    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);

    addLights();
    addGrid();
    addDemoCube();
    scene.add(modelGroup);

    setupTooltip();
    setupShortcuts();
    animate();
    window.addEventListener('resize', onResize);
  }

  function addLights() {
    const ambient = new THREE.AmbientLight(0x8888aa, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 30, 10);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.6);
    fillLight.position.set(-15, 5, -15);
    scene.add(fillLight);

    const bottomLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    bottomLight.position.set(0, -10, 0);
    scene.add(bottomLight);
  }

  function addGrid() {
    const gridHelper = new THREE.GridHelper(20, 40, 0x444466, 0x333355);
    scene.add(gridHelper);
  }

  function addDemoCube() {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a9eff, roughness: 0.3, metalness: 0.1,
    });
    const cube = new THREE.Mesh(geo, mat);
    cube.castShadow = true;
    cube.position.y = 0.75;
    scene.add(cube);
    demoItems.push(cube);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
    line.position.copy(cube.position);
    scene.add(line);
    demoItems.push(line);
  }

  function removeDemoCube() {
    for (const item of demoItems) {
      scene.remove(item);
      if (item.geometry) item.geometry.dispose();
      if (item.material) item.material.dispose();
    }
    demoItems = [];
  }

  function buildCache() {
    flatMeshCache = [];
    boxCache.clear();
    modelGroup.children.forEach(child => {
      child.traverse(node => { if (node.isMesh) flatMeshCache.push(node); });
    });
  }

  function getBox(eid) {
    if (boxCache.has(eid)) return boxCache.get(eid);
    const child = modelGroup.children.find(c => c.userData.expressID === eid);
    if (!child) return null;
    const box = new THREE.Box3().setFromObject(child);
    boxCache.set(eid, box);
    return box;
  }

  function clearCache() {
    flatMeshCache = [];
    boxCache.clear();
  }

  function addModel(threeGroup) {
    while (threeGroup.children.length > 0) {
      modelGroup.add(threeGroup.children[0]);
    }
    controls.target.set(0, 0, 0);
    buildCache();
  }

  function clearModel() {
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0];
      disposeNode(child);
      modelGroup.remove(child);
    }
    clearCache();
  }

  function disposeNode(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
    if (obj.children) {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        disposeNode(obj.children[i]);
      }
    }
  }

  function fitToModel() {
    if (modelGroup.children.length === 0) return;
    let box;
    try { box = new THREE.Box3().setFromObject(modelGroup); } catch (e) { return; }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return;

    controls.target.copy(center);

    const dist = maxDim * 1.8;
    const camPos = new THREE.Vector3(dist * 0.6, dist * 0.4, dist * 0.6).add(center);
    camera.position.copy(camPos);

    camera.near = maxDim * 0.001;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function highlightElement(expressID, color) {
    clearHighlight();
    modelGroup.children.forEach(child => {
      if (child.userData.expressID === expressID) {
        child.traverse(node => {
          if (node.isMesh) {
            node.userData._origColor = node.material.color.getHex();
            node.material = node.material.clone();
            node.material.color.setHex(color || 0xffaa00);
            node.material.emissive.setHex(color || 0xffaa00);
            node.material.emissiveIntensity = 0.15;
            node.userData._highlighted = true;
          }
        });
      }
    });
  }

  function clearHighlight() {
    for (const node of flatMeshCache) {
      if (node.userData._highlighted) {
        node.material.dispose();
        const baseColor = node.userData._scheduleColor || node.userData._origColor || 0x999999;
        node.material = new THREE.MeshStandardMaterial({
          color: baseColor, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
        });
        delete node.userData._highlighted;
        delete node.userData._origColor;
      }
      if (node.userData._hovered) {
        if (!node.userData._origColor) { delete node.userData._hovered; continue; }
        node.material.color.setHex(node.userData._origColor);
        node.material.emissive.setHex(0x000000);
        node.material.emissiveIntensity = 0;
        delete node.userData._hovered;
        delete node.userData._origColor;
      }
    }
  }

  let hoverTimer = null;

  function hoverElement(expressID) {
    clearHover();
    if (!expressID) return;
    for (const mesh of flatMeshCache) {
      const eid = mesh.parent ? mesh.parent.userData.expressID : null;
      if (eid === expressID && !mesh.userData._highlighted) {
        mesh.userData._origColor = mesh.material.color.getHex();
        mesh.material.color.setHex(0x66bbff);
        mesh.material.emissive.setHex(0x66bbff);
        mesh.material.emissiveIntensity = 0.1;
        mesh.userData._hovered = true;
      }
    }
  }

  function clearHover() {
    for (const node of flatMeshCache) {
      if (node.userData._hovered) {
        node.material.color.setHex(node.userData._origColor || 0x999999);
        node.material.emissive.setHex(0x000000);
        node.material.emissiveIntensity = 0;
        delete node.userData._hovered;
        delete node.userData._origColor;
      }
    }
  }

  function setModelColor(expressID, colorHex) {
    for (const mesh of flatMeshCache) {
      const eid = mesh.parent ? mesh.parent.userData.expressID : null;
      if (eid === expressID) {
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(colorHex);
      }
    }
  }

  function resetModelColors() {
    for (const mesh of flatMeshCache) {
      mesh.material = mesh.material.clone();
      mesh.material.color.setHex(0x999999);
      mesh.material.roughness = 0.5;
      mesh.material.metalness = 0.0;
      delete mesh.userData._scheduleColor;
    }
  }

  function applyScheduleColors(colorMap) {
    clearHighlight();
    for (const mesh of flatMeshCache) {
      const eid = mesh.parent ? mesh.parent.userData.expressID : null;
      if (eid == null) continue;
      const color = colorMap.get(eid);
      if (color !== undefined) {
        mesh.userData._scheduleColor = color;
      } else {
        delete mesh.userData._scheduleColor;
      }
      if (!mesh.userData._highlighted && !mesh.userData._hovered) {
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(color || 0x999999);
      } else if (mesh.userData._hovered) {
        mesh.userData._origColor = color || 0x999999;
      }
    }
  }

  let simAnimId = null;
  let simPlaying = false;
  let simCurrentDate = null;
  let simStartDate = null;
  let simEndDate = null;
  let simSpeed = 1;
  let simHiddenEids = new Set();
  let simActiveMap = null;

  function initSimulation(rubros) {
    if (!rubros || rubros.length === 0) return;
    const dates = rubros.map(r => new Date(r.startDate)).filter(d => !isNaN(d));
    const endDates = rubros.map(r => new Date(r.endDate)).filter(d => !isNaN(d));
    if (dates.length === 0 && endDates.length === 0) return;
    simStartDate = new Date(Math.min(...dates));
    simEndDate = new Date(Math.max(...endDates));
    if (isNaN(simStartDate) || isNaN(simEndDate)) return;
    simCurrentDate = new Date(simStartDate);
    simPlaying = false;
    simActiveMap = null;
    applySimulationTime(simCurrentDate, rubros);
  }

  function applySimulationTime(date, rubros) {
    if (!rubros) {
      try { rubros = ObraScheduleManager.getRubros(); } catch(e) { return; }
    }
    simCurrentDate = date;
    const activeMap = new Map();
    const allEids = new Set();
    for (const rubro of rubros) {
      const eids = ObraScheduleManager.getRubroEids(rubro);
      for (const eid of eids) allEids.add(eid);
      const start = new Date(rubro.startDate);
      const end = new Date(rubro.endDate);
      if (isNaN(start) || isNaN(end)) continue;
      const colorHex = parseInt(rubro.color.replace('#', ''), 16);
      const pct = parseInt(rubro.avance) || 0;
      if (date >= start) {
        for (const eid of eids) {
          if (date >= end && pct >= 100) {
            // Completed: greenish tint
            activeMap.set(eid, blendColors(colorHex, 0x2ecc71, 0.4));
          } else {
            activeMap.set(eid, colorHex);
          }
        }
      }
    }
    simActiveMap = activeMap;

    modelGroup.children.forEach(child => {
      const eid = child.userData.expressID;
      const visible = eid && (activeMap.has(eid) || !allEids.has(eid));
      child.visible = visible;
      if (visible && eid && activeMap.has(eid)) {
        const color = activeMap.get(eid);
        child.traverse(node => {
          if (node.isMesh) {
            node.userData._scheduleColor = color;
            if (!node.userData._highlighted && !node.userData._hovered) {
              node.material = node.material.clone();
              node.material.color.setHex(color);
            }
          }
        });
      } else if (visible && eid) {
        child.traverse(node => {
          if (node.isMesh) {
            delete node.userData._scheduleColor;
            if (!node.userData._highlighted && !node.userData._hovered) {
              node.material = node.material.clone();
              node.material.color.setHex(0x999999);
            }
          }
        });
      }
    });
  }

  function blendColors(c1, c2, t) {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  function playSimulation(rubros) {
    if (simPlaying) return;
    if (!rubros) return;
    if (!simCurrentDate || !simEndDate) return;
    simPlaying = true;
    let lastTime = performance.now();
    function tick() {
      if (!simPlaying) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const ms = dt * simSpeed * 86400000;
      const next = new Date(simCurrentDate.getTime() + ms);
      if (next >= simEndDate) {
        simPlaying = false;
        applySimulationTime(simEndDate, rubros);
        if (typeof ObraSimControls !== 'undefined') ObraSimControls.update();
        return;
      }
      applySimulationTime(next, rubros);
      if (typeof ObraSimControls !== 'undefined') ObraSimControls.update();
      simAnimId = requestAnimationFrame(tick);
    }
    simAnimId = requestAnimationFrame(tick);
  }

  function pauseSimulation() {
    simPlaying = false;
    if (simAnimId) { cancelAnimationFrame(simAnimId); simAnimId = null; }
  }

  function setSimulationSpeed(speed) { simSpeed = speed; }
  function getSimulationDate() { return simCurrentDate; }
  function getSimStartDate() { return simStartDate; }
  function getSimEndDate() { return simEndDate; }
  function isSimPlaying() { return simPlaying; }

  function clearScheduleColors() {
    clearHighlight();
    modelGroup.children.forEach(child => {
      child.traverse(node => {
        if (node.isMesh && !node.userData._highlighted) {
          delete node.userData._scheduleColor;
          if (!node.userData._hovered) {
            node.material = node.material.clone();
            node.material.color.setHex(0x999999);
          } else {
            node.userData._origColor = 0x999999;
          }
        }
      });
    });
  }

  function setView(name) {
    const center = controls.target.clone();
    const dist = camera.position.distanceTo(center) || 10;
    const views = {
      top:     [0, dist, 0],
      front:   [0, 0, dist],
      side:    [dist, 0, 0],
      default: [dist * 0.6, dist * 0.4, dist * 0.6],
    };
    const pos = views[name] || views.default;
    camera.position.set(center.x + pos[0], center.y + pos[1], center.z + pos[2]);
    controls.update();
  }

  function zoomToObject(expressID) {
    let box = null;
    modelGroup.children.forEach(child => {
      if (child.userData.expressID === expressID) {
        box = new THREE.Box3().setFromObject(child);
      }
    });
    if (!box) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    controls.target.copy(center);
    const dist = maxDim * 2.5;
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.length() < 0.01) dir.set(0.6, 0.4, 0.6);
    camera.position.copy(center).add(dir.multiplyScalar(dist));
    controls.update();
  }

  function setupTooltip() {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'viewer-tooltip';
    tooltipEl.style.cssText =
      'position:absolute;display:none;pointer-events:none;z-index:20;' +
      'background:rgba(22,22,42,0.92);color:#e0e0e0;padding:4px 10px;' +
      'border-radius:6px;font-size:12px;border:1px solid #2a2a45;' +
      'white-space:nowrap;backdrop-filter:blur(4px);';
    container.appendChild(tooltipEl);
    canvas.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      tooltipEl.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltipEl.style.top = (e.clientY - rect.top - 30) + 'px';
    });
  }

  function showTooltip(text) {
    if (!tooltipEl) return;
    tooltipEl.textContent = text;
    tooltipEl.style.display = 'block';
  }

  function hideTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'none';
  }

  function getTooltip() { return tooltipEl; }

  let walkMode = false;
  let walkKeys = {};
  let walkEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  let walkSpeed = 4;
  let eyeLevel = 1.6;
  const WALK_FRICTION = 0.85;

  function enterWalkMode() {
    walkMode = true;
    walkEuler.setFromQuaternion(camera.quaternion);
    controls.enabled = false;
    document.addEventListener('keydown', onWalkKey);
    document.addEventListener('keyup', onWalkKeyUp);
    document.addEventListener('mousemove', onWalkMouse);
    container.addEventListener('click', onWalkClick);
    canvas.style.cursor = 'crosshair';
    updateEyeLevel();
  }

  function exitWalkMode() {
    walkMode = false;
    controls.enabled = true;
    document.removeEventListener('keydown', onWalkKey);
    document.removeEventListener('keyup', onWalkKeyUp);
    document.removeEventListener('mousemove', onWalkMouse);
    container.removeEventListener('click', onWalkClick);
    if (document.pointerLockElement) document.exitPointerLock();
    canvas.style.cursor = '';
    walkKeys = {};
  }

  function toggleWalkMode() {
    if (walkMode) exitWalkMode();
    else enterWalkMode();
  }

  function onWalkKey(e) {
    walkKeys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape' && walkMode) exitWalkMode();
  }
  function onWalkKeyUp(e) { walkKeys[e.key.toLowerCase()] = false; }

  function onWalkClick() {
    if (walkMode && !document.pointerLockElement) {
      canvas.requestPointerLock();
    }
  }

  function onWalkMouse(e) {
    if (!walkMode || !document.pointerLockElement) return;
    const movementX = e.movementX || 0;
    const movementY = e.movementY || 0;
    walkEuler.y -= movementX * 0.002;
    walkEuler.x -= movementY * 0.002;
    walkEuler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, walkEuler.x));
    camera.quaternion.setFromEuler(walkEuler);
  }

  function updateWalk() {
    if (!walkMode) return;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    const speed = walkSpeed * 0.05;
    if (walkKeys['w'] || walkKeys['arrowup']) { camera.position.add(forward.clone().multiplyScalar(speed)); }
    if (walkKeys['s'] || walkKeys['arrowdown']) { camera.position.add(forward.clone().multiplyScalar(-speed)); }
    if (walkKeys['a'] || walkKeys['arrowleft']) { camera.position.add(right.clone().multiplyScalar(-speed)); }
    if (walkKeys['d'] || walkKeys['arrowright']) { camera.position.add(right.clone().multiplyScalar(speed)); }
    if (walkKeys['e']) { camera.position.y += speed; }
    if (walkKeys['q']) { camera.position.y -= speed; }
  }

  function setWalkSpeed(s) { walkSpeed = Math.max(0.5, Math.min(20, s)); }

  function setEyeLevel(h) {
    eyeLevel = Math.max(0.1, Math.min(10, h));
    if (walkMode) updateEyeLevel();
  }
  function getEyeLevel() { return eyeLevel; }
  function updateEyeLevel() {
    if (!walkMode) return;
    camera.position.y = eyeLevel;
  }

  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 'r': setView('default'); break;
        case 'f': fitToModel(); break;
        case '1': setView('top'); break;
        case '2': setView('front'); break;
        case '3': setView('side'); break;
        case '?':
        case '/':
          showShortcuts();
          break;
      case 'escape':
        if (walkMode) { exitWalkMode(); return; }
        const modal = document.getElementById('shortcuts-modal');
        if (modal && modal.style.display !== 'none') {
          modal.style.display = 'none';
          return;
        }
        ObraViewer.clearHighlight();
        ObraPropertiesPanel && ObraPropertiesPanel.hide();
        break;
      }
    });
  }

  function showShortcuts() {
    let el = document.getElementById('shortcuts-modal');
    if (!el) {
      const _t = (k) => (typeof ObraI18n !== 'undefined' ? ObraI18n.__(k) : k);
      el = document.createElement('div');
      el.id = 'shortcuts-modal';
      el.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)';
      el.innerHTML = `
        <div style="background:rgba(22,22,42,0.97);border:1px solid #2a2a45;border-radius:12px;padding:24px;max-width:440px;width:90%;max-height:80vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h2 style="font-size:16px;font-weight:600;color:#e3e0f1">${_t('shortcutsTitle')}</h2>
            <button onclick="document.getElementById('shortcuts-modal').style.display='none'" style="background:none;border:none;color:#888;cursor:pointer;font-size:18px">✕</button>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">R</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsPerspective')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">1</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsTop')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">2</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsFront')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">3</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsSide')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">F</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsFit')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">?</kbd> <kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">/</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsHelp')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">Esc</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsClear')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">Ctrl+Click</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsMulti')}</td></tr>
            <tr><td colspan="2" style="padding:8px 8px 4px;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:0.5px">${_t('shortcutsWalk')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">W</kbd><kbd style="background:#2a2a45;padding:2px 5px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff;margin-left:2px">A</kbd><kbd style="background:#2a2a45;padding:2px 5px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff;margin-left:2px">S</kbd><kbd style="background:#2a2a45;padding:2px 5px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff;margin-left:2px">D</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsMove')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888;border-bottom:1px solid #2a2a45"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">E</kbd> <kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">Q</kbd></td><td style="padding:6px 8px;color:#ccc;border-bottom:1px solid #2a2a45">${_t('shortcutsUpDown')}</td></tr>
            <tr><td style="padding:6px 8px;color:#888"><kbd style="background:#2a2a45;padding:2px 8px;border-radius:3px;font-family:JetBrains Mono;font-size:11px;color:#4a9eff">Mouse</kbd></td><td style="padding:6px 8px;color:#ccc">${_t('shortcutsLook')}</td></tr>
          </table>
        </div>`;
      document.body.appendChild(el);
      el.addEventListener('click', (e) => { if (e.target === el) el.style.display = 'none'; });
    }
    el.style.display = 'flex';
  }

  function animate() {
    requestAnimationFrame(animate);
    if (walkMode) updateWalk();
    else controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function setElementVisibility(expressID, visible) {
    modelGroup.children.forEach(child => {
      if (child.userData.expressID === expressID) {
        child.visible = visible;
      }
    });
  }

  function hideAllElements() {
    modelGroup.children.forEach(child => { child.visible = false; });
  }

  function showAllElements() {
    modelGroup.children.forEach(child => { child.visible = true; });
  }

  function selectByRect(cam, ndcMin, ndcMax, entries, ltr) {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const proj = cam.projectionMatrix.clone();
    const invProj = proj.clone().invert();
    const corners = [
      new THREE.Vector3(ndcMin.x, ndcMin.y, -1),
      new THREE.Vector3(ndcMax.x, ndcMin.y, -1),
      new THREE.Vector3(ndcMax.x, ndcMax.y, -1),
      new THREE.Vector3(ndcMin.x, ndcMax.y, -1),
      new THREE.Vector3(ndcMin.x, ndcMin.y, 1),
      new THREE.Vector3(ndcMax.x, ndcMin.y, 1),
      new THREE.Vector3(ndcMax.x, ndcMax.y, 1),
      new THREE.Vector3(ndcMin.x, ndcMax.y, 1),
    ];
    const worldCorners = corners.map(v => v.applyMatrix4(invProj).applyMatrix4(cam.matrixWorld));
    const selBox = new THREE.Box3().setFromPoints(worldCorners);

    const result = [];
    for (const [expressID] of entries) {
      const child = modelGroup.children.find(c => c.userData.expressID === expressID);
      if (!child || !child.visible) continue;
      const box = getBox(expressID);
      if (!box || box.isEmpty()) continue;
      const intersects = selBox.intersectsBox(box);
      if (!intersects) continue;
      if (ltr) {
        const fullyInside = selBox.containsBox(box);
        if (fullyInside) result.push(expressID);
      } else {
        result.push(expressID);
      }
    }
    return result;
  }

  function isolateElement(expressID) {
    modelGroup.children.forEach(child => {
      child.visible = child.userData.expressID === expressID;
    });
  }

  function getVisibleCount() {
    return modelGroup.children.filter(c => c.visible).length;
  }

  function getScene() { return scene; }
  function getCamera() { return camera; }
  function getRenderer() { return renderer; }
  function getControls() { return controls; }
  function getModelGroup() { return modelGroup; }
  function getModelGroupChildren() { return modelGroup.children; }
  function setClipping(axis, position) {
    clipAxis = axis;
    clipPosition = position;
    if (!axis) {
      clipPlane = null;
    } else {
      const normal = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );
      clipPlane = new THREE.Plane(normal, -position);
    }
    applyClippingToModel();
  }

  function getClipping() {
    return { axis: clipAxis, position: clipPosition };
  }

  function resetClipping() {
    clipAxis = null;
    clipPosition = 0;
    clipPlane = null;
    applyClippingToModel();
  }

  function applyClippingToModel() {
    const planes = clipPlane ? [clipPlane] : [];
    modelGroup.children.forEach(group => {
      group.traverse(node => {
        if (node.isMesh && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          for (const mat of mats) {
            mat.clippingPlanes = planes;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }

  function highlightElements(eids, color) {
    clearHighlight();
    if (!eids || eids.length === 0) return;
    const colorHex = color || 0xffaa00;
    const eidSet = new Set(eids);
    for (const mesh of flatMeshCache) {
      const eid = mesh.parent ? mesh.parent.userData.expressID : null;
      if (eid != null && eidSet.has(eid)) {
        mesh.userData._origColor = mesh.material.color.getHex();
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(colorHex);
        mesh.material.emissive.setHex(colorHex);
        mesh.material.emissiveIntensity = 0.15;
        mesh.userData._highlighted = true;
      }
    }
  }

  function previewElements(eids, color) {
    clearHighlight();
    if (!eids || eids.length === 0) return;
    const colorHex = color || 0x66bbff;
    const eidSet = new Set(eids);
    for (const mesh of flatMeshCache) {
      const eid = mesh.parent ? mesh.parent.userData.expressID : null;
      if (eid != null && eidSet.has(eid)) {
        mesh.material = mesh.material.clone();
        mesh.material.color.setHex(colorHex);
        mesh.material.emissive.setHex(colorHex);
        mesh.material.emissiveIntensity = 0.15;
        mesh.userData._highlighted = true;
      }
    }
  }

  function getCanvas() { return canvas; }
  function getContainer() { return container; }

  function dispose() {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    if (container.contains(canvas)) container.removeChild(canvas);
    scene = null;
  }

  return {
    init, dispose,
    addModel, clearModel, fitToModel, setView, zoomToObject,
    removeDemoCube,
    highlightElement, clearHighlight, hoverElement, clearHover,
    setModelColor, resetModelColors,
    applyScheduleColors, clearScheduleColors, highlightElements, previewElements,
    showTooltip, hideTooltip, getTooltip,
    setElementVisibility, hideAllElements, showAllElements,
    isolateElement, getVisibleCount, selectByRect,
    setClipping, getClipping, resetClipping,
    getScene, getCamera, getRenderer, getControls, getModelGroup, getModelGroupChildren,
    getFlatMeshCache: () => flatMeshCache,
    getBox,
    getCanvas, getContainer, showShortcuts,
    enterWalkMode, exitWalkMode, toggleWalkMode, isWalkMode: () => walkMode,
    setEyeLevel, getEyeLevel, setWalkSpeed,
    initSimulation, applySimulationTime, playSimulation, pauseSimulation,
    setSimulationSpeed, getSimulationDate, getSimStartDate, getSimEndDate, isSimPlaying,
    blendColors,
  };
})();
