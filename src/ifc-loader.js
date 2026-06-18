const ObraIfcLoader = (() => {
  let ifcAPI = null;
  let ready = false;

  const IFCRELAGGREGATES = 412;
  const IFCBUILDINGSTOREY = 36;

  function getVec(vec) {
    const out = [];
    for (let i = 0; i < vec.size(); i++) out.push(vec.get(i));
    return out;
  }

  async function init() {
    if (ready) return;
    const IfcAPIClass = (typeof WebIFC !== 'undefined' && WebIFC.IfcAPI) ||
                        (typeof IfcAPI !== 'undefined' && IfcAPI);
    if (!IfcAPIClass) {
      throw new Error('web-ifc no se cargó. Abre con ./start.ps1 (necesita servidor HTTP)');
    }
    ifcAPI = new IfcAPIClass();
    await ifcAPI.Init();
    ready = true;
  }

  function isReady() { return ready; }

  function cleanName(raw) {
    if (!raw) return 'Sin nombre';
    return raw.replace(/^Ifc\w+:/, '').trim() || 'Sin nombre';
  }

  function getLineIDs(modelID, typeId) {
    try {
      const vec = ifcAPI.GetLineIDsWithType(modelID, typeId);
      return getVec(vec);
    } catch (e) {
      return [];
    }
  }

  async function loadFile(file, onProgress) {
    if (!ready) await init();
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const modelID = ifcAPI.OpenModel(data);
    if (modelID === -1) throw new Error('El archivo IFC no es válido');

    const allTypes = ifcAPI.GetAllTypesOfModel(modelID);
    const elementTypeIds = allTypes
      .filter(t => ifcAPI.IsIfcElement(t.typeID))
      .map(t => t.typeID);

    if (elementTypeIds.length === 0) {
      // Fallback: include all types that might have geometry
      elementTypeIds.push(...allTypes.map(t => t.typeID));
    }

    const allItems = getModelItems(modelID, elementTypeIds, allTypes);
    const storeys = getStoreys(modelID);
    const entries = buildEntries(modelID, allItems, storeys, onProgress);
    const modelName = file.name.replace(/\.(ifc|ifczip)$/i, '');

    console.log(`ObraView: ${entries.size} elementos encontrados, ${allTypes.length} tipos en el modelo`);

    return { modelID, modelName, entries, storeys, itemCount: entries.size };
  }

  function getModelItems(modelID, typeIds, allTypes) {
    const map = new Map();

    if (typeIds.length === 0) {
      typeIds = allTypes.map(t => t.typeID);
    }

    const typeNameMap = {};
    for (const t of allTypes) typeNameMap[t.typeID] = t.typeName;

    for (const typeId of typeIds) {
      const ids = getLineIDs(modelID, typeId);
      const typeName = typeNameMap[typeId] || ifcAPI.GetNameFromTypeCode(typeId) || 'IfcElement';
      for (const id of ids) {
        map.set(id, { expressID: id, typeId, typeName });
      }
    }
    return map;
  }

  function getStoreys(modelID) {
    const storeys = [];
    const ids = getLineIDs(modelID, IFCBUILDINGSTOREY);
    for (const id of ids) {
      try {
        const line = ifcAPI.GetLine(modelID, id);
        const name = line && line.Name ? cleanName(line.Name.value) : 'Planta';
        storeys.push({ expressID: id, name });
      } catch (e) {
        storeys.push({ expressID: id, name: 'Planta' });
      }
    }
    return storeys;
  }

  function buildStoreyMap(modelID, storeys) {
    const map = new Map();
    for (const s of storeys) map.set(s.expressID, s.name);

    const relIds = getLineIDs(modelID, IFCRELAGGREGATES);
    const relStoreys = new Map();

    for (const relId of relIds) {
      try {
        const rel = ifcAPI.GetLine(modelID, relId);
        const relating = rel.RelatingStructure || rel.RelatingObject;
        if (!relating || !relating.value) continue;
        if (!map.has(relating.value)) continue;

        const objects = rel.RelatedObjects;
        if (!objects) continue;
        const ids = Array.isArray(objects) ? objects.map(r => r.value) : [objects.value];
        const sname = map.get(relating.value);
        for (const eid of ids) {
          if (!relStoreys.has(eid)) relStoreys.set(eid, sname);
        }
      } catch (e) {}
    }
    return relStoreys;
  }

  function buildEntries(modelID, allItems, storeys, onProgress) {
    const entries = new Map();
    const total = allItems.size;
    let done = 0;
    const storeyMap = buildStoreyMap(modelID, storeys);

    for (const [expressID, item] of allItems) {
      done++;
      if (onProgress && done % Math.max(1, Math.floor(total / 20)) === 0) {
        onProgress(done / total);
      }

      const storey = storeyMap.get(expressID) || '';

      let name = '';
      try {
        const line = ifcAPI.GetLine(modelID, expressID);
        name = line && line.Name ? cleanName(line.Name.value) : item.typeName;
      } catch (e) {
        name = item.typeName;
      }

      entries.set(expressID, {
        expressID, typeId: item.typeId, typeName: item.typeName,
        name, storey, mesh: null, properties: null,
      });
    }

    return entries;
  }

  function setMeshData(meshEntries) {
    for (const entry of meshEntries) {
      if (!entry.mesh) continue;
      entry.mesh.userData.expressID = entry.expressID;
      entry.mesh.userData.typeName = entry.typeName;
      entry.mesh.userData.name = entry.name;
      entry.mesh.userData.storey = entry.storey;
    }
  }

  function generateMeshes(modelID, entries, onProgress) {
    const group = new THREE.Group();
    const meshEntries = [];

    // Load ALL geometry from model at once (more reliable than per-element)
    let allMeshes;
    try {
      allMeshes = ifcAPI.LoadAllGeometry(modelID);
    } catch (e) {
      console.warn('LoadAllGeometry failed, trying per-element fallback', e);
      return perElementFallback(modelID, entries, onProgress);
    }

    const totalMeshes = allMeshes.size ? allMeshes.size() : allMeshes.length;
    console.log(`ObraView: LoadAllGeometry encontró ${totalMeshes} flat meshes`);
    let done = 0;
    const logEvery = Math.max(1, Math.floor(totalMeshes / 20));

    for (const flatMesh of allMeshes) {
      done++;
      if (onProgress && done % logEvery === 0) {
        onProgress(0.5 + (done / totalMeshes) * 0.5);
      }

      try {
        const expressID = flatMesh.expressID;
        if (!expressID) continue;
        const rawGeos = flatMesh.geometries;

        const geos = rawGeos && rawGeos.size !== undefined ? rawGeos : null;
        const geosArray = Array.isArray(rawGeos) ? rawGeos : null;
        const numGeos = geos ? geos.size() : (geosArray ? geosArray.length : 0);
        if (numGeos === 0) continue;

        let entry = entries.get(expressID);
        if (!entry) {
          let typeName = 'IfcElement';
          let typeId = 0;
          try { typeId = ifcAPI.GetLineType(modelID, expressID); typeName = ifcAPI.GetNameFromTypeCode(typeId) || typeName; } catch (e) {}
          let name = typeName;
          try { const line = ifcAPI.GetLine(modelID, expressID); if (line && line.Name) name = cleanName(line.Name.value); } catch (e) {}
          entry = { expressID, typeId, typeName, name, storey: '', mesh: null, properties: null };
          entries.set(expressID, entry);
        }

        const itemGroup = new THREE.Group();
        const transform = new THREE.Matrix4();
        let hasGeo = false;

        for (let gi = 0; gi < numGeos; gi++) {
          const geomEntry = geos ? geos.get(gi) : geosArray[gi];
          const meshData = ifcAPI.GetGeometry(modelID, geomEntry.geometryExpressID);
          if (!meshData) continue;

          let verts, indices;
          if (typeof meshData.GetVertexData === 'function') {
            verts = ifcAPI.GetVertexArray(meshData.GetVertexData(), meshData.GetVertexDataSize());
            indices = ifcAPI.GetIndexArray(meshData.GetIndexData(), meshData.GetIndexDataSize());
          } else {
            verts = meshData.vertexData;
            indices = meshData.indexData;
          }

          if (!verts || !indices) continue;

          const posCount = Math.floor(verts.length / 6);
          if (posCount < 3 || indices.length < 3) continue;

          const positions = new Float32Array(posCount * 3);
          for (let i = 0; i < posCount; i++) {
            positions[i * 3] = verts[i * 6];
            positions[i * 3 + 1] = verts[i * 6 + 1];
            positions[i * 3 + 2] = verts[i * 6 + 2];
          }

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geo.setIndex(new THREE.BufferAttribute(indices.slice(), 1));
          geo.computeVertexNormals();

          if (geomEntry.flatTransformation) {
            transform.fromArray(geomEntry.flatTransformation);
            geo.applyMatrix4(transform);
          }

          let cr = 0.7, cg = 0.7, cb = 0.7;
          const c = geomEntry.color;
          if (c) {
            cr = c.r !== undefined ? c.r : (c.x !== undefined ? Math.max(c.x, 0.15) : 0.7);
            cg = c.g !== undefined ? c.g : (c.y !== undefined ? Math.max(c.y, 0.15) : 0.7);
            cb = c.b !== undefined ? c.b : (c.z !== undefined ? Math.max(c.z, 0.15) : 0.7);
          }
          // Ensure minimum brightness so elements are always visible
          cr = Math.max(cr, 0.15);
          cg = Math.max(cg, 0.15);
          cb = Math.max(cb, 0.15);

          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(cr, cg, cb),
            roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.expressID = expressID;
          itemGroup.add(mesh);
          hasGeo = true;
        }

        if (hasGeo) {
          itemGroup.userData.expressID = expressID;
          group.add(itemGroup);
          entry.mesh = itemGroup;
          meshEntries.push(entry);
        }
      } catch (e) {
        console.warn('ObraView: error en mesh', expressID, e.message);
      }
    }

    console.log(`ObraView: ${group.children.length} mallas generadas de ${entries.size} elementos`);
    setMeshData(meshEntries);
    return group;
  }

  function perElementFallback(modelID, entries, onProgress) {
    // Fallback in case LoadAllGeometry doesn't work
    const group = new THREE.Group();
    const meshEntries = [];
    const total = entries.size;
    let done = 0;

    for (const [expressID, entry] of entries) {
      done++;
      if (onProgress && done % Math.max(1, Math.floor(total / 20)) === 0) {
        onProgress(0.5 + (done / total) * 0.5);
      }

      try {
        const flatMesh = ifcAPI.GetFlatMesh(modelID, expressID);
        if (!flatMesh) continue;
        const geos = flatMesh.geometries;
        if (!geos || geos.size() === 0) continue;

        const itemGroup = new THREE.Group();
        const transform = new THREE.Matrix4();
        let hasGeo = false;
        const numGeos = geos.size();

        for (let gi = 0; gi < numGeos; gi++) {
          const geomEntry = geos.get(gi);
          const meshData = ifcAPI.GetGeometry(modelID, geomEntry.geometryExpressID);
          if (!meshData) continue;

          let verts, indices;
          if (typeof meshData.GetVertexData === 'function') {
            verts = ifcAPI.GetVertexArray(meshData.GetVertexData(), meshData.GetVertexDataSize());
            indices = ifcAPI.GetIndexArray(meshData.GetIndexData(), meshData.GetIndexDataSize());
          } else {
            verts = meshData.vertexData;
            indices = meshData.indexData;
          }
          if (!verts || !indices) continue;
          const posCount = Math.floor(verts.length / 6);
          if (posCount < 3 || indices.length < 3) continue;

          const positions = new Float32Array(posCount * 3);
          for (let i = 0; i < posCount; i++) {
            positions[i * 3] = verts[i * 6];
            positions[i * 3 + 1] = verts[i * 6 + 1];
            positions[i * 3 + 2] = verts[i * 6 + 2];
          }

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geo.setIndex(new THREE.BufferAttribute(indices.slice(), 1));
          geo.computeVertexNormals();

          if (geomEntry.flatTransformation) {
            transform.fromArray(geomEntry.flatTransformation);
            geo.applyMatrix4(transform);
          }

          const c = geomEntry.color || { x: 0.7, y: 0.7, z: 0.7 };
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(c.x || 0.7, c.y || 0.7, c.z || 0.7),
            roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;
          mesh.userData.expressID = expressID;
          itemGroup.add(mesh);
          hasGeo = true;
        }

        if (hasGeo) {
          itemGroup.userData.expressID = expressID;
          group.add(itemGroup);
          entry.mesh = itemGroup;
          meshEntries.push(entry);
        }
      } catch (e) {}
    }

    console.log(`ObraView (fallback): ${group.children.length} mallas de ${entries.size} elementos`);
    setMeshData(meshEntries);
    return group;
  }

  function closeModel(modelID) {
    if (ifcAPI && modelID !== undefined) {
      ifcAPI.CloseModel(modelID);
    }
  }

  async function getProperties(modelID, expressID) {
    if (!ready) await init();
    try {
      const props = ifcAPI.GetLine(modelID, expressID, false, false);
      const flat = {};
      flattenObject(props, flat, '');
      return flat;
    } catch (e) {
      return { Error: 'No se pudieron leer propiedades' };
    }
  }

  function flattenObject(obj, result, prefix) {
    if (!obj || typeof obj !== 'object') { result[prefix] = String(obj); return; }
    if (obj.value !== undefined && obj.label === undefined) { result[prefix] = String(obj.value); return; }
    for (const key of Object.keys(obj)) {
      if (key === 'expressID' || key === 'type') continue;
      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === 'object' && val.value !== undefined && val.label === undefined) {
        result[newKey] = String(val.value);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        flattenObject(val, result, newKey);
      } else if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) flattenObject(val[i], result, `${newKey}[${i}]`);
      } else {
        result[newKey] = String(val);
      }
    }
  }

  function readFileAsText(f) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = () => rej(new Error('No se pudo leer el archivo'));
      r.readAsText(f);
    });
  }

  function loadOBJ(objFile, companionFiles) {
    return new Promise(async (resolve, reject) => {
      try {
        const objText = await readFileAsText(objFile);

        // Detect MTL references in OBJ
        const mtlRefs = [];
        const mtlLibRegex = /mtllib\s+(.+)/gi;
        let mtlMatch;
        while ((mtlMatch = mtlLibRegex.exec(objText)) !== null) {
          mtlRefs.push(mtlMatch[1].trim());
        }

        let materials = null;
        const files = companionFiles || [];

        // Parse MTL if references found and MTLLoader available
        if (mtlRefs.length > 0 && typeof THREE.MTLLoader !== 'undefined') {
          const mtlFiles = mtlRefs.map(ref => files.find(f =>
            f.name === ref || f.name.toLowerCase() === ref.toLowerCase()
          )).filter(Boolean);

          if (mtlFiles.length > 0) {
            const mtlTexts = await Promise.all(mtlFiles.map(f => readFileAsText(f)));
            const mtlLoader = new THREE.MTLLoader();
            materials = mtlLoader.parse(mtlTexts.join('\n'));

            // Load texture images referenced in materials
            const texFiles = files.filter(f => /\.(jpg|jpeg|png|bmp|gif|tga)$/i.test(f.name));
            for (const matName in materials.materials) {
              const mat = materials.materials[matName];
              if (mat.map && typeof mat.map === 'string') {
                const texFile = texFiles.find(f =>
                  f.name === mat.map || f.name.toLowerCase() === mat.map.toLowerCase()
                );
                if (texFile) {
                  const img = new Image();
                  const url = URL.createObjectURL(texFile);
                  img.onload = () => {
                    const tex = new THREE.Texture(img);
                    tex.needsUpdate = true;
                    mat.map = tex;
                    URL.revokeObjectURL(url);
                  };
                  img.src = url;
                }
              }
            }
          }
        }

        // Parse OBJ with or without materials
        const loader = new THREE.OBJLoader();
        if (materials) loader.setMaterials(materials);
        const obj = loader.parse(objText);

        const group = new THREE.Group();
        const entries = new Map();
        let meshCount = 0;

        obj.traverse(node => {
          if (node.isMesh) {
            const srcMat = node.material;
            // Use original material (from MTL/OBJ) instead of creating new one
            const mat = srcMat && srcMat.color
              ? srcMat
              : new THREE.MeshStandardMaterial({
                  color: 0x999999, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
                });
            // Ensure basic properties
            mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.5;
            mat.metalness = mat.metalness !== undefined ? mat.metalness : 0.0;
            mat.side = THREE.DoubleSide;

            const mesh = new THREE.Mesh(node.geometry, mat);
            mesh.position.copy(node.position);
            mesh.quaternion.copy(node.quaternion);
            mesh.scale.copy(node.scale);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
            const eid = meshCount + 1;
            mesh.userData.expressID = eid;
            const itemGroup = new THREE.Group();
            itemGroup.add(mesh);
            itemGroup.userData.expressID = eid;
            itemGroup.userData.name = node.name || `OBJ_${eid}`;
            itemGroup.userData.typeName = 'OBJMesh';
            group.add(itemGroup);
            entries.set(eid, {
              expressID: eid, typeId: 0, typeName: 'OBJMesh',
              name: node.name || `OBJ_${eid}`, storey: '',
              mesh: itemGroup, properties: null,
            });
            meshCount++;
          }
        });

        resolve({ modelID: -1, modelName: objFile.name.replace(/\.obj$/i, ''), entries, storeys: [], itemCount: meshCount });
      } catch (err) {
        reject(err);
      }
    });
  }

  return { init, isReady, loadFile, generateMeshes, getProperties, closeModel, loadOBJ };
})();
