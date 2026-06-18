const ObraProject = (() => {
  const VERSION = 1;

  function getState() {
    const camera = ObraViewer.getCamera();
    const controls = ObraViewer.getControls();
    const clipping = ObraViewer.getClipping();

    const state = {
      version: VERSION,
      timestamp: new Date().toISOString(),
      model: {
        fileName: ObraApp.getCurrentModel() ? ObraApp.getCurrentModel().modelName || ObraApp.getCurrentModel().name : null,
      },
      camera: camera ? {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: controls ? { x: controls.target.x, y: controls.target.y, z: controls.target.z } : null,
      } : null,
      clipping: clipping || null,
      issues: ObraStorage.getIssues(),
      schedule: null,
      measurements: ObraTools.exportMeasurements(),
    };

    try {
      const raw = localStorage.getItem('obraview_schedule_rubros');
      if (raw) state.schedule = JSON.parse(raw);
    } catch (e) {}

    return state;
  }

  function saveAs() {
    const state = getState();
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proyecto.obraview';
    a.click();
    URL.revokeObjectURL(url);
  }

  function load(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const state = JSON.parse(e.target.result);
          if (!state.version) throw new Error('Formato .obraview inválido');

          // Restore issues
          if (state.issues) {
            const key = 'obraview_issues';
            localStorage.setItem(key, JSON.stringify(state.issues));
          }

          // Restore schedule
          if (state.schedule) {
            localStorage.setItem('obraview_schedule_rubros', JSON.stringify(state.schedule));
          }

          // Restore measurements
          if (state.measurements && state.measurements.length > 0) {
            ObraTools.importMeasurements(state.measurements);
          }

          // Restore camera
          const camera = ObraViewer.getCamera();
          const controls = ObraViewer.getControls();
          if (state.camera && camera && controls) {
            camera.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
            if (state.camera.target) controls.target.set(state.camera.target.x, state.camera.target.y, state.camera.target.z);
            controls.update();
          }

          // Restore clipping
          if (state.clipping) {
            ObraViewer.setClipping(state.clipping.axis || 'z', state.clipping.position || 0);
          }

          resolve(state);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsText(file);
    });
  }

  return { saveAs, load, getState };
})();
