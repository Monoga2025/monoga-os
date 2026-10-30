# Monoga OS — Dashboard y panel de control

**Navegación actualizada el 2026-10-11.** También puedes iniciar desde [ABRIR MONOGA.cmd](../ABRIR%20MONOGA.cmd) en la raíz. La sección «En qué trabajar ahora» propone cuatro acciones a partir de documentos locales; no las guarda como tareas ni confirma su vigencia. El [mapa de proyectos](../docs/PROJECT_NAVIGATION.md) explica áreas, rutas y ambigüedades. El buscador, las etiquetas de área y el filtro de estado permiten encontrar proyectos; en modo lectura hay enlaces a carpetas y guías, y en modo control se conservan los botones locales para abrir proyectos y administrar tareas. El registro nació como inventario del 2026-09-29 y sus estados no son actividad en vivo.

Panel administrativo autocontenido que dibuja el registro de Monoga OS y, en modo
control, permite abrir proyectos y administrar tareas guardadas en disco.

## Dos modos de uso

### 1. Modo control (recomendado)

Doble clic en **`Monoga OS.cmd`**. Eso arranca el servidor local y abre el navegador
en `http://127.0.0.1:4788/`.

En este modo el panel puede:

- Abrir la carpeta, un terminal o el editor de cada proyecto.
- Crear, marcar y borrar tareas por proyecto, persistidas en `data/tasks.json`.
- Consultar "Mis pendientes" agregando todas las tareas.
- Mostrar si un proyecto existe en disco y si tiene `README.md` / `HANDOFF.md`.

Cerrar la ventana de la consola detiene Monoga OS.

### 2. Modo lectura (fallback)

Doble clic en `index.html` (o abrirlo desde `file://`). No necesita servidor, build
ni conexión. El panel dibuja el registro y deshabilita las acciones de escritura,
mostrando un aviso claro. Un `fetch('/api/state')` con timeout de 1.5 s decide el modo;
si falla, la página igual se dibuja (nunca queda en blanco).

## Sin dependencias

- Cero CDN, cero fuentes externas, cero librerías de iconos, cero analítica.
- Solo HTML, un `<style>` embebido y JavaScript vanilla.
- Los iconos son SVG inline dibujados en el propio archivo.
- El servidor usa únicamente módulos de Node (`node:http`, `node:fs`, `node:path`,
  `node:child_process`, `node:url`). No hay `package.json` ni instalación.

## Fuente de datos

El dashboard lee `data/projects.js`, que define `window.MONOGA_OS_DATA`. Ese archivo es la
única fuente de verdad y **no se modifica desde este dashboard**: solo se lee. El servidor
lo interpreta con `new Function('window', src + '; return window.MONOGA_OS_DATA;')({})` y
lo vuelve a leer en cada llamada a `/api/state`, de modo que editar el registro se refleja
sin reiniciar.

Estructura esperada: `meta`, `categories[]`, `statuses{}`, `projects[]`, `clients[]`,
`tasks[]`, `notes[]`, `findings[]`.

### Reglas de honestidad de datos

- Las categorías son **etiquetas**, no carpetas. Un proyecto aparece en todas las categorías
  que declara. Los conteos se calculan en runtime recorriendo el array `categories` de cada
  proyecto; nunca están hardcodeados.
- Las tareas del registro siguen vacías a propósito. Las tareas del panel viven aparte, en
  `data/tasks.json`, y se muestran solo si existen. No se inventan filas.
- Un `status` desconocido se muestra con su valor crudo y color neutro.
- Los proyectos con `kind: "archive"` se de-emfatizan visualmente.
- Si `window.MONOGA_OS_DATA` falta o está malformado, la página muestra un mensaje de error
  claro en lugar de quedar en blanco.
- Si un proyecto no existe en disco, se muestra el chip **No encontrado en disco**.

## El servidor local

`server.mjs` — Node ESM, sin dependencias.

```
node server.mjs            # puerto por defecto 4788
node server.mjs --port 5000
```

Si el puerto está ocupado, sube al siguiente disponible (hasta 20 intentos) e imprime la
URL real. `Ctrl+C` lo detiene de forma limpia.

### Modelo de seguridad

1. Escucha **solo en 127.0.0.1** (nunca 0.0.0.0).
2. **El cliente nunca envía rutas de archivo.** Envía un `projectId`; el servidor lo
   resuelve contra el registro. Cualquier id desconocido responde `400 unknown_project`.
3. Los archivos estáticos se sirven solo desde dentro de `11_MONOGA_OS/`. El path
   traversal (`..`, `%2e%2e`, `..%2f`) responde `403`.
4. Las peticiones mutantes (`POST`/`PATCH`/`DELETE`) exigen el header `X-Monoga-OS: 1`.
   Si llega un header `Origin` distinto al del propio servidor, responde
   `403 bad_origin`. No se envían headers CORS.
5. La ejecución de procesos usa `spawn`/`execFile` con arrays de argumentos. Nunca se
   construye una línea de comandos con entrada del cliente.

### API (todas las respuestas son JSON)

| Método | Ruta | Cuerpo | Éxito | Errores |
| --- | --- | --- | --- | --- |
| GET | `/api/state` | — | `200 {ok, apiVersion:1, rootPath, categories, statuses, projects, clients, findings, tasks}` | `500` |
| POST | `/api/open` | `{projectId, mode}` | `200 {ok, mode, target, opened}` | `400 unknown_project` / `path_not_found` |
| GET | `/api/tasks` | — | `200 {ok, tasks}` | `500` |
| POST | `/api/tasks` | `{projectId, text}` | `201 {ok, task}` | `400 unknown_project` / `empty_text` |
| PATCH | `/api/tasks` | `{id, status?}` o `{id, text?}` | `200 {ok, task}` | `404 unknown_task` |
| DELETE | `/api/tasks` | query `?id=` | `200 {ok}` | `404 unknown_task` |
| GET | `/api/file` | query `?projectId=&name=` (`name` ∈ `README.md`, `HANDOFF.md`) | `200 text/plain` | `400` / `404` |

- `mode` ∈ `"folder" | "terminal" | "editor"`.
  - `folder` → `explorer.exe` (reporta `opened:"explorer"`).
  - `terminal` → nueva ventana de PowerShell ya situada en la carpeta (`opened:"powershell"`).
  - `editor` → intenta `code`; si no existe, cae a `explorer.exe` y reporta
    `opened:"explorer", fellBack:true, reason:"code_not_found"` (degradación honesta).
- El path absoluto resuelto se valida con `fs.existsSync` antes de lanzar nada.
- En `/api/state` cada proyecto se amplía con `exists`, `hasReadme` y `hasHandoff`.
- `/api/file` es de solo lectura y existe para poder ver `README.md`/`HANDOFF.md` desde el
  panel (el navegador bloquea abrir `file://` desde un origen `http://`).

### Forma de una tarea

```json
{ "id": "…", "projectId": "jarvis", "text": "…",
  "status": "pendiente | en_progreso | hecha",
  "createdAt": 1234567890, "doneAt": null }
```

`id` es corto y único (`Date.now().toString(36)` + sufijo aleatorio). El archivo se escribe
de forma atómica (temporal + `rename`). Si `data/tasks.json` falta o está corrupto se trata
como vacío y no rompe nada.

## Vistas

| Elemento de menú | Contenido |
| --- | --- |
| Inicio | Saludo, hero, tarjetas de categorías, pendientes, horario, clientes, notas, salud del workspace y lista completa de proyectos |
| Proyectos | Lista completa con filtro por categoría y buscador |
| Carpetas | Proyectos de tipo `container` con sus hijos |
| Mis pendientes | Tareas reales (o estado vacío honesto) |
| Horario | Cuadrícula semanal vacía (sin bloques cargados) |
| Clientes | Los clientes reales del registro |
| Automatizaciones / IA Tools / YouTube Marca Personal | Lista pre-filtrada por esa categoría |
| Documentación | Hallazgos de la auditoría y ruta del archivo del registro |
| Configuración | Metadatos de `meta` y el aviso de procedencia |

## Funciones activas

- Buscador superior: filtra la lista de proyectos mientras se escribe.
- Tarjetas de categoría: filtran la lista y desplazan hacia ella.
- Chip "Todas": limpia el filtro activo.
- Botón de tema: alterna claro/oscuro y recuerda la elección en el navegador.
- Menú lateral: cambia de vista con `aria-current` en el elemento activo.
- Modo control: botones `Abrir carpeta`, `Abrir terminal`, `Abrir editor`, expansor
  `Tareas (N)` por proyecto con input `Nueva tarea para <nombre>`, y pendientes agregados.

## Responsive y accesibilidad

- El menú lateral colapsa por debajo de 900px con un botón de menú y fondo oscurecido.
- Las cuadrículas pasan a una columna en móvil.
- Navegación con elementos `<button>` reales, estados de foco visibles y contraste suficiente.

## Formato de tamaños

`sizeMB` se muestra como `X MB` cuando es menor a 1024; en caso contrario, `X.X GB`.
