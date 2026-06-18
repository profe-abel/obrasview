const ObraSettings = (() => {
  const DEFAULTS = {
    bgColor: '#1a1a2e',
    walkSpeed: 4,
    eyeLevel: 1.6,
    measureUnit: 'm',
    measureDecimals: 2,
    renderingQuality: 'auto',
  };
  let settings = {};

  function init() {
    try {
      const saved = JSON.parse(localStorage.getItem('obraview_settings'));
      settings = { ...DEFAULTS, ...saved };
    } catch (e) {
      settings = { ...DEFAULTS };
    }
    applySettings();
    return settings;
  }

  function get(key) { return settings[key]; }
  function getAll() { return { ...settings }; }

  function set(key, value) {
    if (settings[key] === value) return;
    settings[key] = value;
    try { localStorage.setItem('obraview_settings', JSON.stringify(settings)); } catch (e) {}
    applySingle(key);
  }

  function applySingle(key) {
    switch (key) {
      case 'bgColor':
        try { ObraViewer.getScene().background = new THREE.Color(settings.bgColor); } catch (e) {}
        break;
      case 'walkSpeed':
        try { ObraViewer.setWalkSpeed(settings.walkSpeed); } catch (e) {}
        break;
      case 'eyeLevel':
        try { ObraViewer.setEyeLevel(settings.eyeLevel); } catch (e) {}
        break;
      case 'renderingQuality':
        try {
          const r = ObraViewer.getRenderer();
          if (r) {
            const level = settings.renderingQuality;
            if (level === 'low') { r.setPixelRatio(Math.min(window.devicePixelRatio, 1)); r.shadowMap.enabled = false; }
            else if (level === 'medium') { r.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); r.shadowMap.enabled = true; }
            else { r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); r.shadowMap.enabled = true; }
          }
        } catch (e) {}
        break;
    }
  }

  function applySettings() {
    ['bgColor', 'walkSpeed', 'eyeLevel', 'renderingQuality'].forEach(applySingle);
  }

  function buildPanelUI(container) {
    const _t = (k, p) => (typeof ObraI18n !== 'undefined' ? ObraI18n.__(k, p) : k);
    const lang = typeof ObraI18n !== 'undefined' ? ObraI18n.getLang() : 'es';
    container.innerHTML = `
      <div style="padding:12px;display:flex;flex-direction:column;gap:14px;font-size:13px;color:#ccc;overflow-y:auto;height:100%">
        <div class="st-row"><span class="st-label">${_t('settingsBgColor')}</span>
          <input type="color" id="st-bgColor" value="${settings.bgColor}" style="width:44px;height:32px;border:1px solid #444;border-radius:6px;background:transparent;cursor:pointer">
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsWalkSpeed')}</span>
          <input type="range" id="st-walkSpeed" min="0.5" max="20" step="0.5" value="${settings.walkSpeed}" style="flex:1">
          <span id="st-walkSpeed-val" style="width:32px;text-align:center">${settings.walkSpeed}</span>
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsEyeLevel')}</span>
          <input type="number" id="st-eyeLevel" min="0.2" max="10" step="0.1" value="${settings.eyeLevel}" style="width:70px;background:#1e1e38;border:1px solid #444;border-radius:6px;color:#ccc;padding:4px 8px">
          <span style="color:#888;font-size:11px">m</span>
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsUnit')}</span>
          <select id="st-measureUnit" style="background:#1e1e38;border:1px solid #444;border-radius:6px;color:#ccc;padding:4px 8px;font-size:13px">
            <option value="mm" ${settings.measureUnit==='mm'?'selected':''}>${_t('settingsUnitMm')}</option>
            <option value="m" ${settings.measureUnit==='m'?'selected':''}>${_t('settingsUnitM')}</option>
            <option value="ft" ${settings.measureUnit==='ft'?'selected':''}>${_t('settingsUnitFt')}</option>
          </select>
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsDecimals')}</span>
          <input type="number" id="st-measureDecimals" min="0" max="6" step="1" value="${settings.measureDecimals}" style="width:60px;background:#1e1e38;border:1px solid #444;border-radius:6px;color:#ccc;padding:4px 8px">
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsQuality')}</span>
          <select id="st-renderingQuality" style="background:#1e1e38;border:1px solid #444;border-radius:6px;color:#ccc;padding:4px 8px;font-size:13px">
            <option value="auto" ${settings.renderingQuality==='auto'?'selected':''}>${_t('settingsQualityAuto')}</option>
            <option value="high" ${settings.renderingQuality==='high'?'selected':''}>${_t('settingsQualityHigh')}</option>
            <option value="medium" ${settings.renderingQuality==='medium'?'selected':''}>${_t('settingsQualityMedium')}</option>
            <option value="low" ${settings.renderingQuality==='low'?'selected':''}>${_t('settingsQualityLow')}</option>
          </select>
        </div>
        <div class="st-row"><span class="st-label">${_t('settingsLang')}</span>
          <select id="st-lang" style="background:#1e1e38;border:1px solid #444;border-radius:6px;color:#ccc;padding:4px 8px;font-size:13px">
            <option value="es" ${lang === 'es' ? 'selected' : ''}>${_t('settingsLangEs')}</option>
            <option value="en" ${lang === 'en' ? 'selected' : ''}>${_t('settingsLangEn')}</option>
          </select>
        </div>
      </div>
    `;

    const bind = (id, key, transform) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => {
        const val = transform ? transform(el) : el.value;
        if (id === 'st-walkSpeed') document.getElementById('st-walkSpeed-val').textContent = val;
        set(key, val);
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    };

    bind('st-bgColor', 'bgColor', e => e.value);
    bind('st-walkSpeed', 'walkSpeed', e => parseFloat(e.value));
    bind('st-eyeLevel', 'eyeLevel', e => parseFloat(e.value) || 1.6);
    bind('st-measureUnit', 'measureUnit', e => e.value);
    bind('st-measureDecimals', 'measureDecimals', e => parseInt(e.value) || 2);
    bind('st-renderingQuality', 'renderingQuality', e => e.value);

    // Language change → reload page (simplest approach for full i18n refresh)
    const langEl = document.getElementById('st-lang');
    if (langEl) {
      langEl.addEventListener('change', () => {
        if (typeof ObraI18n !== 'undefined') {
          ObraI18n.setLang(langEl.value);
        }
        location.reload();
      });
    }
  }

  return { init, get, getAll, set, buildPanelUI, reload: () => location.reload() };
})();
