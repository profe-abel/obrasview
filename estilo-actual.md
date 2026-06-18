# ObraView — Visor BIM 3D para Programación y Control de Obra

## ¿Qué es?

Aplicación web 100% estática (sin bundlers ni servidores) que carga modelos **IFC** y **OBJ**, los visualiza en 3D con **Three.js**, y permite gestionar la **programación de obra** directamente sobre el modelo: crear rubros, asignarlos a elementos del modelo por nivel/tipo/nombre/altura/volumen, visualizar el cronograma tipo MS Project, colorear el 3D por rubro, detectar colisiones, marcar incidencias, y exportar/importar planillas.

---

## Disposición actual de la UI

```
┌─────────────────────────────────────────────────────────────┐
│  Header (brand + model info + botones de acción)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📋 ───  Área 3D (viewport Three.js + OrbitControls)  ─── 📊 │
│   panel                            │  📄                      │
│   left   ───  ───  ───  ───  ───  │ panel                     │
│   slide                            │ right                     │
│                                    │ slide                     │
│                                    │                           │
│       [3D] [Planta] [Frontal] [Lat]  [X] [Y] [Z] [═══] [✕]   │
│       └────────── View toolbar ────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes por capa (z-index)

| Z-index | Elemento | Tipo |
|---------|----------|------|
| 25 | Context menu | Menú flotante (right-click) |
| 20 | Tooltip hover | Tooltip informativo |
| 15 | Tree panel (left) / Properties panel (right) | Slide lateral |
| 14 | Gantt panel / Issue list / Schedule panel (right) | Slide lateral |
| 12 | Issue form / Collision panel | Overlay centro-inferior |
| 10 | Progress bar | Overlay superior |
| 5 | Drop zone hint | Overlay centro |
| 2 | View toolbar + Clipping controls | Barra inferior |
| 1 | Phase badge | Etiqueta inferior |

---

## Estilos generales

| Propiedad | Valor |
|-----------|-------|
| **Fondo página** | `#0f0f1a` (navy oscuro) |
| **Fondo canvas 3D** | `#1a1a2e` |
| **Paneles laterales** | `rgba(22,22,42,0.97)` + `backdrop-filter: blur(8px)` |
| **Bordes** | `#2a2a45` (1px) |
| **Color acento** | `#4a9eff` (botones primarios, highlights, links) |
| **Texto principal** | `#e0e0e0` |
| **Texto secundario** | `#888` |
| **Texto terciario** | `#555` |
| **Inputs / Selects** | fondo `#1a1a30`, borde `#2a2a45`, foco `#4a9eff` |
| **Botón primario** | `background: #4a9eff`, hover `#3a8eef` |
| **Botón secundario** | `background: #2a2a45`, hover `#3a3a55` |
| **Transiciones** | `transform 0.25s ease` para slides |
| **Tipografía** | `'Segoe UI', system-ui, -apple-system, sans-serif` |

---

## Botones de acción (header)

```
📋  📏  ⚡  📌  📊  📄  📋  ⬇  ⬆  [Cargar IFC]
│   │   │   │   │   │   │   │   │
│   │   │   │   │   │   │   │   └── Import incidencias (JSON)
│   │   │   │   │   │   │   └── Export incidencias (JSON)
│   │   │   │   │   │   └── Lista de incidencias
│   │   │   │   │   └── Reporte PDF
│   │   │   │   └── Programación (Gantt + rubros)
│   │   │   └── Pin / markers
│   │   └── Detección de colisiones
│   └── Medir distancias
└── Árbol de elementos (navegación por nivel/tipo)
```

---

## Paneles laterales (slide)

Usan `position: absolute` con `transform: translateX(±100%)` y toggle via clase `.visible` que lo lleva a `translateX(0)`.

| Panel | Lado | Ancho | Contenido |
|-------|------|-------|-----------|
| **Tree panel** (📋) | Izquierdo | 300px | Elementos agrupados por nivel + tipo con checkboxes visibilidad |
| **Properties panel** | Derecho | 320px | Propiedades del elemento seleccionado (pares key-value) |
| **Gantt panel** (📊) | Derecho | 400px (mobile: 300px) | 4 pestañas: Rubros / Gantt / 3D / Importar |
| **Issue list** | Derecho | 280px | Incidencias con estado coloreado |

### Pestañas del Gantt panel

| Pestaña | Función |
|---------|---------|
| **Rubros** | CRUD de rubros con edición inline, slider de avance %, filtros de asignación (nivel+tipo, nombre, Z, volumen, selección directa) |
| **Gantt** | Barras horizontales con drag & drop de bordes/centro, línea "Hoy", tooltip, escala configurable (días/semanas/meses), slider de avance % inline |
| **3D** | Botones Aplicar colores / Limpiar + leyenda de rubros + botón Reporte PDF |
| **Importar** | Importar CSV / XLSX / JSON + Exportar CSV / XLSX / JSON |

---

## Overlays (centro)

| Elemento | Posición | Función |
|----------|----------|---------|
| **Issue panel** | `bottom: 90px; left: 50%; transform: translateX(-50%)` | Crear/editar incidencia (título, descripción, estado, foto) |
| **Collision panel** | Misma posición | Seleccionar dos categorías, detectar colisiones, exportar JSON |
| **Progress bar** | `top: 0; left: 0; right: 0` | Barra de progreso durante carga de IFC |

---

## Tooltips y menús

- **Tooltip hover**: sigue al mouse sobre elementos del modelo 3D, muestra nombre y tipo, semi-transparente con backdrop blur
- **Context menu** (right-click): Seleccionar, Aislar, Ocultar, Agregar incidencia, Mostrar todo

---

## Responsive (media query ≤ 600px)

| Elemento | Cambio |
|----------|--------|
| `.model-info` (nombre + estado) | `display: none` |
| Header padding | `4px 10px` |
| Properties panel | ancho de 320 → 280px |
| Gantt panel | ancho de 400 → 300px |

---

## Archivos del proyecto

```
/
├── index.html              ← Punto de entrada (HTML + CSS + scripts)
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (cache CDN)
├── start.ps1               ← Script para iniciar servidor local
├── lib/
│   └── web-ifc-api-iife.js ← web-ifc v0.0.77 (IIFE, local)
└── src/
    ├── viewer.js           ← Motor 3D (scene, cámara, controles, clipping, colores)
    ├── ifc-loader.js       ← Carga IFC (web-ifc) y OBJ (Three.js OBJLoader)
    ├── properties-panel.js ← Panel de propiedades del elemento
    ├── tree-panel.js       ← Árbol de elementos por nivel/tipo
    ├── tools.js            ← Medición, colisiones, markers/pins
    ├── storage.js          ← CRUD incidencias + import/export JSON
    ├── schedule-manager.js ← Modelo de datos: rubros, filtros, color map, CSV/XLSX
    ├── gantt-view.js       ← Panel de programación con Gantt chart interactivo
    └── report-view.js      ← Generador de reporte PDF (nueva ventana + print)
```

---

## Proyección: Ventanas flotantes

### Problema actual

Todos los paneles laterales usan `transform: translateX()` para deslizarse desde los bordes. Limitaciones:

1. Solo un panel visible a la vez por lado
2. No se pueden reubicar ni redimensionar
3. No se pueden tener varios abiertos simultáneamente
4. No minimizables

### Solución propuesta

Cada panel será una ventana independiente con:
- **Drag** desde el header para reubicar
- **Resize** desde bordes/esquinas (cursor `ew-resize`, `ns-resize`, `nwse-resize`)
- **Minimizar** a barra de iconos inferior
- **Stack/z-order** al hacer click (traer al frente)
- **Persistencia** de posición/tamaño en localStorage
- **Snap** a bordes (opcional, < 20px)

### Paleta de colores por tipo de ventana

| Ventana | Color acento |
|---------|-------------|
| Tree | `#9b59b6` (púrpura) |
| Properties | `#f39c12` (ámbar) |
| Gantt | `#4a9eff` (azul) |
| Issues | `#e74c3c` (rojo) |
| Collision | `#e67e22` (naranja) |

### Layout sugerido

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────┐         │
│  │ 📋 Tree  │  │      Área 3D (viewport)       │         │
│  │          │  │                                │         │
│  │          │  │        ┌──────────────────┐    │         │
│  │          │  │        │ 📊 Programación  │    │         │
│  │          │  │        │ (pestañas)       │    │         │
│  │          │  │        └──────────────────┘    │         │
│  └──────────┘  └──────────────────────────────┘         │
│                                                          │
│  ┌───────────────┐  ┌────────────────────┐               │
│  │ 📋 Issues     │  │ 📐 Propiedades     │               │
│  └───────────────┘  └────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### Módulo base

```
src/window-manager.js     ← Crear, mover, redimensionar, apilar ventanas
```

Cada ventana existente se migraría a un formato donde su contenido se renderice dentro de un contenedor flotante en vez de un slide lateral.
