# 📋 ObraView v2.0 — Estado del Proyecto y Hoja de Ruta

> **Fecha:** Junio 2026  
> **Versión actual:** v1.0 (18 fases completadas)  
> **Repositorio:** https://github.com/profe-abel/obrasview  
> **Despliegue:** https://profe-abel.github.io/obrasview/

---

## 📊 Resumen Ejecutivo

ObraView es un visor BIM 3D web que funciona sin instalación, orientado a uso en obra desde celular, tablet o laptop. Actualmente todas las 18 fases planificadas están completadas con un total de **~5,446 líneas** de JavaScript en **20 módulos**.

| Categoría | Calificación | Notas |
|-----------|:------------:|-------|
| Complejidad funcional | **A** | 18 fases, 30+ features, suite BIM completa |
| Calidad de código | **B+** | Limpio, sin debug, buena separación de módulos |
| Arquitectura | **B** | Patrón IIFE funciona, pero acoplamiento global entre módulos |
| Rendimiento | **B-** | Funciona para modelos pequeños/medianos, sin optimización para grandes |
| Accesibilidad | **F** | Sin ARIA, sin navegación por teclado, sin soporte screen reader |
| Testing | **F** | Cero tests |
| Build/Deploy | **C** | Sin herramientas de build, linting, ni CI/CD |
| Documentación | **A** | ROADMAP, SUMMARY, IMPLEMENTATION-COMPLETED, DESIGN.md completos |
| Sistema de diseño | **A** | Implementación exacta del DESIGN.md con glassmorphism y tokens |

---

## 🏗️ Arquitectura Actual

### Stack Tecnológico
```
Frontend:     HTML + CSS inline + Vanilla JavaScript (IIFE modules)
3D Engine:    Three.js r128 (CDN)
BIM Parser:   web-ifc v0.0.77 (WASM local)
Charts:       SVG inline (S-curve, donut)
Excel:        SheetJS xlsx-0.20.1 (CDN)
Fonts:        Hanken Grotesk + JetBrains Mono + Material Symbols
Deploy:       GitHub Pages (git push → auto-deploy)
```

### Módulos (20 archivos JS)

| Módulo | Líneas | Función |
|--------|-------:|---------|
| `gantt-view.js` | 1,068 | Vista Gantt, CRUD rubros, drag & drop, import/export |
| `app.js` | 930 | Controlador principal, eventos, dropdown, modales |
| `viewer.js` | 823 | Escena Three.js, cámara, controles, clipping, simulación |
| `i18n.js` | 693 | Internacionalización ES/EN (~250 claves) |
| `ifc-loader.js` | 531 | Parseo IFC/OBJ, extracción de geometría |
| `tools.js` | 508 | Medición, colisiones, marcadores 3D |
| `schedule-manager.js` | 347 | Modelo de datos de programación, filtros |
| `window-manager.js` | 292 | Sistema de ventanas flotantes |
| `dashboard-view.js` | 289 | KPIs, curva S, donut, incidencias |
| `collision-view.js` | 164 | UI de colisiones, severidad, BCF |
| `budget-view.js` | 158 | UI de presupuesto, tabla moderna |
| `tree-panel.js` | 157 | Árbol por pisos/categorías |
| `budget-manager.js` | 148 | CRUD presupuesto, localStorage |
| `settings-view.js` | 137 | Panel de configuración |
| `dock.js` | 125 | Dock inferior glassmorphism |
| `report-view.js` | 121 | Generación PDF |
| `simulation.js` | 118 | Controles de simulación 4D |
| `project-manager.js` | 94 | Save/load proyectos `.obraview` |
| `storage.js` | 81 | CRUD incidencias + JSON |
| `properties-panel.js` | 79 | Panel de propiedades IFC |

### Dependencias

| Paquete | Versión | Uso |
|---------|---------|-----|
| Three.js | r128 | Motor 3D |
| web-ifc | v0.0.77 | Parseo IFC (WASM) |
| SheetJS | v0.20.1 | Parseo Excel |
| Google Fonts | — | Tipografía + iconos |

---

## ✅ Features Completadas (v1.0)

### Visual
- Sistema de diseño completo con tokens de color, spacing, tipografía
- Glassmorphism en ventanas, dock, modales, menús
- Scrollbars temáticos (WebKit + Firefox)
- Animaciones de transición (cubic-bezier)
- Contadores KPI animados (easeOutCubic)
- Menú desplegable "Archivo" con modal de confirmación
- Responsive completo (< 768px)

### 3D
- Carga de modelos IFC + OBJ/MTL/texturas
- Navegación: órbita, zoom, paneo, vistas predefinidas
- Modo caminar WASD con pointer lock
- Selección: clic, Ctrl+clic, selección por rectángulo
- Highlight con cambio de material
- Tooltip hover con nombre del elemento
- Clipping planes X/Y/Z con slider

### BIM
- Panel de propiedades IFC completas
- Árbol por pisos (IfcBuildingStorey) y categorías
- Visibilidad por elemento, piso, categoría
- Filtro por texto, nivel, tipo, nombre, Z, volumen

### 4D (Programación)
- CRUD de rubros con fechas y avance
- Filtros automáticos por nivel/tipo/volumen
- Vista Gantt con barras arrastrables
- Simulación play/pause/speed/seek/reset
- Coloreado de elementos por estado
- Importación/exportación CSV/XLSX/JSON

### 5D (Presupuesto)
- CRUD de presupuesto por categorías
- Cálculo automático de totales
- Badges de estado (vinculado/desvinculado)
- Importación CSV/XLSX

### Gestión
- Detección de colisiones (bounding boxes)
- Niveles de severidad (critical/high/medium/low)
- Exportación BCF 2.1
- Marcadores 3D con incidencias
- Fotos, estados, fechas, coordenadas
- Generación de reportes PDF
- Save/load de proyecto completo (`.obraview`)

### Infraestructura
- PWA con Service Worker
- i18n ES/EN
- Dock + ventanas flotantes
- Atajos de teclado
- Drag & drop de archivos
- Context menu (right-click)

---

## 🔴 Problemas Críticos a Resolver

### 1. Accesibilidad (Prioridad: CRÍTICA)
```
Estado actual: F (cero implementación)
```

| Problema | Impacto | Solución |
|----------|---------|----------|
| Sin atributos `aria-*` | Screen readers no pueden interpretar la UI | Agregar `aria-label`, `aria-expanded`, `aria-hidden` |
| Sin roles ARIA | Elementos no semánticos no son identificables | Agregar `role="button"`, `role="menu"`, `role="dialog"` |
| Sin navegación por teclado | Dock, menús, ventanas inaccesibles sin mouse | Agregar `tabindex`, `keydown` handlers, focus management |
| Sin indicadores de foco | Usuario no sabe dónde está el foco | Agregar `:focus-visible` styles |
| Contraste insuficiente | `#888` sobre `#12121d` puede fallar WCAG AA | Evaluar y ajustar colores secundarios |
| Sin `alt` text | Imágenes en reportes sin descripción | Agregar `alt` en screenshots |

### 2. Testing (Prioridad: CRÍTICA)
```
Estado actual: F (cero tests)
```

| Tipo de test | Qué cubrir | Herramienta sugerida |
|-------------|------------|---------------------|
| Unit tests | Funciones puras: `animateValue`, `buildSCurvePath`, `computeFilterEids`, `escapeHTML` | Vitest |
| Integration tests | CRUD de rubros, presupuesto, incidencias | Vitest + jsdom |
| E2E tests | Flujo: cargar IFC → seleccionar → ver props → medir → crear incidencia | Playwright |
| Visual tests | Snapshot de dashboard, gantt, colisiones | Playwright screenshot |
| Performance tests | Carga de modelo grande, render de Gantt con 100+ rubros | Lighthouse CI |

### 3. Rendimiento con Modelos Grandes (Prioridad: ALTA)

| Problema | Dónde | Solución propuesta |
|----------|-------|-------------------|
| `LoadAllGeometry()` bloquea main thread | `ifc-loader.js:169-291` | Web Worker + chunked mesh generation |
| Colisión O(n×m) sin indexación espacial | `tools.js:261-302` | Octree o BVH para detección rápida |
| Tree panel re-renderiza todo el DOM | `tree-panel.js:22-90` | Virtual scrolling para listas grandes |
| Material cloning en highlight | `viewer.js:168-235` | Instanced materials o shader-based highlight |
| Gantt re-build completo en cada cambio | `gantt-view.js:221-309` | Diffing incremental o React-like rendering |
| Filtros O(rubros × entries × filters) | `schedule-manager.js:68-122` | Indexación por categoría/nivel |

---

## 🟡 Mejoras Importantes (Prioridad: ALTA)

### 4. Arquitectura de Código

| Problema | Actual | Solución |
|----------|--------|----------|
| **Todo es IIFE global** | Módulos se acoplan por nombres globales (`ObraViewer`, `ObraApp`, etc.) | Migrar a ES Modules con `import/export` |
| **CSS inline en HTML** | ~765 líneas de CSS dentro de `<style>` en `index.html` | Separar a `styles/` directory con archivos por componente |
| **Sin type checking** | JavaScript puro sin anotaciones de tipo | Agregar JSDoc `@type` o migrar a TypeScript |
| **Sin linting** | Sin ESLint ni Prettier | Configurar `eslint.config.js` + `prettier` |
| **Sin build** | No hay minificación, bundling, tree-shaking | Agregar Vite o esbuild para producción |

### 5. i18n Incompleto

| Módulo | Estado | Detalle |
|--------|:------:|---------|
| `app.js` | ✅ | Usa `ObraI18n.__()` en la mayoría |
| `dashboard-view.js` | ❌ | Strings hardcodeados en español ("Presupuesto Total", "Avance General", etc.) |
| `budget-view.js` | ❌ | Strings hardcodeados en español |
| `collision-view.js` | ❌ | Strings hardcodeados ("Categoría A", "Detectar", etc.) |
| `gantt-view.js` | ⚠️ | Parcial — algunos strings traducidos, otros no |
| `settings-view.js` | ✅ | Usa `ObraI18n.__()` correctamente |
| `properties-panel.js` | ✅ | Usa `ObraI18n.__()` |
| `tree-panel.js` | ✅ | Usa `ObraI18n.__()` |

### 6. UX Faltante

| Feature | Descripción | Esfuerzo |
|---------|-------------|----------|
| **Undo/Redo** | Deshacer acciones (medición, incidencia, cambio de visibilidad) | Medio |
| **Búsqueda global** | Buscar elemento por nombre/ID en todo el modelo | Bajo |
| **Exportar selección** | Exportar solo elementos seleccionados a IFC/OBJ | Alto |
| **Comparar modelos** | Cargar 2 IFCs y superponer | Muy alto |
| **Vistas guardadas** | Guardar cámaras personalizadas y volver a ellas | Bajo |
| **Notificaciones** | Toast notifications para acciones (guardar, exportar, error) | Bajo |
| **Tour guiado** | First-run tutorial para nuevos usuarios | Medio |
| **Share link** | Compartir estado de la app (cámara, selección) via URL | Medio |

---

## 🔵 Mejoras de Calidad de Vida (Prioridad: MEDIA)

### 7. DevOps

| Item | Estado | Acción |
|------|:------:|--------|
| GitHub Actions CI | ❌ | Crear workflow para lint + test en cada push |
| Linting | ❌ | `npm install -D eslint prettier` + config |
| Type checking | ❌ | JSDoc `@ts-check` o TypeScript gradual |
| Pre-commit hooks | ❌ | `husky` + `lint-staged` |
| Changelog | ❌ | `conventional-changelog` o manual |
| Release tagging | ❌ | `npm version` + GitHub releases |

### 8. Performance Monitoring

| Herramienta | Uso |
|-------------|-----|
| Lighthouse CI | Medir performance, accesibility, best practices |
| Chrome DevTools Performance | Profilear carga de modelos grandes |
| Bundle Analyzer | Analizar tamaño de scripts (cuando haya bundler) |

### 9. Documentación para Contribuidores

| Documento | Estado | Contenido |
|-----------|:------:|-----------|
| CONTRIBUTING.md | ❌ | Guía para contribuir al proyecto |
| API.md | ❌ | Documentación de la API pública de cada módulo |
| ARCHITECTURE.md | ❌ | Diagrama de dependencias, flujo de datos |
| CHANGELOG.md | ❌ | Historial de cambios por versión |

---

## 🟢 Oportunidades de Innovación (Prioridad: BAJA pero estratégica)

### 10. Features Avanzadas v2.0

| Feature | Descripción | Impacto |
|---------|-------------|---------|
| **Real-time sync** | Multi-usuario viendo el mismo modelo (WebSocket) | Transformacional |
| **AI-assisted** | Detección automática de problemas de diseño (ML) | Transformacional |
| **Cloud storage** | Guardar modelos en S3/Azure/GCS | Alto |
| **Mobile AR** | Ver el modelo superpuesto en la obra real (ARKit/ARCore) | Transformacional |
| **VR walkthrough** | Recorrer el modelo en realidad virtual | Alto |
| **Version control** | Historial de cambios del modelo (diferencias entre revisiones) | Alto |
| **Automated reports** | Reportes programados por email/WhatsApp | Medio |
| **Integration Revit** | Plugin directo para Revit → ObraView | Alto |
| **Cost forecasting** | Predicción de costos basada en avance real vs plan | Alto |
| **Resource tracking** | Seguimiento de materiales y mano de obra | Medio |

### 11. Optimizaciones Técnicas v2.0

| Optimización | Beneficio | Complejidad |
|-------------|-----------|-------------|
| **Web Workers** | Carga IFC sin bloquear UI | Media |
| **LOD (Level of Detail)** | Renderizado adaptativo por distancia | Alta |
| **Instanced rendering** | Miles de elementos del mismo tipo con 1 draw call | Alta |
| **Octree spatial index** | Colisiones y raycasting O(log n) | Media |
| **Lazy loading** | Cargar módulos JS bajo demanda | Baja |
| **Code splitting** | Dividir JS en chunks por funcionalidad | Media |
| **Service Worker v2** | Cache inteligente con invalidación | Media |
| **IndexedDB** |存储 grande en vez de localStorage | Baja |

---

## 📅 Roadmap Sugerido v2.0

### Fase 19 — Accesibilidad (4-6 semanas)
- [ ] Agregar ARIA labels a todos los botones interactivos
- [ ] Implementar navegación por teclado en dock y menús
- [ ] Focus management en ventanas flotantes y modales
- [ ] Auditar contraste de colores (WCAG 2.1 AA)
- [ ] Agregar `role` attributes a componentes no semánticos
- [ ] Skip links para navegación rápida

### Fase 20 — Testing (4-6 semanas)
- [ ] Setup Vitest + jsdom
- [ ] Tests unitarios para funciones puras
- [ ] Tests de integración para CRUD de rubros/presupuesto
- [ ] Setup Playwright para E2E
- [ ] E2E test: flujo completo cargar→seleccionar→medir→incidencia
- [ ] Lighthouse CI en GitHub Actions

### Fase 21 — Performance (6-8 semanas)
- [ ] Web Worker para carga IFC
- [ ] Virtual scrolling para tree panel y gantt
- [ ] Octree para colisiones
- [ ] LOD para modelos grandes
- [ ] Profiling y optimización de hot paths

### Fase 22 — Arquitectura (8-10 semanas)
- [ ] Migrar a ES Modules
- [ ] Separar CSS a archivos independientes
- [ ] Agregar ESLint + Prettier
- [ ] Agregar JSDoc type annotations
- [ ] Setup Vite para build de producción
- [ ] GitHub Actions CI/CD

### Fase 23 — UX Mejorada (4-6 semanas)
- [ ] Undo/Redo
- [ ] Búsqueda global de elementos
- [ ] Toast notifications
- [ ] Vistas guardadas
- [ ] Tour guiado para nuevos usuarios

### Fase 24 — i18n Completo (2-3 semanas)
- [ ] Conectar i18n en dashboard, budget, collision
- [ ] Revisar todas las keys faltantes
- [ ] Testing de ambos idiomas

---

## 📈 Métricas de Salud del Proyecto

| Métrica | Valor | Estado |
|---------|------:|:------:|
| Total archivos fuente | 22 | — |
| Total líneas JS | ~5,446 | — |
| Total líneas CSS | ~765 (inline) | — |
| Total líneas HTML | ~987 | — |
| Módulos JS | 20 | — |
| Dependencias npm | 2 | ✅ |
| Dependencias CDN | 4 | ✅ |
| Tests | 0 | 🔴 |
| Atributos ARIA | 0 | 🔴 |
| Console.log (debug) | 0 | ✅ |
| TODO/FIXME | 0 | ✅ |
| Archivos de documentación | 6 | ✅ |
| Fases completadas | 18/18 | ✅ |
| i18n coverage | ~70% | ⚠️ |
| Accessibility score | ~10% | 🔴 |
| Performance (modelos grandes) | Medio | ⚠️ |

---

## 🎯 Conclusión

ObraView v1.0 es una aplicación **funcional y completa** con todas las features planificadas. La deuda técnica principal está en:

1. **Accesibilidad** — Requiere inversión urgente para uso profesional
2. **Testing** — Sin tests, cualquier cambio puede romper funcionalidad existente
3. **Performance** — Necesita optimización para modelos BIM reales (10K-100K elementos)
4. **Arquitectura** — El patrón IIFE funciona pero limita la escalabilidad

La prioridad inmediata debe ser **accesibilidad + testing** antes de agregar nuevas features, ya que son requisitos para cualquier despliegue profesional o gubernamental.

---

> **Última actualización:** 18 de Junio 2026  
> **Próxima revisión:** Después de completar Fase 19 (Accesibilidad)
