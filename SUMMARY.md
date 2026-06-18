# 📋 ObraView — Resumen de progreso

## ✅ Fase 1 — Hola mundo 3D (Completada)
- Escena Three.js con cubo, grid, iluminación, OrbitControls, auto-resize
- Motor 3D con cámara, luces, rejilla, manejo de resize
- Canvas en modo oscuro, inicialización

## ✅ Fase 2 — Cargar modelo IFC (Completada)
- Botón "Cargar IFC" + drag-drop de archivos `.ifc`
- Integración `web-ifc` v0.0.77 (WASM)
- `LoadAllGeometry`: extrae geometría y crea mallas Three.js
- Extracción de propiedades con `GetLine`
- Barra de progreso, fitToScene al cargar
- **Fix**: `GetGeometry` ahora detecta API v0.0.77 (métodos `GetVertexData()`) vs v0.0.46 (propiedades directas)

## ✅ Fase 3 — Navegación profesional (Completada)
- Botones de vista: 3D, Planta, Frontal, Lateral
- Tooltip con nombre del elemento bajo el cursor
- Atajos de teclado: R (reset vista), F (encuadrar), 1-2-3 (vistas), Esc (deseleccionar)
- Botón encuadrar

## ✅ Fase 4 — Seleccionar elementos y ver propiedades (Completada)
- Raycaster para detectar clic en objetos 3D
- Resaltar elemento seleccionado (cambio de color + emisivo)
- Panel lateral con propiedades: tipo, ID, nivel, todas las props IFC
- Deseleccionar con clic en vacío

## ✅ Fase 5 — Árbol de proyecto + filtros (Completada)
- Árbol colapsable por pisos (IfcBuildingStorey)
- Subárbol por categorías dentro de cada piso
- Checkbox para ocultar/mostrar elementos
- Ocultar todo / mostrar todo
- Filtro rápido por texto (búsqueda por nombre)
- Botón toggle en header

## 🔄 Fase 6 — Herramientas de medición (Completada)
- Modo "Medir distancia": clic A → clic B → línea + etiqueta 3D
- Medida en metros con 2 decimales
- Acumulador (varias medidas simultáneas)
- Botón toggle 📏 en header

## ⬜ Fase 7 — Planos de corte / secciones
- Plano de corte con Three.js clipping planes
- Ejes X, Y, Z seleccionables
- Slider para desplazar el plano de corte
- Botón "Reset corte"

## ⬜ Fase 8 — Colisiones
- Bounding boxes entre categorías
- Resaltar intersecciones en rojo
- Reporte JSON

## ⬜ Fase 9 — Anotaciones + incidencias
- Marcadores 3D, panel incidencia, fotos, exportar JSON

## ⬜ Fase 10 — PWA + offline
- Service Worker, Drive, QR, instalable, táctil

## Archivos del proyecto
| Archivo | Estado |
|---|---|
| `index.html` | ✅ Actualizado (Fase 6) |
| `src/viewer.js` | ✅ Motor 3D + ocultar/mostrar |
| `src/ifc-loader.js` | ✅ Carga IFC (fix API v0.0.77) |
| `src/app.js` | ✅ Controlador + herramientas |
| `src/properties-panel.js` | ✅ Panel de propiedades |
| `src/tree-panel.js` | ✅ Árbol de proyecto |
| `src/tools.js` | ✅ Medición de distancias |
| `lib/web-ifc-api-iife.js` | web-ifc v0.0.77 local |
