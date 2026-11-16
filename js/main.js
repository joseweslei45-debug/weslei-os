import {
  abrir, alternarTarefa, aoMudar, fecharTodas, janelasAbertas, listarApps, registrar,
} from './os.js';
import sobre from './apps/sobre.js';
import terminal from './apps/terminal.js';
import agenda from './apps/agenda.js';
import video from './apps/video.js';
import transcritor from './apps/transcritor.js';
import links from './apps/links.js';
import financas from './apps/financas.js';

[sobre, terminal, agenda, video, transcritor, links, financas].forEach(registrar);

const $ = (id) => document.getElementById(id);

// ---------- Ícones da área de trabalho e menu iniciar ----------
function montarIcones() {
  $('icones').replaceChildren(
    ...listarApps().map((app) => {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'icone-app';
      botao.innerHTML = '<span class="emoji" aria-hidden="true"></span><span></span>';
      botao.firstChild.textContent = app.icone;
      botao.lastChild.textContent = app.titulo;
      botao.title = app.descricao;
      botao.addEventListener('click', () => abrir(app.id));
      li.append(botao);
      return li;
    }),
  );

  $('menu-apps').replaceChildren(
    ...listarApps().map((app) => {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.innerHTML = '<span class="emoji" aria-hidden="true"></span><span><strong></strong><small></small></span>';
      botao.querySelector('.emoji').textContent = app.icone;
      botao.querySelector('strong').textContent = app.titulo;
      botao.querySelector('small').textContent = app.descricao;
      botao.addEventListener('click', () => {
        fecharMenu();
        abrir(app.id);
      });
      li.append(botao);
      return li;
    }),
  );
}

// ---------- Barra de tarefas ----------
function renderTarefas() {
  $('tarefas').replaceChildren(
    ...janelasAbertas().map((j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tarefa' + (j.ativa ? ' ativa' : '') + (j.minimizada ? ' minimizada' : '');
      b.innerHTML = '<span aria-hidden="true"></span><span></span>';
      b.firstChild.textContent = j.app.icone;
      b.lastChild.textContent = j.app.titulo;
      b.addEventListener('click', () => alternarTarefa(j.id));
      return b;
    }),
  );
}
aoMudar(renderTarefas);

// ---------- Menu iniciar ----------
const menu = $('menu-iniciar');
function fecharMenu() {
  menu.hidden = true;
  $('btn-iniciar').setAttribute('aria-expanded', 'false');
}
$('btn-iniciar').addEventListener('click', (e) => {
  e.stopPropagation();
  menu.hidden = !menu.hidden;
  $('btn-iniciar').setAttribute('aria-expanded', String(!menu.hidden));
});
document.addEventListener('click', (e) => {
  if (!menu.hidden && !menu.contains(e.target)) fecharMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharMenu();
});

// ---------- Relógio (horário de Quixadá) ----------
const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' });
function tique() {
  const agora = new Date();
  $('relogio').textContent = formatoHora.format(agora);
  $('relogio').title = formatoData.format(agora);
}
tique();
setInterval(tique, 10000);

// ---------- Desligar / ligar ----------
$('btn-desligar').addEventListener('click', () => {
  fecharMenu();
  fecharTodas();
  $('desligado').hidden = false;
});
$('btn-religar').addEventListener('click', () => {
  $('desligado').hidden = true;
  iniciar(true);
});

// ---------- Boot ----------
const LINHAS_BOOT = [
  'WOS BIOS v2.6 — Quixadá/CE, Brasil',
  'Verificando café... <span class="ok">OK</span>',
  '',
  '[ <span class="ok">OK</span> ] Carregando núcleo JavaScript (ES Modules)',
  '[ <span class="ok">OK</span> ] Montando /projetos',
  '[ <span class="ok">OK</span> ] agenda-inteligente-api ......... Java · Spring Boot',
  '[ <span class="ok">OK</span> ] video-pipeline ................. Node.js · BullMQ · FFmpeg',
  '[ <span class="ok">OK</span> ] transcritor-local .............. Python · Whisper',
  '[ <span class="ok">OK</span> ] encurtador-url-metricas ........ Node.js · SQLite',
  '[ <span class="ok">OK</span> ] dashboard-financas ............. JavaScript · Chart.js',
  '',
  'Iniciando <span class="vm">Weslei OS</span>...',
];

function lerFlag() {
  try {
    return sessionStorage.getItem('wos-boot') === '1';
  } catch {
    return false;
  }
}
function gravarFlag() {
  try {
    sessionStorage.setItem('wos-boot', '1');
  } catch {
    /* navegação privada: sem problema */
  }
}

function iniciar(forcarBoot = false) {
  const boot = $('boot');
  const log = $('boot-log');
  const rapido = !forcarBoot && (lerFlag() || matchMedia('(prefers-reduced-motion: reduce)').matches);
  let terminou = false;
  let i = 0;

  boot.hidden = false;
  boot.classList.remove('saindo');
  log.innerHTML = '';

  const finalizar = () => {
    if (terminou) return;
    terminou = true;
    gravarFlag();
    boot.classList.add('saindo');
    setTimeout(() => (boot.hidden = true), 500);
    abrirInicial();
  };
  boot.onclick = finalizar;
  if (rapido) return finalizar();

  const proxima = () => {
    if (terminou) return;
    if (i >= LINHAS_BOOT.length) return setTimeout(finalizar, 450);
    log.innerHTML += LINHAS_BOOT[i++] + '\n';
    setTimeout(proxima, 110);
  };
  proxima();
}

function abrirInicial() {
  const alvo = location.hash.slice(1);
  if (alvo && abrir(alvo)) return;
  abrir('sobre');
}

window.addEventListener('hashchange', () => abrir(location.hash.slice(1)));

montarIcones();
iniciar();
