const ObraTools = (() => {
  let active = false;
  let points = [];
  let measurements = [];
  let measureGroup = null;
  let snapGroup = null;
  let measureMoveHandler = null;
  let lastSnapPoint = null;

  function init() {
    measureGroup = new THREE.Group();
    measureGroup.name = 'measure-group';
    ObraViewer.getScene().add(measureGroup);
    snapGroup = new THREE.Group();
    snapGroup.name = 'snap-group';
    ObraViewer.getScene().add(snapGroup);
  }

  function toggleMeasure() {
    if (!measureGroup) init();
    active = !active;
    if (!active) {
      points = [];
      clearSnapPreview();
      ObraViewer.getCanvas().style.cursor = '';
      if (measureMoveHandler) { ObraViewer.getContainer().removeEventListener('mousemove', measureMoveHandler); measureMoveHandler = null; }
    } else {
      ObraViewer.getCanvas().style.cursor = 'crosshair';
      measureMoveHandler = (e) => onMeasureMove(e);
      ObraViewer.getContainer().addEventListener('mousemove', measureMoveHandler);
    }
    return active;
  }

  function isActive() { return active; }

  const SNAP_THRESHOLD = 0.15;

  function computeSnapPoints(mesh) {
    const posAttr = mesh.geometry.attributes.position;
    const idxAttr = mesh.geometry.index;
    if (!posAttr) return [];
    const pts = [];
    const matrix = mesh.matrixWorld;
    // Vertices
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      if (matrix) v.applyMatrix4(matrix);
      pts.push({ point: v, type: 'vertex' });
    }
    // Edge midpoints (from index buffer)
    if (idxAttr) {
      for (let i = 0; i < idxAttr.count; i += 3) {
        const ia = idxAttr.getX(i), ib = idxAttr.getX(i + 1), ic = idxAttr.getX(i + 2);
        const a = new THREE.Vector3(posAttr.getX(ia), posAttr.getY(ia), posAttr.getZ(ia));
        const b = new THREE.Vector3(posAttr.getX(ib), posAttr.getY(ib), posAttr.getZ(ib));
        const c = new THREE.Vector3(posAttr.getX(ic), posAttr.getY(ic), posAttr.getZ(ic));
        // Midpoints of triangle edges AB, BC, CA
        const midAB = a.clone().add(b).multiplyScalar(0.5);
        const midBC = b.clone().add(c).multiplyScalar(0.5);
        const midCA = c.clone().add(a).multiplyScalar(0.5);
        if (matrix) { midAB.applyMatrix4(matrix); midBC.applyMatrix4(matrix); midCA.applyMatrix4(matrix); }
        pts.push({ point: midAB, type: 'midpoint' });
        pts.push({ point: midBC, type: 'midpoint' });
        pts.push({ point: midCA, type: 'midpoint' });
      }
    }
    return pts;
  }

  function findBestSnap(hit) {
    const mesh = hit.object;
    const snapPts = computeSnapPoints(mesh);
    const hitPt = hit.point;
    let best = { point: hitPt.clone(), dist: Infinity, type: 'free' };
    for (const sp of snapPts) {
      const d = hitPt.distanceTo(sp.point);
      if (d < best.dist) best = { point: sp.point, dist: d, type: sp.type };
    }
    if (best.dist < SNAP_THRESHOLD) return best;
    return { point: hitPt.clone(), dist: 0, type: 'free' };
  }

  function showSnapPreview(pt, type) {
    clearSnapPreview();
    const color = type === 'vertex' ? 0xffaa00 : (type === 'midpoint' ? 0x00ffaa : 0x4a9eff);
    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const mat = new THREE.MeshBasicMaterial({ color });
    const box = new THREE.Mesh(geo, mat);
    box.position.copy(pt);
    box.name = 'snap-marker';
    snapGroup.add(box);
    // Crosshair lines
    const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const s = 0.04;
    const addLine = (a, b) => {
      const g = new THREE.BufferGeometry().setFromPoints([a.clone().add(pt), b.clone().add(pt)]);
      snapGroup.add(new THREE.Line(g, lineMat));
    };
    addLine(new THREE.Vector3(-s, 0, 0), new THREE.Vector3(s, 0, 0));
    addLine(new THREE.Vector3(0, -s, 0), new THREE.Vector3(0, s, 0));
    addLine(new THREE.Vector3(0, 0, -s), new THREE.Vector3(0, 0, s));
    lastSnapPoint = pt;
  }

  function clearSnapPreview() {
    if (!snapGroup) return;
    while (snapGroup.children.length > 0) {
      const c = snapGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      snapGroup.remove(c);
    }
    lastSnapPoint = null;
  }

  function onMeasureMove(event) {
    if (!active) return;
    const container = ObraViewer.getContainer();
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ObraViewer.getCamera());
    const modelGroup = ObraViewer.getModelGroup();
    const meshes = [];
    modelGroup.children.forEach(child => {
      child.traverse(node => { if (node.isMesh) meshes.push(node); });
    });
    if (meshes.length === 0) { clearSnapPreview(); return; }
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length === 0) { clearSnapPreview(); return; }
    const snap = findBestSnap(hits[0]);
    showSnapPreview(snap.point, snap.type);
  }

  function handleClick(event) {
    if (!active) return;
    const pt = lastSnapPoint || getMousePoint(event);
    if (!pt) return;
    points.push(pt);
    if (points.length === 2) {
      addMeasurement(points[0], points[1]);
      points = [];
    } else {
      drawTempPoint(pt, 0x4a9eff);
    }
  }

  function getMousePoint(event) {
    const container = ObraViewer.getContainer();
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ObraViewer.getCamera());
    const modelGroup = ObraViewer.getModelGroup();
    const meshes = [];
    modelGroup.children.forEach(child => {
      child.traverse(node => { if (node.isMesh) meshes.push(node); });
    });
    if (meshes.length === 0) return null;
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length === 0) return null;
    const snap = findBestSnap(hits[0]);
    return snap.point;
  }

  function drawTempPoint(pt, color) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color || 0x4a9eff });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(pt);
    sphere.name = 'temp-point';
    measureGroup.add(sphere);
  }

  function addMeasurement(p1, p2) {
    const dist = p1.distanceTo(p2);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);

    // Remove temp point
    const temp = measureGroup.getObjectByName('temp-point');
    if (temp) { measureGroup.remove(temp); temp.geometry.dispose(); temp.material.dispose(); }

    // Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4a9eff, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    measureGroup.add(line);

    // Endpoint dots
    const dotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const d1 = new THREE.Mesh(dotGeo, dotMat); d1.position.copy(p1); measureGroup.add(d1);
    const d2 = new THREE.Mesh(dotGeo, dotMat); d2.position.copy(p2); measureGroup.add(d2);

    // Label sprite
    const label = makeLabel(dist.toFixed(2) + ' m');
    label.position.copy(mid);
    measureGroup.add(label);

    measurements.push({ p1, p2, dist, objects: [line, d1, d2, label] });
  }

  function makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(22,22,42,0.85)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 1;
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1, 0.25, 1);
    return sprite;
  }

  // --- Collision detection ---
  let collisionGroup = null;
  let collisionResults = [];

  function initCollision() {
    if (!collisionGroup) {
      collisionGroup = new THREE.Group();
      collisionGroup.name = 'collision-group';
      ObraViewer.getScene().add(collisionGroup);
    }
  }

  function getTypeNames(entries) {
    const names = new Set();
    for (const [, entry] of entries) {
      if (entry.mesh) names.add(entry.typeName);
    }
    return [...names].sort();
  }

  function detectCollisions(entries, typeA, typeB) {
    initCollision();
    clearCollisions();
    const group = ObraViewer.getModelGroup();
    const elemsA = [], elemsB = [];
    group.children.forEach(child => {
      const eid = child.userData.expressID;
      const entry = entries.get(eid);
      if (!entry) return;
      const box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) return;
      if (entry.typeName === typeA) elemsA.push({ eid, box, entry });
      if (entry.typeName === typeB) elemsB.push({ eid, box, entry });
    });

    collisionResults = [];
    for (const a of elemsA) {
      for (const b of elemsB) {
        if (a.eid === b.eid) continue;
        if (a.box.intersectsBox(b.box)) {
          collisionResults.push({ a: a.entry, b: b.entry });
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    collisionResults = collisionResults.filter(r => {
      const key = [r.a.expressID, r.b.expressID].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Highlight collision pairs
    for (const r of collisionResults) {
      highlightCollisionBox(r.a.expressID);
      highlightCollisionBox(r.b.expressID);
    }

    return collisionResults;
  }

  function highlightCollisionBox(expressID) {
    const group = ObraViewer.getModelGroup();
    group.children.forEach(child => {
      if (child.userData.expressID !== expressID) return;
      const box = new THREE.Box3().setFromObject(child);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, mat);
      wireframe.position.copy(center);
      collisionGroup.add(wireframe);
    });
  }

  function clearCollisions() {
    if (!collisionGroup) return;
    while (collisionGroup.children.length > 0) {
      const c = collisionGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      collisionGroup.remove(c);
    }
    collisionResults = [];
  }

  function getCollisions() { return collisionResults; }

  function exportCollisionsJSON() {
    const data = collisionResults.map((r, i) => ({
      index: i + 1,
      elementoA: { id: r.a.expressID, tipo: r.a.typeName, nombre: r.a.name },
      elementoB: { id: r.b.expressID, tipo: r.b.typeName, nombre: r.b.name },
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colisiones.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Markers / Annotations ---
  let markerGroup = null;
  let markerMode = false;
  let markers = [];

  function initMarkers() {
    if (!markerGroup) {
      markerGroup = new THREE.Group();
      markerGroup.name = 'marker-group';
      ObraViewer.getScene().add(markerGroup);
    }
  }

  function toggleMarkerMode() {
    markerMode = !markerMode;
    ObraViewer.getCanvas().style.cursor = markerMode ? 'copy' : '';
    if (markerMode) initMarkers();
    return markerMode;
  }

  function isMarkerMode() { return markerMode; }

  function createPinAt(pt) {
    const group = new THREE.Group();
    group.position.copy(pt);
    const coneGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.125;
    group.add(cone);
    const sphereGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.y = 0.28;
    group.add(sphere);
    markerGroup.add(group);
    const marker = { position: pt, group, issueId: null };
    markers.push(marker);
    return marker;
  }

  function addMarkerAtClick(event) {
    if (!markerMode) return null;
    const container = ObraViewer.getContainer();
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, ObraViewer.getCamera());
    const modelGroup = ObraViewer.getModelGroup();
    const meshes = [];
    modelGroup.children.forEach(child => {
      child.traverse(node => { if (node.isMesh) meshes.push(node); });
    });

    let pt;
    if (meshes.length > 0) {
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) pt = hits[0].point.clone();
    }
    if (!pt) {
      const dist = ObraViewer.getCamera().position.distanceTo(ObraViewer.getControls().target);
      const dir = raycaster.ray.direction.clone().normalize();
      pt = raycaster.ray.origin.clone().add(dir.multiplyScalar(dist));
    }

    return createPinAt(pt);
  }

  function addMarkerAtPosition(position) {
    initMarkers();
    return createPinAt(position);
  }

  function setMarkerIssue(markerIndex, issueId) {
    if (markers[markerIndex]) markers[markerIndex].issueId = issueId;
  }

  function removeMarker(index) {
    if (markers[index]) {
      markerGroup.remove(markers[index].group);
      markers[index].group.children.forEach(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      markers.splice(index, 1);
    }
  }

  function clearMarkers() {
    if (!markerGroup) return;
    while (markerGroup.children.length > 0) {
      const child = markerGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      markerGroup.remove(child);
    }
    markers = [];
  }

  function getMarkers() { return markers; }
  function getLastMarker() { return markers.length > 0 ? markers[markers.length - 1] : null; }

  function updateMarkerColor(issueId, color) {
    for (const m of markers) {
      if (m.issueId === issueId && m.group.children[0]) {
        m.group.children[0].material = new THREE.MeshBasicMaterial({ color });
      }
    }
  }

  function clearAll() {
    if (!measureGroup) return;
    while (measureGroup.children.length > 0) {
      const child = measureGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      measureGroup.remove(child);
    }
    measurements = [];
    points = [];
    clearSnapPreview();
  }

  function getCount() { return measurements.length; }

  return {
    init, toggleMeasure, isActive, handleClick, clearAll, getCount,
    getTypeNames, detectCollisions, clearCollisions, getCollisions, exportCollisionsJSON,
    initMarkers, toggleMarkerMode, isMarkerMode, addMarkerAtClick, addMarkerAtPosition,
    setMarkerIssue, removeMarker, clearMarkers, getMarkers, getLastMarker, updateMarkerColor,
  };
})();
