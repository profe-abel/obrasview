# 🏗️ ObraView — Visor BIM 3D Web

Visor 3D para modelos BIM (IFC) que funciona en el navegador, sin instalación, ideal para usar en obra desde el celular, tablet o laptop.

> **Stack**: Three.js + web-ifc + HTML estático  
> **Formato**: IFC (exportable desde Revit, ArchiCAD, FreeCAD, etc.), OBJ + MTL + texturas  
> **Despliegue**: GitHub Pages, cualquier servidor estático, o archivo local

---

## 📁 Estructura del proyecto

```
obrasview/
├── ROADMAP.md                 ← Este archivo (plan maestro)
├── index.html                 ← Punto de entrada de la app
├── .gitignore
├── src/
│   ├── app.js                 ← Controlador principal / dropdown menus / modales
│   ├── viewer.js              ← Motor 3D (Three.js scene, cámara, luces, orbit)
│   ├── ifc-loader.js          ← Carga y parseo de archivos IFC/OBJ
│   ├── properties-panel.js    ← Panel de propiedades del elemento seleccionado
│   ├── tree-panel.js          ← Árbol de proyecto por pisos/tipos
│   ├── tools.js               ← Herramientas: medir, seccionar, anotar
│   ├── storage.js             ← Guardar/cargar incidencias en JSON
│   ├── window-manager.js      ← Ventanas flotantes con drag/resize/focus
│   ├── dock.js                ← Dock inferior con glassmorphism
│   ├── schedule-manager.js    ← Gestión de programación/4D
│   ├── gantt-view.js          ← Vista Gantt + rubros interactivos
│   ├── budget-manager.js      ← Gestión de presupuesto 5D
│   ├── budget-view.js         ← Vista de presupuesto con tabla moderna
│   ├── dashboard-view.js      ← Dashboard con KPIs animados, curva S, donut
│   ├── collision-view.js      ← Detección de colisiones con severidad
│   ├── simulation.js          ← Simulación 4D play/pause/speed
│   ├── settings-view.js       ← Panel de configuración
│   ├── report-view.js         ← Generación de reportes PDF
│   ├── project-manager.js     ← Save/load proyectos .obraview
│   ├── i18n.js                ← Internacionalización ES/EN
│   └── (más módulos)
├── estilo/                    ← Prototipos de diseño
├── lib/
│   └── web-ifc-api-iife.js   ← web-ifc v0.0.77 local
└── assets/
    └── (modelos .ifc de prueba)
```

---

## 🗺️ Hoja de ruta por fases

### ✅ Fase 1 — Hola mundo 3D
- [x] Crear `index.html` con Three.js desde CDN
- [x] Renderizar un cubo/grid con iluminación
- [x] OrbitControls (rotar, hacer zoom, panear)
- [x] Auto resize de la ventana
- [x] Pantalla en negro con stats básicos

### ✅ Fase 2 — Cargar modelo IFC
- [x] Integrar `web-ifc` (WebAssembly)
- [x] Botón "Cargar archivo IFC" (input type=file)
- [x] Parsear el IFC y convertir geometría a mallas Three.js
- [x] Mostrar el modelo completo con materiales por defecto
- [x] Encuadrar (fitToScene) al cargar
- [x] Soporte OBJ + MTL + texturas

### ✅ Fase 3 — Navegación profesional
- [x] Botones de vista: Planta, Frontal, Lateral, Perspectiva
- [x] Zoom a selección (encuadrar en objeto)
- [x] Tooltip con nombre del elemento bajo el cursor
- [x] Barra de herramientas flotante (CSS)
- [x] Atajos de teclado (R para reset, F para encuadrar, 1-2-3 vistas, WASD caminar)

### ✅ Fase 4 — Seleccionar elementos y ver propiedades
- [x] Raycaster para detectar clic en objetos 3D
- [x] Resaltar elemento seleccionado (outline o cambio de color)
- [x] Panel lateral con propiedades: Tipo, Material, Dimensiones, Nivel, GUID/ExpressID
- [x] Deseleccionar con clic en vacío
- [x] Selección múltiple (Ctrl+click)
- [x] Selección por rectángulo (box select)

### ✅ Fase 5 — Árbol de proyecto + filtros
- [x] Árbol colapsable por pisos (IfcBuildingStorey)
- [x] Subárbol por categorías dentro de cada piso
- [x] Checkbox para ocultar/mostrar elementos
- [x] Ocultar todo / mostrar todo
- [x] Filtro rápido por texto (búsqueda por nombre)
- [x] Aislar elemento (ocultar todo excepto selección)

### ✅ Fase 6 — Herramientas de medición
- [x] Modo "Medir distancia": clic A → clic B → línea + etiqueta
- [x] Mostrar medida en metros (con 2 decimales)
- [x] Acumulador (varias medidas simultáneas)
- [x] Botón "Limpiar todo"

### ✅ Fase 7 — Planos de corte / secciones
- [x] Plano de corte con Three.js clipping planes
- [x] Ejes X, Y, Z seleccionables
- [x] Slider para desplazar el plano de corte
- [x] Botón "Reset corte"

### ✅ Fase 8 — Detección de colisiones
- [x] Seleccionar dos categorías (ej. "Muros vs Tuberías")
- [x] Algoritmo de detección por bounding boxes
- [x] Resaltar intersecciones en rojo
- [x] Lista de colisiones con severidad (critical/high/medium/low)
- [x] Exportar reporte JSON + BCF
- [x] Tolerancia y cálculo de volumen

### ✅ Fase 9 — Anotaciones + seguimiento de obra
- [x] Marcador 3D (pin) en ubicación seleccionada
- [x] Panel de incidencia: título, descripción, estado, fotos, coordenadas
- [x] Lista de incidencias con filtros por estado
- [x] Exportar/Importar incidencias (JSON)
- [x] Marcadores con color según estado

### ✅ Fase 10 — PWA + offline
- [x] Service Worker para funcionar offline
- [x] manifest.json (instalable)
- [x] Optimización para pantallas táctiles

### ✅ Fase 11 — Gestión de proyecto
- [x] Guardar proyecto completo (`.obraview`)
- [x] Cargar proyecto guardado
- [x] Dropdown menú "Archivo" con opciones

### ✅ Fase 12 — Reportes
- [x] Generación de reportes PDF con screenshot
- [x] Incluir datos del modelo y estadísticas

### ✅ Fase 13 — Simulación 4D
- [x] Play/pause/speed/seek/reset
- [x] Coloreado de elementos por estado de programación
- [x] Timeline visual

### ✅ Fase 14 — Presupuesto 5D
- [x] CRUD de presupuesto por categorías
- [x] Importación CSV/XLSX
- [x] Tabla moderna con badges de estado
- [x] Cálculo automático de totales

### ✅ Fase 15 — Dashboard de control
- [x] KPI cards con contadores animados (easeOutCubic)
- [x] Curva S de progreso (plan vs real)
- [x] Gráfico donut de distribución de costos
- [x] Estado de incidencias por severidad

### ✅ Fase 16 — i18n
- [x] Soporte ES/EN con ~250 claves
- [x] Selector de idioma en configuración
- [x] Interpolación de strings

### ✅ Fase 17 — Dock + Window Manager
- [x] Bottom dock con glassmorphism
- [x] Ventanas flotantes con drag/resize/focus
- [x] Estados de glow (purple/blue/gold)
- [x] Z-index management automático
- [x] Pulse animation en dock activo

### ✅ Fase 18 — Visual Design System
- [x] Paleta de colores exacta del prototipo (DESIGN.md)
- [x] Sistema de botones primary/secondary
- [x] Glassmorphism en ventanas, dock, modales
- [x] Scrollbars temáticos (WebKit + Firefox)
- [x] Menú desplegable "Archivo" con modal de confirmación
- [x] Animaciones de transición en todo (cubic-bezier)
- [x] CSS variables consolidadas dentro de `:root`
- [x] Modal de confirmación con AbortController (sin memory leaks)

---

## 📐 Alcance total

| Aspecto | Incluye | No incluye |
|---|---|---|
| Formatos | IFC2x3, IFC4, OBJ + MTL + texturas | DWG, RVT (propietarios) |
| Navegación | Órbita, zoom, paneo, vistas predefinidas, modo caminar WASD | Recorrido animado automático |
| Selección | Por clic, por árbol, por búsqueda, por rectángulo, múltiple | Selección por volumen |
| Propiedades | Todas las del IFC (tipo, material, nivel, etc.) | Edición de propiedades |
| Medición | Distancia | Área, volumen, ángulo |
| Corte | Plano dinámico X,Y,Z | Corte por sección libre |
| Colisiones | Bounding boxes entre categorías con severidad | Detección precisa por geometría |
| Seguimiento | Marcadores + incidencias + fotos + export JSON | Sincronización en tiempo real multi-usuario |
| 4D | Simulación con timeline + coloreado por estado | Integración con MS Project |
| 5D | Presupuesto por categorías + importación CSV/XLSX | Integración con SAP |
| Despliegue | GitHub Pages, archivos estáticos (local, Drive) | Backend, base de datos, login |
| Offline | Service worker + carga local | Sync offline-to-cloud |

---

## 🚀 Deploy

```bash
# pushes a master para GitHub Pages
git add -A && git commit -m "feat: ..." && git push origin master
```

La app se despliega automáticamente en: `https://profe-abel.github.io/obrasview/`

---

## 📝 Notas técnicas

- `web-ifc` es una librería WASM que lee archivos IFC directo en el navegador
- Three.js se carga desde CDN (no requiere instalación)
- No hay servidor, no hay build tools, no hay dependencias npm para producción
- Compatible con Chrome, Edge, Firefox, Safari (incluyendo iOS/Android)
- Para proyectos grandes (>500 MB), considerar cargar IFC en un Worker

---

> **Estado actual**: ✅ Todas las 18 fases completadas
