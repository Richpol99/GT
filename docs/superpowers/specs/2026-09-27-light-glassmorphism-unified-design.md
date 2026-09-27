# GT Academy: Sistema de Diseño Unificado Light Glassmorphism & Rediseño de Plataforma

**Fecha:** 2026-09-27  
**Estado:** Aprobado en discusión preliminar  
**Tipo:** Rediseño Arquitectónico, Visual y Funcional Global  

---

## 1. Resumen y Principios de Diseño

El usuario ha solicitado un **rediseño total y consistente** de la plataforma GT Academy (campeonato disputado en **Gran Turismo 6 para PS3**), erradicando inconsistencias visuales y el aspecto desactualizado o fragmentado.

### Restricciones Estéticas Absolutas
1. **CERO Fondos Oscuros:** Todos los fondos principales serán blanco puro (`#ffffff`) y gris perla sólido (`#f8fafc`).
2. **CERO Efectos Neón ni Resplandores:** No se utilizarán luces brillantes, cianes fluorescentes ni sombras luminosas artificiales.
3. **CERO Degradados:** Superficies con colores planos y sólidos o vidrio blanco translúcido puro.

### Identidad Visual: Light Frosted Glass (Glassmorphism Claro)
Inspirado en la estética oficial diurna de la FIA y los menús minimalistas y elegantes de **Gran Turismo 6**:
- **Superficies de Cristal Blanco:** `background: rgba(255, 255, 255, 0.85)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(0, 0, 0, 0.08)`.
- **Textos:** Títulos en azul carbón profundo (`#0f172a`), subtítulos en gris neutro (`#64748b`).
- **Acentos Sólidos:** Naranja oficial Gran Turismo (`#f28123`), Azul competición plano (`#0284c7`), Oro ámbar plano (`#d97706`).

---

## 2. Alcance de la Transformación

### 2.1 Consistencia Global en Todas las Páginas
La transformación se aplicará a todas las páginas de la plataforma:
- `index.html` (Home reestructurada)
- `paddock.html` (Paddock oficial de pilotos)
- `resultados.html` (Resultados de carreras y telemetría)
- `ranking.html` (Tabla de puntos general)
- `calendario.html` (Calendario de carreras)
- `circuitos.html` / Módulo de circuitos de GT6
- `setup.html` y `conceptos.html` (Hub de reglajes)
- `galeria.html` y `discord.html`

### 2.2 Reestructuración de Redacción del Home (`index.html`)
- Eliminación total y definitiva de cualquier referencia a rangos (Bronce, Plata, Oro, etc.).
- Narrativa épica y directa centrada en el simracing de Gran Turismo 6 en PS3:
  - **Parrilla Abierta & Unificada:** Sin rangos, cada piloto entra con su PSN ID a la sala online.
  - **Reglamento Técnico GT6:** Límite estricto de Puntos de Rendimiento (PR), igualdad mecánica, sin ayudas artificiales (TCS=0, ABS=1).
  - **Telemetría WEC & Paddock:** Tiempos de carrera oficiales, palmarés dinámico y clasificación acumulada.

### 2.3 Módulo de Circuitos Oficiales de Gran Turismo 6
Exhibición visual de los trazados donde se corre el campeonato:
- **Trazados destacados:**
  1. *WeatherTech Raceway Laguna Seca* (EE. UU. - 3.60 km, 11 curvas, sacacorchos icónico).
  2. *Brands Hatch Grand Prix Circuit* (Reino Unido - 3.91 km, 9 curvas, desniveles técnicos).
  3. *Nürburgring GP* (Alemania - 5.15 km, 16 curvas, sector técnico).
  4. *Indianapolis Motor Speedway Road Course* (EE. UU. - 4.19 km, 14 curvas).
  5. *Grand Valley Speedway* (Circuito legendario original de Gran Turismo - 4.94 km).
  6. *Silverstone Grand Prix Circuit* (Reino Unido - 5.89 km, 18 curvas).
  7. *Circuit de Spa-Francorchamps* (Bélgica - 7.00 km, Eau Rouge / Raidillon).
  8. *Circuit de la Sarthe / 24 Heures du Mans* (Francia - 13.63 km).
  9. *Suzuka Circuit* (Japón - 5.81 km, trazado en 8).
  10. *Mount Panorama Motor Racing Circuit / Bathurst* (Australia - 6.21 km).
- **Componentes de cada Circuito:**
  - Silueta vectorial SVG del trazado en trazo negro técnico sólido (`#0f172a`).
  - Bandera nacional y nombre oficial.
  - Datos: Longitud, número de curvas, rondas asignadas en la temporada.

---

## 3. Especificación Técnica de Componentes

### 3.1 Header y Navegación Glassmorphism (`.top-header-area`)
- Fondo: `rgba(255, 255, 255, 0.92)`.
- `backdrop-filter: blur(12px)`.
- Borde inferior: `1px solid rgba(0, 0, 0, 0.08)`.
- Enlaces de navegación: Color `#0f172a`, hover `#f28123`, indicador activo naranja sólido.

### 3.2 Breadcrumb / Hero Unificado (`.breadcrumb-section`)
- Fondo plano diurno o banner sutil con superposición de cristal blanco `rgba(255, 255, 255, 0.85)`.
- Título en `#0f172a` y subtítulo en `#64748b`.

### 3.3 Tarjetas de Cristal (`.gt-glass-card`)
```css
.gt-glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.gt-glass-card:hover {
  transform: translateY(-3px);
  border-color: #f28123;
  box-shadow: 0 8px 24px rgba(242, 129, 35, 0.1);
}
```

### 3.4 Tablas y Filas de Telemetría (`.wec-row`, `.table`)
- Fondo de fila: Blanco puro (`#ffffff`).
- Bordes: `1px solid #e2e8f0`.
- Textos: Tiempos, pilotos y marcas con tipografía de precisión en colores sólidos (`#0f172a`).

---

## 4. Plan de Implementación

1. **Tokens CSS (`assets/css/tournament.css`):**
   - Actualizar el sistema de estilos raíz para eliminar completamente cualquier residuo de modo oscuro, neones o degradados.
   - Definir clases utilitarias de Light Glassmorphism (`.gt-glass-card`, `.gt-glass-nav`, `.gt-glass-toolbar`).
2. **Reescritura de `index.html`:**
   - Nuevo Hero diurno de alto impacto visual.
   - Pilares del campeonato con Glassmorphism blanco.
   - Vitrina interactiva de Circuitos GT6 con siluetas SVG.
   - Botones de acción directa hacia Paddock y Resultados.
3. **Unificación de Páginas Clave:**
   - Aplicar la barra de navegación y tarjetas de cristal blanco en `paddock.html`, `resultados.html`, `ranking.html` y `calendario.html`.
4. **Verificación y Pruebas:**
   - Comprobar consistencia visual en todas las rutas bajo HTTP 200.
   - Validar legibilidad en pantallas móviles y escritorio.
