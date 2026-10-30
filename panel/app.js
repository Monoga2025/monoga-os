const root = document.documentElement;
const dialog = document.getElementById('detail-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogEyebrow = document.getElementById('dialog-eyebrow');
const dialogBody = document.getElementById('dialog-body');
const toast = document.getElementById('toast');
let toastTimer;

const links = {
  agents: '../README.md',
  editorial: '../evidencia-medicion/salidas/muro-editorial.html',
  workbook: '../evidencia-medicion/salidas/mapa-editorial.xlsx',
  accountant: '../marketing/borradores/contadores-notebooklm.md',
  odoo: '../marketing/borradores/odoo-procesos.md',
  evidence: '../evidencia-medicion/README.md'
};

const topics = {
  priority: { eyebrow: 'Decisión actual', title: 'Definir · Validar · Autorizar', body: `<p>El siguiente paso seguro es elegir una tarea concreta, confirmar que ocurre en un proceso real y acordar qué prueba permitiría decidir. Daniel conserva la aprobación de oferta, precio, acceso y publicación.</p><p class="dialog-note">Las tarjetas y cifras de esta pantalla son demostrativas. No representan resultados ni ingresos observados de Monoga.</p><a href="${links.agents}">Abrir arquitectura de agentes</a>` },
  profile: { eyebrow: 'Perfil local', title: 'Daniel · Administrador', body: '<p>Esta página usa una inicial ilustrativa. No hay cuenta, inicio de sesión ni sincronización con servicios.</p><p>Los estados de la lista de tareas se guardan únicamente en este navegador cuando el almacenamiento local está disponible.</p>' },
  direction: { eyebrow: 'Pilar', title: 'Dirección', body: '<p>Define un problema concreto de adopción de IA, pide evidencia y elige el siguiente trabajo pequeño. Daniel aprueba decisiones comerciales y cambios externos.</p><a href="../direccion/README.md">Leer guía de dirección</a>' },
  research: { eyebrow: 'Pilar', title: 'Investigación de clientes', body: `<p>Las diez preguntas de los dos perfiles son guías de entrevista. Los dolores y las objeciones del mapa son hipótesis, no hallazgos de compradores.</p><a href="${links.editorial}">Abrir muro editorial</a>` },
  marketing: { eyebrow: 'Pilar', title: 'Marketing propio', body: '<p>El flujo convierte una pregunta investigada en contenido educativo para Monoga. El video es un canal propio; no se ofrece edición audiovisual a terceros desde este panel.</p><a href="../marketing/README.md">Leer equipo de marketing</a>' },
  sales: { eyebrow: 'Pilar', title: 'Ofertas y ventas', body: '<p>Los dos pilotos de ejemplo están pendientes de validación. No hay precio, plazo o resultado comercial comprobado en las tarjetas.</p><a href="../ofertas-ventas/README.md">Leer guía de ofertas</a>' },
  delivery: { eyebrow: 'Pilar', title: 'Entrega de IA', body: '<p>El ejemplo documental exige cotejo de fuentes originales y supervisión profesional. El ejemplo Odoo exige verificar versión, plan, permisos y reglas antes de una integración.</p><a href="../entrega-ia/README.md">Leer guía de entrega</a>' },
  finance: { eyebrow: 'Pilar', title: 'Finanzas', body: `<p>El importe en la tarjeta es parte de la referencia visual y no representa margen de Monoga. El costo de una brecha requiere horas, frecuencia y costos observados en un periodo común.</p><a href="${links.workbook}">Abrir Excel con escenario pendiente</a>` },
  evidence: { eyebrow: 'Pilar', title: 'Evidencia y medición', body: `<p>Una cita confirma qué dice una fuente documentada, no que un cliente tenga la función habilitada o que una norma aplique a su caso. El libro conserva URLs, fechas y estados.</p><a href="${links.evidence}">Leer guía de evidencia</a>` },
  workflow: { eyebrow: 'Método', title: 'Flujo de trabajo de Marketing', body: '<p>Investigar una tarea real, planear la pieza, criticar afirmaciones, revisar el plan, crear guion y visuales, y validar las fuentes. Se permiten como máximo dos pases de crítica sobre la misma pieza; un desacuerdo restante se eleva a Daniel.</p><p class="dialog-note">Los números de tareas dibujados en el flujo son cifras de ejemplo de la maqueta.</p><a href="../marketing/equipo/orquestador-marketing.md">Abrir contrato del orquestador</a>' },
  aida: { eyebrow: 'Estructura editorial', title: 'AIDA en los contenidos', body: '<p><strong>Atención:</strong> preguntar por una tarea concreta. <strong>Interés:</strong> explicar el mecanismo con fuentes. <strong>Deseo:</strong> proponer un beneficio que pueda comprobarse. <strong>Acción:</strong> invitar a una conversación voluntaria.</p><p class="dialog-note">Los porcentajes de la pantalla son ejemplos visuales; AIDA no garantiza conversiones.</p><a href="../marketing/equipo/guionista-aida.md">Leer protocolo del guionista</a>' },
  matrix: { eyebrow: 'Hipótesis de contenido', title: 'Dolores, beneficios y soluciones', body: `<p>La búsqueda repetida de normas y la duplicación de datos en Odoo son situaciones por investigar. El beneficio y la solución propuesta requieren observación, prueba y revisión humana.</p><a href="${links.editorial}">Revisar los diez temas editoriales</a>` },
  offers: { eyebrow: 'Pilotos propuestos', title: 'Dos formas de comprobar valor', body: `<p><strong>Consulta documental:</strong> inventario de fuentes públicas, preguntas de prueba y cotejo profesional.</p><p><strong>Diagnóstico Odoo:</strong> mapa de un proceso, opciones según instancia y criterios para una prueba posterior.</p><p>No hay cotizaciones ni integraciones activas acreditadas por esta página.</p><a href="${links.workbook}">Abrir libro de ofertas y fuentes</a>` },
  accountant: { eyebrow: 'Piloto por validar', title: 'Contadores · DIAN + NotebookLM', body: `<p>Un taller piloto puede reunir documentos públicos, ensayar cinco preguntas y abrir cada fuente original. Antes de usar una respuesta, revisar vigencia, modificaciones, anexos y pertinencia con el profesional responsable.</p><ul><li>Entregable: inventario fechado de fuentes y anexos.</li><li>Entregable: cuaderno demostrativo con documentos permitidos.</li><li>Entregable: protocolo de cotejo humano.</li></ul><p class="dialog-note">No hay asesoría tributaria definitiva ni actualización automática garantizada de la web DIAN.</p><a href="${links.accountant}">Leer guion de ejemplo</a>` },
  odoo: { eyebrow: 'Piloto por validar', title: 'Empresas con Odoo · diagnóstico', body: `<p>Primero se mapea qué evento crea el dato, a dónde debe llegar, quién aprueba cada acción y cómo se manejan excepciones. La factibilidad técnica depende de versión, edición, plan, aplicaciones y permisos reales.</p><ul><li>Entregable: mapa del proceso y responsables.</li><li>Entregable: opciones nativas o externas con límites.</li><li>Entregable: criterios de prueba y reversión.</li></ul><p class="dialog-note">El diagnóstico no solicita credenciales ni conecta una instancia real.</p><a href="${links.odoo}">Leer guion de ejemplo</a>` },
  documents: { eyebrow: 'Archivos locales', title: 'Documentos del proyecto', body: `<p>Estas rutas abren archivos del mismo proyecto; no se descargan datos de un servicio.</p><ul><li><a href="${links.agents}">Arquitectura de agentes</a></li><li><a href="${links.editorial}">Muro editorial</a></li><li><a href="${links.workbook}">Libro Excel</a></li><li><a href="${links.accountant}">Guion de contadores</a></li><li><a href="${links.odoo}">Guion de Odoo</a></li></ul>` },
  settings: { eyebrow: 'Preferencias locales', title: 'Configuración del panel', body: '<p>El botón de sol cambia entre tema claro y oscuro. La búsqueda filtra tarjetas y filas de este panel. Solo la lista de tareas y la preferencia de tema pueden persistir en este navegador.</p><p>No hay servidor, cuenta conectada, notificaciones reales ni actualización automática de métricas.</p>' }
};

const stageNotes = {
  investigar: ['Investigar', 'Definir la pregunta, abrir fuentes originales y preparar entrevistas. Registrar qué es observación y qué sigue como hipótesis.'],
  planear: ['Planear', 'Elegir una audiencia, un tramo editorial, una idea y una acción voluntaria.'],
  criticar: ['Criticar', 'Señalar frases sin evidencia, promesas exageradas y confusiones entre capacidad documentada y realidad del comprador.'],
  revisar: ['Revisar', 'Corregir los hallazgos concretos. El segundo pase solo procede ante un riesgo material restante.'],
  crear: ['Crear', 'Escribir AIDA, editar oralidad y preparar visuales con datos públicos o sintéticos.'],
  validar: ['Validar', 'Cotejar citas, oferta y capturas antes de entregar el borrador a Daniel para su decisión.']
};

function showDialog(key) {
  const item = topics[key];
  if (!item) return;
  dialogEyebrow.textContent = item.eyebrow;
  dialogTitle.textContent = item.title;
  dialogBody.innerHTML = item.body;
  if (dialog.open) dialog.close();
  dialog.showModal();
}

document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.dialog === 'tasks') showTasks();
  else showDialog(button.dataset.dialog);
}));
document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
  const [title, note] = stageNotes[button.dataset.stage];
  dialogEyebrow.textContent = 'Etapa del flujo';
  dialogTitle.textContent = title;
  dialogBody.innerHTML = `<p>${note}</p><p class="dialog-note">La cantidad de tareas de la tarjeta es demostrativa. Para marcar trabajo local, abre “Tareas” en la barra lateral.</p>`;
  dialog.showModal();
}));
document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

function storageGet(key, fallback) {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value; }
  catch { return fallback; }
}
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { showToast('El navegador no permite guardar este estado localmente.'); } }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000); }

const tasks = [
  ['fuente-contador','Confirmar una consulta repetida con un contador'],
  ['anexos-dian','Abrir norma, modificaciones y anexos DIAN pertinentes'],
  ['datos-odoo','Preguntar versión, plan y responsable del proceso Odoo'],
  ['mapa-odoo','Dibujar evento, campos, aprobación y excepción'],
  ['revisar-guiones','Revisar con Daniel los dos guiones de ejemplo'],
  ['aprobar-pilotos','Decidir si alguno de los pilotos merece cotización']
];
let taskState;
try { taskState = JSON.parse(storageGet('monoga-panel-tasks-v1', '{}')) || {}; } catch { taskState = {}; }
function showTasks() {
  dialogEyebrow.textContent = 'Trabajo local';
  dialogTitle.textContent = 'Tareas para validar';
  dialogBody.innerHTML = '<p>Esta lista es un recordatorio local. Marcar una casilla no prueba que una tarea se haya realizado fuera del panel.</p><ul class="task-list" id="task-list"></ul><p class="dialog-note">El estado se guarda solo en este navegador cuando el almacenamiento local está disponible.</p>';
  const list = document.getElementById('task-list');
  tasks.forEach(([id, label]) => {
    const li = document.createElement('li');
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = Boolean(taskState[id]);
    input.setAttribute('aria-label', label);
    const span = document.createElement('span'); span.textContent = label;
    input.addEventListener('change', () => { taskState[id] = input.checked; storageSet('monoga-panel-tasks-v1', JSON.stringify(taskState)); showToast(input.checked ? 'Marcado en este navegador.' : 'Marca local retirada.'); });
    wrapper.append(input, span); li.append(wrapper); list.append(li);
  });
  if (dialog.open) dialog.close();
  dialog.showModal();
}

const themeButton = document.getElementById('theme-toggle');
function setTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
  themeButton.querySelector('use').setAttribute('href', theme === 'dark' ? '#i-moon' : '#i-sun');
  storageSet('monoga-panel-theme-v1', theme);
}
setTheme(storageGet('monoga-panel-theme-v1', 'light') === 'dark' ? 'dark' : 'light');
themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

const notificationsButton = document.getElementById('notifications-button');
const notifications = document.getElementById('notifications');
function closeNotifications() { notifications.hidden = true; notificationsButton.setAttribute('aria-expanded', 'false'); }
notificationsButton.addEventListener('click', () => { const opening = notifications.hidden; notifications.hidden = !opening; notificationsButton.setAttribute('aria-expanded', String(opening)); });
document.addEventListener('click', event => { if (!notifications.contains(event.target) && !notificationsButton.contains(event.target)) closeNotifications(); });

const search = document.getElementById('search');
const searchable = [...document.querySelectorAll('[data-search]')];
function filterDashboard() {
  const query = search.value.trim().toLocaleLowerCase('es');
  let shown = 0;
  searchable.forEach(node => {
    const match = !query || (node.dataset.search + ' ' + node.textContent).toLocaleLowerCase('es').includes(query);
    node.hidden = !match;
    if (match) shown++;
  });
  document.getElementById('search-empty').hidden = !query || shown > 0;
}
search.addEventListener('input', filterDashboard);
search.addEventListener('keydown', event => { if (event.key === 'Escape') { search.value = ''; filterDashboard(); search.blur(); } });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName) && !dialog.open) { event.preventDefault(); search.focus(); } if (event.key === 'Escape') closeNotifications(); });

document.querySelectorAll('.nav-item[href^="#"]').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
}));

const metricExamples = {
  '6': ['320','24','€72.4K','+28%','+33%','+41%'],
  '3': ['168','11','€36.1K','+16%','+18%','+21%'],
  '1': ['54','4','€11.8K','+8%','+9%','+12%']
};
document.getElementById('metric-period').addEventListener('change', event => {
  const values = metricExamples[event.target.value];
  ['leads','pilots','income'].forEach((key, index) => document.querySelector(`[data-metric="${key}"]`).textContent = values[index]);
  document.querySelectorAll('.metric-row em').forEach((node, index) => node.textContent = `↑  ${values[index + 3]}`);
  showToast('Periodo de cifras demostrativas actualizado.');
});
