/*
 * MONOGA OS — LOCAL CONTROL SERVER
 * ================================
 * Zero dependencies. Node stdlib only. ESM.
 *
 * Security model (read this before changing anything):
 *   1. Binds to 127.0.0.1 ONLY. Never 0.0.0.0.
 *   2. The client NEVER sends a filesystem path. It sends a projectId.
 *      The server resolves that id against the registry map. Unknown id -> 400.
 *   3. Static files are served only from inside this folder (11_MONOGA_OS/).
 *      Path traversal (..) -> 403.
 *   4. Mutating verbs (POST/PATCH/DELETE) require header "X-Monoga-OS: 1".
 *      If an Origin header is present, it must be this server's own origin.
 *   5. Process execution uses spawn() with an argument array. A shell string is
 *      never built from client input.
 *
 * Run:  node server.mjs [--port 4788]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Everything this server may read/write lives inside the dashboard folder.
const APP_DIR = __dirname;
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const REGISTRY_FILE = path.join(APP_DIR, 'data', 'projects.js');
const TASKS_FILE = path.join(APP_DIR, 'data', 'tasks.json');

const API_VERSION = 1;
const MAX_BODY_BYTES = 1_000_000;

/* Process launching for `mode: "run"`.
 * The command ALWAYS comes from the registry (data/projects.js), never from
 * the client: the browser only ever sends a projectId and a mode. */
const RUN_READY_TIMEOUT_MS = 90_000;
const RUN_PROBE_INTERVAL_MS = 1_000;

let PORT = 4788;

/* ------------------------------------------------------------------ *
 * Args
 * ------------------------------------------------------------------ */

function parsePort(argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && argv[i + 1]) return Number(argv[i + 1]);
    if (a.startsWith('--port=')) return Number(a.slice('--port='.length));
  }
  return 4788;
}

/* ------------------------------------------------------------------ *
 * Registry (read-only source of truth)
 * ------------------------------------------------------------------ */

function readRegistry() {
  const src = fs.readFileSync(REGISTRY_FILE, 'utf8');
  // Strip is not needed: the file assigns window.MONOGA_OS_DATA itself.
  // We provide a fake `window` and read it back.
  const factory = new Function('window', src + '\n;return window.MONOGA_OS_DATA;');
  const data = factory({});
  if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) {
    throw new Error('registry_invalid');
  }
  return data;
}

function projectMap(data) {
  const map = new Map();
  for (const p of data.projects) {
    if (p && typeof p.id === 'string') map.set(p.id, p);
  }
  return map;
}

function resolveProjectPath(project) {
  return path.resolve(WORKSPACE_ROOT, project.path);
}

/* ------------------------------------------------------------------ *
 * Tasks store (persisted to data/tasks.json)
 * ------------------------------------------------------------------ */

function ensureDataDir() {
  const dir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readTasks() {
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tasks)) return parsed.tasks;
    return [];
  } catch {
    // Missing or corrupt file: treat as empty. Never crash.
    return [];
  }
}

function writeTasks(tasks) {
  ensureDataDir();
  const tmp = TASKS_FILE + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify({ tasks }, null, 2), 'utf8');
  fs.renameSync(tmp, TASKS_FILE);
}

function makeTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      if (!s) return resolve({});
      try {
        resolve(JSON.parse(s));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function ownOrigins() {
  return [`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`];
}

function guardMutation(req, res) {
  const origin = req.headers.origin;
  if (origin && !ownOrigins().includes(origin)) {
    send(res, 403, { ok: false, error: 'bad_origin' });
    return false;
  }
  if (req.headers['x-monoga-os'] !== '1') {
    send(res, 403, { ok: false, error: 'missing_header' });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ *
 * Process launching (argument arrays only, never a shell string)
 * ------------------------------------------------------------------ */

function launchDetached(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.on('error', () => {});
  child.unref();
  return child;
}

/* ------------------------------------------------------------------ *
 * "run" support: launch a project's own dev server and wait for it.
 * ------------------------------------------------------------------ */

// A single probe: anything answering with a non-5xx status is "up enough".
function probeUrl(url) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let req;
    try {
      req = http.get(url, { timeout: 2500 }, (res) => {
        res.resume();
        done(res.statusCode >= 200 && res.statusCode < 500);
      });
    } catch {
      return done(false);
    }
    req.on('error', () => done(false));
    req.on('timeout', () => {
      req.destroy();
      done(false);
    });
  });
}

function waitForUrl(url, deadline) {
  return new Promise((resolve) => {
    const attempt = async () => {
      if (await probeUrl(url)) return resolve(true);
      if (Date.now() > deadline) return resolve(false);
      setTimeout(attempt, RUN_PROBE_INTERVAL_MS);
    };
    attempt();
  });
}

function openBrowser(url) {
  if (process.platform !== 'win32') return;
  try {
    spawn('cmd', ['/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();
  } catch {
    // Best effort: the caller still returns the URL.
  }
}

// Resolves the working directory a project's run command should use.
function resolveRunCwd(project) {
  const run = project.run;
  if (run && typeof run.cwd === 'string' && run.cwd) {
    return path.resolve(WORKSPACE_ROOT, run.cwd);
  }
  return resolveProjectPath(project);
}

async function handleRun(project, res) {
  const run = project.run;
  if (!run || typeof run !== 'object' || typeof run.command !== 'string' || !run.command) {
    return send(res, 400, { ok: false, error: 'run_not_configured' });
  }

  const cwd = resolveRunCwd(project);
  if (!fs.existsSync(cwd)) {
    return send(res, 400, { ok: false, error: 'run_cwd_not_found' });
  }

  const url = typeof run.url === 'string' ? run.url : '';
  const args = Array.isArray(run.args) ? run.args.map(String) : [];

  // Already listening? Do not spawn a second server: just bring it up.
  if (url && (await probeUrl(url))) {
    openBrowser(url);
    return send(res, 200, { ok: true, mode: 'run', url, alreadyRunning: true, opened: 'browser' });
  }

  launchDetached(run.command, args, cwd);

  if (!url) {
    return send(res, 200, { ok: true, mode: 'run', launched: true, opened: 'process' });
  }

  const ready = await waitForUrl(url, Date.now() + RUN_READY_TIMEOUT_MS);
  if (ready) {
    openBrowser(url);
    return send(res, 200, { ok: true, mode: 'run', url, launched: true, ready: true, opened: 'browser' });
  }

  // Honest degradation: the process was started but never answered in time.
  return send(res, 200, {
    ok: true,
    mode: 'run',
    url,
    launched: true,
    ready: false,
    reason: 'timeout',
    opened: 'process'
  });
}

function tryEditor(absPath) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let child;
    try {
      child = spawn('code', [absPath], { detached: true, stdio: 'ignore' });
    } catch {
      return done(false);
    }
    child.once('error', () => done(false));
    child.once('spawn', () => {
      child.unref();
      done(true);
    });
  });
}

async function handleOpen(req, res, body) {
  const projectId = body && body.projectId;
  const mode = body && body.mode;
  if (typeof projectId !== 'string' || !projectId) {
    return send(res, 400, { ok: false, error: 'unknown_project' });
  }
  if (mode !== 'folder' && mode !== 'terminal' && mode !== 'editor' && mode !== 'run') {
    return send(res, 400, { ok: false, error: 'bad_mode' });
  }

  let registry;
  try {
    registry = readRegistry();
  } catch {
    return send(res, 500, { ok: false, error: 'registry_error' });
  }
  const project = projectMap(registry).get(projectId);
  if (!project) {
    return send(res, 400, { ok: false, error: 'unknown_project' });
  }

  // "run" uses the project's own run cwd, so it dispatches before the
  // plain path existence check below.
  if (mode === 'run') {
    return handleRun(project, res);
  }

  const absPath = resolveProjectPath(project);
  if (!fs.existsSync(absPath)) {
    return send(res, 400, { ok: false, error: 'path_not_found' });
  }

  if (mode === 'folder') {
    launchDetached('explorer.exe', [absPath]);
    return send(res, 200, { ok: true, mode, target: absPath, opened: 'explorer' });
  }

  if (mode === 'terminal') {
    // A new PowerShell window already sitting in the resolved directory.
    launchDetached('powershell.exe', ['-NoExit'], absPath);
    return send(res, 200, { ok: true, mode, target: absPath, opened: 'powershell' });
  }

  // mode === 'editor'
  const ok = await tryEditor(absPath);
  if (ok) {
    return send(res, 200, { ok: true, mode, target: absPath, opened: 'editor' });
  }
  // Honest degradation: VS Code CLI is not available.
  launchDetached('explorer.exe', [absPath]);
  return send(res, 200, {
    ok: true,
    mode,
    target: absPath,
    opened: 'explorer',
    fellBack: true,
    reason: 'code_not_found'
  });
}

/* ------------------------------------------------------------------ *
 * Content type map
 * ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return send(res, 400, { ok: false, error: 'bad_path' });
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  const resolved = path.resolve(APP_DIR, '.' + rel);
  const inside = resolved === APP_DIR || resolved.startsWith(APP_DIR + path.sep);
  if (!inside) {
    return send(res, 403, { ok: false, error: 'forbidden' });
  }
  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    return send(res, 404, { ok: false, error: 'not_found' });
  }
  if (stat.isDirectory()) {
    return send(res, 404, { ok: false, error: 'not_found' });
  }
  const ext = path.extname(resolved).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(resolved).pipe(res);
}

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

function handleState(res) {
  let registry;
  try {
    registry = readRegistry();
  } catch {
    return send(res, 500, { ok: false, error: 'registry_error' });
  }

  const projects = registry.projects.map((p) => {
    const absPath = path.resolve(WORKSPACE_ROOT, p.path);
    const exists = fs.existsSync(absPath);
    return Object.assign({}, p, {
      exists,
      hasReadme: exists && fs.existsSync(path.join(absPath, 'README.md')),
      hasHandoff: exists && fs.existsSync(path.join(absPath, 'HANDOFF.md'))
    });
  });

  return send(res, 200, {
    ok: true,
    apiVersion: API_VERSION,
    rootPath: WORKSPACE_ROOT,
    categories: Array.isArray(registry.categories) ? registry.categories : [],
    statuses: registry.statuses && typeof registry.statuses === 'object' ? registry.statuses : {},
    projects,
    clients: Array.isArray(registry.clients) ? registry.clients : [],
    findings: Array.isArray(registry.findings) ? registry.findings : [],
    tasks: readTasks()
  });
}

function handleTasksGet(res) {
  return send(res, 200, { ok: true, tasks: readTasks() });
}

async function handleTasksPost(req, res) {
  const body = await readBody(req);
  if (!body || typeof body !== 'object') {
    return send(res, 400, { ok: false, error: 'bad_body' });
  }
  const projectId = body.projectId;
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  let registry;
  try {
    registry = readRegistry();
  } catch {
    return send(res, 500, { ok: false, error: 'registry_error' });
  }
  if (typeof projectId !== 'string' || !projectMap(registry).has(projectId)) {
    return send(res, 400, { ok: false, error: 'unknown_project' });
  }
  if (!text) {
    return send(res, 400, { ok: false, error: 'empty_text' });
  }

  const task = {
    id: makeTaskId(),
    projectId,
    text,
    status: 'pendiente',
    createdAt: Date.now(),
    doneAt: null
  };
  const tasks = readTasks();
  tasks.push(task);
  try {
    writeTasks(tasks);
  } catch {
    return send(res, 500, { ok: false, error: 'write_failed' });
  }
  return send(res, 201, { ok: true, task });
}

async function handleTasksPatch(req, res) {
  const body = await readBody(req);
  if (!body || typeof body !== 'object' || typeof body.id !== 'string') {
    return send(res, 404, { ok: false, error: 'unknown_task' });
  }
  const tasks = readTasks();
  const task = tasks.find((t) => t.id === body.id);
  if (!task) {
    return send(res, 404, { ok: false, error: 'unknown_task' });
  }

  if (typeof body.status === 'string') {
    if (!['pendiente', 'en_progreso', 'hecha'].includes(body.status)) {
      return send(res, 400, { ok: false, error: 'bad_status' });
    }
    task.status = body.status;
    task.doneAt = body.status === 'hecha' ? (task.doneAt || Date.now()) : null;
  }
  if (typeof body.text === 'string') {
    const text = body.text.trim();
    if (!text) return send(res, 400, { ok: false, error: 'empty_text' });
    task.text = text;
  }

  try {
    writeTasks(tasks);
  } catch {
    return send(res, 500, { ok: false, error: 'write_failed' });
  }
  return send(res, 200, { ok: true, task });
}

async function handleTasksDelete(req, res, query) {
  const id = query.get('id');
  if (!id) {
    return send(res, 404, { ok: false, error: 'unknown_task' });
  }
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) {
    return send(res, 404, { ok: false, error: 'unknown_task' });
  }
  tasks.splice(idx, 1);
  try {
    writeTasks(tasks);
  } catch {
    return send(res, 500, { ok: false, error: 'write_failed' });
  }
  return send(res, 200, { ok: true });
}

function handleFileGet(res, query) {
  const projectId = query.get('projectId');
  const name = query.get('name');
  const allowed = ['README.md', 'HANDOFF.md'];
  if (!projectId || !allowed.includes(name)) {
    return send(res, 400, { ok: false, error: 'bad_request' });
  }
  let registry;
  try {
    registry = readRegistry();
  } catch {
    return send(res, 500, { ok: false, error: 'registry_error' });
  }
  const project = projectMap(registry).get(projectId);
  if (!project) {
    return send(res, 400, { ok: false, error: 'unknown_project' });
  }
  const absPath = path.join(resolveProjectPath(project), name);
  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return send(res, 404, { ok: false, error: 'not_found' });
  }
  const data = fs.readFileSync(absPath, 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store'
  });
  res.end(data);
}

// A handful of navigation documents are readable from control mode. The
// browser cannot request an arbitrary path in the workspace.
const NAV_DOCS = new Set([
  'docs/PROJECT_NAVIGATION.md',
  'docs/COMPANY_OPERATIONS.md',
  'agentes/README.md',
  'agentes/marketing/borradores/contadores-notebooklm.md',
  'agentes/marketing/borradores/odoo-procesos.md'
]);

function handleNavigationDoc(res, query) {
  const rel = query.get('path');
  if (!NAV_DOCS.has(rel)) return send(res, 404, { ok: false, error: 'not_found' });
  const abs = path.resolve(WORKSPACE_ROOT, rel);
  if (!abs.startsWith(WORKSPACE_ROOT + path.sep)) {
    return send(res, 403, { ok: false, error: 'forbidden' });
  }
  let stat;
  try { stat = fs.statSync(abs); } catch { return send(res, 404, { ok: false, error: 'not_found' }); }
  if (!stat.isFile()) return send(res, 404, { ok: false, error: 'not_found' });
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  fs.createReadStream(abs).pipe(res);
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  } catch {
    return send(res, 400, { ok: false, error: 'bad_url' });
  }
  const pathname = url.pathname;
  const method = req.method || 'GET';

  // ---- API ----
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/state') {
      if (method !== 'GET') return send(res, 405, { ok: false, error: 'method_not_allowed' });
      return handleState(res);
    }

    if (pathname === '/api/file') {
      if (method !== 'GET') return send(res, 405, { ok: false, error: 'method_not_allowed' });
      return handleFileGet(res, url.searchParams);
    }

    if (pathname === '/api/doc') {
      if (method !== 'GET') return send(res, 405, { ok: false, error: 'method_not_allowed' });
      return handleNavigationDoc(res, url.searchParams);
    }

    if (pathname === '/api/open') {
      if (method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });
      if (!guardMutation(req, res)) return;
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        return send(res, 400, { ok: false, error: 'bad_body' });
      }
      return handleOpen(req, res, body);
    }

    if (pathname === '/api/tasks') {
      if (method === 'GET') return handleTasksGet(res);
      if (!guardMutation(req, res)) return;
      if (method === 'POST') return handleTasksPost(req, res);
      if (method === 'PATCH') return handleTasksPatch(req, res);
      if (method === 'DELETE') return handleTasksDelete(req, res, url.searchParams);
      return send(res, 405, { ok: false, error: 'method_not_allowed' });
    }

    return send(res, 404, { ok: false, error: 'not_found' });
  }

  // ---- Static (dashboard only) ----
  if (method !== 'GET' && method !== 'HEAD') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  return serveStatic(req, res, pathname);
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function listenOn(port, attempt) {
  // OJO: cada intento registra sus propios handlers y los desarma al perder.
  // Si no se desarman, el 'listening' del intento fallido sigue registrado y
  // dispara igual cuando gana un puerto posterior: imprime y abre el navegador
  // DOS veces, una en el puerto equivocado.
  const onError = (err) => {
    server.removeListener('listening', onListening);
    if (err && err.code === 'EADDRINUSE' && attempt < 20) {
      listenOn(port + 1, attempt + 1);
    } else {
      console.error('Monoga OS: no se pudo iniciar el servidor:', err && err.message);
      process.exit(1);
    }
  };

  const onListening = () => {
    server.removeListener('error', onError);
    // El servidor ya esta arriba: los errores posteriores solo se registran.
    server.on('error', (err) => {
      console.error('Monoga OS: error del servidor:', err && err.message);
    });

    PORT = port;
    console.log('');
    console.log('  Monoga OS — servidor de control');
    console.log('  URL:    http://127.0.0.1:' + PORT + '/');
    console.log('  Raiz:   ' + WORKSPACE_ROOT);
    console.log('  Datos:  ' + REGISTRY_FILE);
    console.log('  Tareas: ' + TASKS_FILE);
    console.log('');
    console.log('  Cerrar esta ventana detiene Monoga OS.');
    console.log('');

    // Abrir el navegador en la URL REAL, recien cuando el puerto quedo fijado.
    // Asi el lanzador no puede apuntar a un puerto equivocado si 4788 estaba ocupado.
    if (!process.argv.includes('--no-open') && process.platform === 'win32') {
      try {
        spawn('cmd', ['/c', 'start', '', 'http://127.0.0.1:' + PORT + '/'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }).unref();
      } catch (_) {
        // Abrir el navegador es best-effort: la URL ya quedo impresa arriba.
      }
    }
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '127.0.0.1');
}

process.on('SIGINT', () => {
  console.log('\nMonoga OS: deteniendo servidor...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
});

PORT = parsePort(process.argv.slice(2));
if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  console.error('Monoga OS: puerto invalido, se usa 4788.');
  PORT = 4788;
}
listenOn(PORT, 0);
