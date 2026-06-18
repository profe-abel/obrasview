const ObraViewer = (() => {
  let scene, camera, renderer, controls;
  let canvas, container;
  const modelGroup = new THREE.Group();
  let demoItems = [];
  let tooltipEl = null;
  let clipAxis = null;
  let clipPosition = 0;
  let clipPlane = null;

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

  function addModel(threeGroup) {
    modelGroup.add(threeGroup);
    controls.target.set(0, 0, 0);
  }

  function clearModel() {
    while (modelGroup.children.length > 0) {
      const child = modelGroup.children[0];
      disposeNode(child);
      modelGroup.remove(child);
    }
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
    const box = new THREE.Box3().setFromObject(modelGroup);
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
    modelGroup.children.forEach(child => {
      child.traverse(node => {
        if (node.isMesh && node.userData._highlighted) {
          node.material.dispose();
          node.material = new THREE.MeshStandardMaterial({
            color: 0x999999, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
          });
          delete node.userData._highlighted;
        }
      });
    });
  }

  function setModelColor(expressID, colorHex) {
    modelGroup.children.forEach(child => {
      if (child.userData.expressID === expressID) {
        child.traverse(node => {
          if (node.isMesh) {
            node.material = node.material.clone();
            node.material.color.setHex(colorHex);
          }
        });
      }
    });
  }

  function resetModelColors() {
    modelGroup.children.forEach(child => {
      child.traverse(node => {
        if (node.isMesh) {
          node.material = node.material.clone();
          node.material.color.setHex(0x999999);
          node.material.roughness = 0.5;
          node.material.metalness = 0.0;
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

  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key.toLowerCase()) {
        case 'r': setView('default'); break;
        case 'f': fitToModel(); break;
        case '1': setView('top'); break;
        case '2': setView('front'); break;
        case '3': setView('side'); break;
        case 'escape':
          ObraViewer.clearHighlight();
          ObraPropertiesPanel && ObraPropertiesPanel.hide();
          break;
      }
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
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
    highlightElement, clearHighlight,
    setModelColor, resetModelColors,
    showTooltip, hideTooltip, getTooltip,
    setElementVisibility, hideAllElements, showAllElements,
    isolateElement, getVisibleCount,
    setClipping, getClipping, resetClipping,
    getScene, getCamera, getRenderer, getControls, getModelGroup, getModelGroupChildren,
    getCanvas, getContainer,
  };
})();
