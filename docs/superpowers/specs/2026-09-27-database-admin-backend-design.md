# Especificación de Diseño: Backend SQLite y Panel Administrativo para GT Academy

- **Fecha:** 2026-09-27
- **Proyecto:** GT Academy (`Richpol99/GT`)
- **Estado:** Validado y Aprobado

---

## 1. Resumen y Objetivos

### 1.1 Contexto
Actualmente, la plataforma **GT Academy** es un sitio web estático donde los resultados de las carreras y la tabla general de posiciones están codificados a mano en archivos HTML masivos (`resultados.html` con ~1,400 líneas y `ranking.html` con ~360 líneas). Agregar una nueva carrera o modificar posiciones requiere editar cientos de líneas de marcado HTML de forma propensa a errores.

### 1.2 Objetivos
1. **Desacoplar datos y presentación:** Migrar los datos de carreras y pilotos a una base de datos relacional ligera **SQLite3**.
2. **Soporte de Temporadas:** Migrar todas las carreras y pilotos históricos existentes (RACE 06 a RACE 13) como **Temporada 1** y dejar inicializada la **Temporada 2** lista para nuevas carreras.
3. **Cálculo de Puntos Híbrido:** Calcular automáticamente las posiciones y los puntos reglamentarios (25, 18, 15, 12, 10, 8, 6, 4, 2, 1) permitiendo sobreescritura manual en caso de penalizaciones o puntos de bonificación (pole / vuelta rápida).
4. **Panel de Administración Web (`/admin`):** Interfaz visual protegida con contraseña para registrar nuevas carreras, asignar resultados y actualizar rangos de pilotos sin tocar código.
5. **Consumo Dinámico en Frontend:** Conectar `resultados.html` y `ranking.html` a la API REST para renderizado automático con buscador en tiempo real y selector de temporada.

---

## 2. Arquitectura del Sistema

```
                    ┌──────────────────────────────────────────┐
                    │               Navegador                  │
                    │  (Móvil / Tablet / PC en red local)     │
                    └─────────────────────┬────────────────────┘
                                          │ HTTP / Fetch
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Servidor Backend (Python Flask - Puerto 3000)                                 │
│                                                                              │
│  ├── Servidor Web Estático: index.html, resultados.html, assets/...          │
│  ├── Panel Administrativo:  /admin/ (Login y Dashboard protegido)            │
│  └── API REST:              /api/seasons, /api/races, /api/standings, etc.   │
│                                          │                                   │
│                                          ▼                                   │
│                          Manejador DB (database/db.py)                       │
│                                          │ Consultas parametrizadas (SQLite) │
│                                          ▼                                   │
│                           Base de Datos (database/gt_academy.db)             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos y Esquema SQLite

Ubicación del archivo: `database/gt_academy.db`

### 3.1 Esquema DDL

```sql
-- 1. Tabla de Temporadas
CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,          -- Ej: 'Temporada 1', 'Temporada 2'
    is_active INTEGER NOT NULL DEFAULT 1, -- 1 = Activa, 0 = Archivada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Pilotos
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    psn_id TEXT NOT NULL UNIQUE,        -- Ej: 'TempessT-', 'richpol99'
    country TEXT NOT NULL DEFAULT 'pdi', -- Nombre del archivo de bandera en assets/country/
    rank TEXT NOT NULL DEFAULT 'bronce', -- 'bronce', 'plata', 'oro', 'platino', 'diamante'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Carreras
CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL,
    round_number INTEGER NOT NULL,      -- Ej: 1, 2, 6, 13
    title TEXT NOT NULL,                -- Ej: 'RACE 13 FORD GT 2006'
    car TEXT NOT NULL,                  -- Ej: 'FORD GT 2006'
    track TEXT DEFAULT '',              -- Circuito (opcional)
    race_date TEXT DEFAULT '',          -- Fecha de la carrera
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- 4. Tabla de Resultados por Carrera
CREATE TABLE IF NOT EXISTS race_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    race_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    position INTEGER NOT NULL,          -- 1, 2, 3...
    points INTEGER NOT NULL DEFAULT 0,  -- Puntos calculados o ajustados
    is_pole INTEGER DEFAULT 0,          -- 1 = Pole position
    is_fastest_lap INTEGER DEFAULT 0,   -- 1 = Vuelta rápida
    penalty_pts INTEGER DEFAULT 0,      -- Puntos descontados por penalización
    notes TEXT DEFAULT '',
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    UNIQUE(race_id, driver_id),
    UNIQUE(race_id, position)
);

-- 5. Tabla de Usuarios Administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vista para Tabla General de Posiciones (Standings)
CREATE VIEW IF NOT EXISTS v_standings AS
SELECT 
    d.id AS driver_id,
    d.psn_id,
    d.country,
    d.rank,
    r.season_id,
    COALESCE(SUM(rr.points), 0) AS total_points,
    COUNT(rr.id) AS races_completed,
    SUM(CASE WHEN rr.position = 1 THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN rr.position BETWEEN 1 AND 3 THEN 1 ELSE 0 END) AS podiums
FROM drivers d
CROSS JOIN seasons s
LEFT JOIN races r ON r.season_id = s.id
LEFT JOIN race_results rr ON rr.race_id = r.id AND rr.driver_id = d.id
GROUP BY d.id, s.id;
```

---

## 4. Migración de Datos Históricos

Un script de migración dedicado (`database/migrate_html.py`):
1. **Analiza sintácticamente `resultados.html`:** Extrae las 8 carreras históricas (RACE 06 a RACE 13), los nombres de los pilotos, sus banderas de país y puntos asignados.
2. **Analiza sintácticamente `ranking.html` y `rangos.html`:** Extrae los rangos asignados (Bronce, Plata, Oro, etc.) a cada piloto.
3. **Crea la Temporada 1:** Inserta los pilotos únicos en `drivers`, registra las carreras en `races` y vincula cada posición en `race_results`.
4. **Crea la Temporada 2:** Inserta la *Temporada 2* con estado activo (`is_active = 1`).

---

## 5. Endpoints de la API REST

### 5.1 Endpoints Públicos

- `GET /api/seasons`: Devuelve lista de temporadas `[{id, name, is_active}]`.
- `GET /api/seasons/<id>/standings`: Devuelve la tabla de posiciones general ordenada por puntos, victorias y podios.
- `GET /api/seasons/<id>/races`: Devuelve las carreras disputadas de esa temporada con sus resultados detallados.
- `GET /api/drivers?q=<busqueda>`: Devuelve lista de pilotos filtrados por nombre o país.
- `GET /api/drivers/<psn_id>`: Ficha completa de un piloto con su historial de carreras y rango.

### 5.2 Endpoints Administrativos (Autenticación Requerida)

- `POST /api/admin/login`: Recibe `{username, password}`. Valida hash seguro y genera cookie de sesión HTTP-only firmada.
- `POST /api/admin/logout`: Invalida la sesión actual.
- `GET /api/admin/check-auth`: Verifica si la sesión actual es válida.
- `POST /api/admin/races`: Registra una nueva carrera completa de forma atómica:
  ```json
  {
    "season_id": 2,
    "round_number": 1,
    "title": "RACE 01 Nürburgring GP",
    "car": "NISSAN GT-R NISMO 2014",
    "track": "Nürburgring GP",
    "results": [
      { "psn_id": "richpol99", "country": "mexico", "position": 1, "points": 25, "is_pole": 1 },
      { "psn_id": "TempessT-", "country": "luxemburgo", "position": 2, "points": 18, "is_pole": 0 }
    ]
  }
  ```
- `PUT /api/admin/races/<id>`: Actualiza o corrige una carrera y sus posiciones.
- `DELETE /api/admin/races/<id>`: Elimina una carrera y recalcula automáticamente la tabla.
- `POST /api/admin/drivers`: Crea un nuevo piloto o actualiza su rango (`bronce`, `plata`, etc.) y país.

---

## 6. Panel de Administración Web (`/admin`)

Ubicación: `admin/`
- **Autenticación:** Formulario de inicio de sesión con feedback visual.
- **Barra de navegación administrativa:**
  - Pestaña **Carreras:** Ver carreras de la temporada, botón "Registrar Carrera" con modal dinámico.
  - Pestaña **Pilotos:** Lista editable de todos los pilotos con selector de rango y país.
  - Pestaña **Temporadas:** Cambiar temporada activa o crear nueva temporada.
- **Formulario de Registro de Carrera Híbrido:**
  - Campos de cabecera: Temporada, Título, Auto, Circuito.
  - Tabla de posiciones dinámica:
    - Autocompletado de pilotos existentes o opción rápida de crear uno nuevo.
    - Los puntos se autocompletan automáticamente por posición según el baremo estándar:
      * 1º: 25 pts | 2º: 18 pts | 3º: 15 pts | 4º: 12 pts | 5º: 10 pts
      * 6º: 8 pts  | 7º: 6 pts  | 8º: 4 pts  | 9º: 2 pts  | 10º: 1 pt
    - Casilla editable para modificar puntos manualmente en caso de penalización (-5 pts) o bonos (+1 pt vuelta rápida).

---

## 7. Integración Frontend Pública

- Se crea el script modular `assets/js/tournament.js`.
- En [`ranking.html`](file:///data/data/com.termux/files/home/gt-academy/ranking.html):
  - Añade selector desplegable de Temporada (Temporada 1 / Temporada 2).
  - Añade buscador en vivo por ID de PSN.
  - Carga los datos desde `/api/seasons/<id>/standings` y renderiza las filas de la tabla con banderas y estilos.
- En [`resultados.html`](file:///data/data/com.termux/files/home/gt-academy/resultados.html):
  - Añade selector de Temporada y selector de Carrera (pestañas o menú) para ver rápidamente cualquier carrera sin scrollear 1,400 líneas.
  - Carga los datos desde `/api/seasons/<id>/races`.
- **Degradación Grácil (Fallback):** Si el servidor backend no responde o se abre como archivo estático fuera de red, se mantiene una copia de respaldo en JSON para que las tablas sigan viéndose.

---

## 8. Seguridad y Manejo de Errores

1. **Almacenamiento seguro de contraseñas:** Uso de `hashlib.pbkdf2_hmac('sha256', ...)` con salt criptográfico de 32 bytes y 100,000 iteraciones.
2. **Prevención de Inyección SQL:** Todas las consultas a SQLite se ejecutan con tuplas de parámetros (`cursor.execute("SELECT ... WHERE id = ?", (id,))`).
3. **Transaccionalidad:** Los registros de carreras y resultados se procesan en bloques de transacción `try / except` con `conn.commit()` y `conn.rollback()` para evitar inconsistencias.
4. **Manejo de Errores HTTP:** Respuestas JSON estandarizadas `{ "error": "Mensaje detallado" }` con códigos HTTP adecuados (400, 401, 404, 500).

---

## 9. Plan de Pruebas y Verificación

1. **Prueba de Migración:** Ejecutar `migrate_html.py` y verificar que las 8 carreras y ~30 pilotos coincidan exactamente con los registros actuales de `resultados.html`.
2. **Prueba de API:** Comprobar mediante curl o cliente HTTP las respuestas de los endpoints `/api/seasons`, `/api/seasons/1/standings` y `/api/drivers`.
3. **Prueba de Login Admin:** Iniciar sesión con credenciales correctas e incorrectas en `/admin/login.html`.
4. **Prueba de Carrera Nueva:** Registrar una carrera de prueba en la Temporada 2 desde el panel, verificar que los puntos se calculen de forma híbrida y que la tabla general se actualice al instante.
5. **Prueba de Interfaz Pública:** Cargar `ranking.html` y `resultados.html` en el navegador local (`http://localhost:3000`), probar el buscador en tiempo real y el cambio de temporadas.
