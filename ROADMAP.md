# 🏗️ ObraView — Visor BIM 3D Web

Visor 3D para modelos BIM (IFC) que funciona en el navegador, sin instalación, ideal para usar en obra desde el celular, tablet o laptop.

> **Stack**: Three.js + web-ifc + HTML estático  
> **Formato**: IFC (exportable desde Revit, ArchiCAD, FreeCAD, etc.)  
> **Despliegue**: Abrir `index.html` desde cualquier carpeta local, Drive, o GitHub Pages

---

## 📁 Estructura del proyecto

```
pruebalocal/
├── ROADMAP.md                 ← Este archivo (plan maestro)
├── index.html                 ← Punto de entrada de la app
├── .gitignore
├── src/
│   ├── app.js                 ← Controlador principal / estado global
│   ├── viewer.js              ← Motor 3D (Three.js scene, cámara, luces, orbit)
│   ├── ifc-loader.js          ← Carga y parseo de archivos IFC
│   ├── properties-panel.js    ← Panel de propiedades del elemento seleccionado
│   ├── tree-panel.js          ← Árbol de proyecto por pisos/tipos
│   ├── tools.js               ← Herramientas: medir, seccionar, anotar
│   └── storage.js             ← Guardar/cargar incidencias en JSON
├── assets/
│   └── (modelos .ifc de prueba)
└── lib/
    └── (librerías si se descargan localmente)
```

---

## 🗺️ Hoja de ruta por fases

### 🟢 Fase 1 — Hola mundo 3D _(~1 tarde)_
**Objetivo**: Renderizar un objeto 3D navegable en el navegador.

- [x] Crear `index.html` con Three.js desde CDN
- [ ] Renderizar un cubo/grid con iluminación
- [ ] OrbitControls (rotar, hacer zoom, panear)
- [ ] Auto resize de la ventana
- [ ] Pantalla en negro con stats básicos

**Archivos**: `index.html`, `src/viewer.js`, `src/app.js`  
**Resultado**: Una escena 3D interactiva en el navegador.

---

### 🟢 Fase 2 — Cargar un modelo IFC real _(~1-2 tardes)_
**Objetivo**: Ver tu modelo de Revit en el navegador.

- [ ] Integrar `web-ifc` (WebAssembly)
- [ ] Botón "Cargar archivo IFC" (input type=file)
- [ ] Parsear el IFC y convertir geometría a mallas Three.js
- [ ] Mostrar el modelo completo con materiales por defecto
- [ ] Encuadrar (fitToScene) al cargar

**Archivos**: `src/ifc-loader.js`, `index.html`  
**Resultado**: Cargas un `.ifc` y ves tu modelo en 3D.

---

### 🟡 Fase 3 — Navegación profesional _(~1 tarde)_
**Objetivo**: Controles de navegación como en Navisworks.

- [ ] Botones de vista: Planta, Frontal, Lateral, Perspectiva
- [ ] Zoom a selección (encuadrar en objeto)
- [ ] Tooltip con nombre del elemento bajo el cursor
- [ ] Barra de herramientas flotante (CSS)
- [ ] Atajos de teclado (R para reset, F para encuadrar)

**Archivos**: `src/viewer.js`, `src/ui.js` (nuevo)  
**Resultado**: Navegación fluida y profesional.

---

### 🟡 Fase 4 — Seleccionar elementos y ver propiedades _(~2 tardes)_
**Objetivo**: Inspeccionar elementos como en Navisworks.

- [ ] Raycaster para detectar clic en objetos 3D
- [ ] Resaltar elemento seleccionado (outline o cambio de color)
- [ ] Panel lateral con propiedades:
  - Tipo (IfcWall, IfcSlab, IfcWindow, IfcColumn…)
  - Material
  - Dimensiones (largo, alto, espesor)
  - Nivel (IfcBuildingStorey)
  - GUID / ExpressID
- [ ] Deseleccionar con clic en vacío

**Archivos**: `src/properties-panel.js` (nuevo), `src/ifc-loader.js`  
**Resultado**: Clic → ves todos los datos del elemento.

---

### 🟠 Fase 5 — Árbol de proyecto + filtros _(~2 tardes)_
**Objetivo**: Organizar y filtrar el modelo.

- [ ] Árbol colapsable por pisos (IfcBuildingStorey)
- [ ] Subárbol por categorías dentro de cada piso
- [ ] Checkbox para ocultar/mostrar elementos
- [ ] Ocultar todo / mostrar todo
- [ ] Filtro rápido por texto (búsqueda por nombre)
- [ ] Aislar elemento (ocultar todo excepto selección)

**Archivos**: `src/tree-panel.js` (nuevo)  
**Resultado**: Navegas el modelo por plantas y categorías.

---

### 🔵 Fase 6 — Herramientas de medición _(~2 tardes)_
**Objetivo**: Medir distancias y áreas en obra.

- [ ] Modo "Medir distancia": clic A → clic B → línea + etiqueta
- [ ] Mostrar medida en metros (con 2 decimales)
- [ ] Modo "Medir área": seleccionar cara → calcular área
- [ ] Acumulador (varias medidas simultáneas)
- [ ] Botón "Limpiar todo"
- [ ] Snap a vértices y puntos medios

**Archivos**: `src/tools.js`  
**Resultado**: Tomas medidas precisas en tu modelo.

---

### 🔵 Fase 7 — Planos de corte / secciones _(~2 tardes)_
**Objetivo**: Ver el interior del modelo.

- [ ] Plano de corte con Three.js clipping planes
- [ ] Ejes X, Y, Z seleccionables
- [ ] Slider para desplazar el plano de corte
- [ ] Botón "Reset corte"
- [ ] Indicador visual de la posición del corte

**Archivos**: `src/tools.js`  
**Resultado**: Cortas el modelo dinámicamente.

---

### 🔵 Fase 8 — Detección básica de colisiones _(~3 tardes)_
**Objetivo**: Encontrar interferencias entre elementos.

- [ ] Seleccionar dos categorías (ej. "Muros vs Tuberías")
- [ ] Algoritmo de detección por bounding boxes
- [ ] Resaltar intersecciones en rojo
- [ ] Lista de colisiones con coordenadas
- [ ] Exportar reporte JSON

**Archivos**: `src/tools.js`  
**Resultado**: Detección de clash básica.

---

### 🟣 Fase 9 — Anotaciones + seguimiento de obra _(~3 tardes)_
**Objetivo**: Hacer seguimiento en obra.

- [ ] Marcador 3D (pin) en ubicación seleccionada
- [ ] Panel de incidencia asociado al marcador:
  - Título, descripción, estado (pendiente/en proceso/resuelto)
  - Fotos (subida desde celular/cámara)
  - Coordenadas x,y,z
  - Fecha de creación
- [ ] Lista de incidencias con filtros por estado
- [ ] Exportar/Importar incidencias (JSON descargable)
- [ ] Marcadores con color según estado

**Archivos**: `src/tools.js`, `src/storage.js`  
**Resultado**: Tomas nota de incidencias directamente sobre el modelo.

---

### 🟣 Fase 10 — PWA + Drive + offline _(~2 tardes)_
**Objetivo**: Usar la app en obra sin internet.

- [ ] Service Worker para funcionar offline
- [ ] Cargar modelos desde Drive/OneDrive (archivo local)
- [ ] Compartir link por WhatsApp/QR
- [ ] Pantalla de inicio tipo app (splash screen)
- [ ] Instalable en celular (manifest.json + service worker)
- [ ] Optimización para pantallas táctiles (gestos)

**Archivos**: `sw.js`, `manifest.json`, `index.html`  
**Resultado**: Abres la app en obra, cargas el IFC y trabajas offline.

---

## 📐 Alcance total

| Aspecto | Incluye | No incluye |
|---|---|---|
| Formatos | IFC2x3, IFC4 | DWG, RVT (propietarios) |
| Navegación | Órbita, zoom, paneo, vistas predefinidas | Recorrido animado automático |
| Selección | Por clic, por árbol, por búsqueda | Selección por ventana/rectángulo |
| Propiedades | Todas las del IFC (tipo, material, nivel, etc.) | Edición de propiedades |
| Medición | Distancia, área | Volumen, ángulo |
| Corte | Plano dinámico X,Y,Z | Corte por sección libre |
| Colisiones | Bounding boxes entre categorías | Detección precisa por geometría |
| Seguimiento | Marcadores + incidencias + fotos | Sincronización en tiempo real multi-usuario |
| Despliegue | Archivos estáticos (local, Drive, GitHub Pages) | Backend, base de datos, login |
| Offline | Service worker + carga local | Sync offline-to-cloud |

---

## 🔧 Cómo exportar desde Revit

1. Revit → Archivo → Exportar → IFC
2. Configuración: IFC2x3 Coordination View (recomendado)
3. Opcional: marcar "Exportar propiedades de Revit como propiedades IFC"
4. Obtienes un archivo `.ifc` (~5-50 MB según el proyecto)
5. Arrástralo a ObraView y listo

> **Tip**: Para proyectos grandes (>100 MB), usa IFC con geometría comprimida (IFC-ZIP).

---

## 🧪 Cómo probar sin Revit

Puedes descargar modelos IFC de prueba gratis:
- [IFC Test Files (buildingSMART)](https://technical.buildingsmart.org/resources/ifc-specification/ifc-test-files/)
- [IFC File Generator](https://github.com/IfcSharp/IfcFileGenerator)
- O modela algo básico en [FreeCAD](https://www.freecad.org/) y exporta a IFC

---

## 🚀 ¿Primer paso?

Abre `index.html` en tu navegador y deberías ver una escena 3D básica con un cubo y un grid. ¡Eso es la Fase 1 funcionando!

---

## 📝 Notas técnicas

- `web-ifc` es una librería WASM que lee archivos IFC directo en el navegador
- Three.js se carga desde CDN (no requiere instalación)
- No hay servidor, no hay build tools, no hay dependencias npm
- Compatible con Chrome, Edge, Firefox, Safari (incluyendo iOS/Android)
- Para proyectos grandes (>500 MB), considerar cargar IFC en un Worker

---

> **Estado actual**: 🟢 Fase 1 completada
