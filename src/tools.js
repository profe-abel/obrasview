const ObraTools = (() => {
  let active = false;
  let points = [];
  let measurements = [];
  let measureGroup = null;

  function init() {
    measureGroup = new THREE.Group();
    measureGroup.name = 'measure-group';
    ObraViewer.getScene().add(measureGroup);
  }

  function toggleMeasure() {
    if (!measureGroup) init();
    active = !active;
    if (!active) {
      points = [];
      ObraViewer.getCanvas().style.cursor = '';
    } else {
      ObraViewer.getCanvas().style.cursor = 'crosshair';
    }
    return active;
  }

  function isActive() { return active; }

  const SNAP_THRESHOLD = 0.15;

  function snapToVertex(hit) {
    const mesh = hit.object;
    const posAttr = mesh.geometry.attributes.position;
    if (!posAttr) return hit.point.clone();
    const localPt = hit.point.clone();
    if (mesh.matrixWorld) localPt.applyMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());
    let bestDist = Infinity;
    let bestVertex = null;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i), vy = posAttr.getY(i), vz = posAttr.getZ(i);
      const dx = localPt.x - vx, dy = localPt.y - vy, dz = localPt.z - vz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestDist) { bestDist = d; bestVertex = new THREE.Vector3(vx, vy, vz); }
    }
    if (bestDist < SNAP_THRESHOLD * SNAP_THRESHOLD && bestVertex) {
      if (mesh.matrixWorld) bestVertex.applyMatrix4(mesh.matrixWorld);
      return bestVertex;
    }
    return hit.point.clone();
  }

  function handleClick(event) {
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
    if (meshes.length === 0) return;
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length === 0) return;
    const pt = snapToVertex(hits[0]);
    points.push(pt);
    if (points.length === 2) {
      addMeasurement(points[0], points[1]);
      points = [];
    } else {
      drawTempPoint(pt);
    }
  }

  function drawTempPoint(pt) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff });
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
  }

  function getCount() { return measurements.length; }

  return {
    init, toggleMeasure, isActive, handleClick, clearAll, getCount,
    getTypeNames, detectCollisions, clearCollisions, getCollisions, exportCollisionsJSON,
    initMarkers, toggleMarkerMode, isMarkerMode, addMarkerAtClick, addMarkerAtPosition,
    setMarkerIssue, removeMarker, clearMarkers, getMarkers, getLastMarker, updateMarkerColor,
  };
})();
