const ObraStorage = (() => {
  const STORAGE_KEY = 'obraview_issues';

  function loadIssues() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveIssues(issues) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  }

  function addIssue(issue) {
    const issues = loadIssues();
    issue.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    issue.createdAt = new Date().toISOString();
    issue.status = issue.status || 'pendiente';
    issues.push(issue);
    saveIssues(issues);
    return issue;
  }

  function updateIssue(id, updates) {
    const issues = loadIssues();
    const idx = issues.findIndex(i => i.id === id);
    if (idx === -1) return null;
    issues[idx] = { ...issues[idx], ...updates };
    saveIssues(issues);
    return issues[idx];
  }

  function deleteIssue(id) {
    let issues = loadIssues();
    issues = issues.filter(i => i.id !== id);
    saveIssues(issues);
  }

  function getIssues() {
    return loadIssues();
  }

  function exportJSON() {
    const issues = loadIssues();
    const json = JSON.stringify(issues, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incidencias-obra.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) throw new Error('Formato inválido');
          saveIssues(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsText(file);
    });
  }

  return { addIssue, updateIssue, deleteIssue, getIssues, exportJSON, importJSON };
})();
