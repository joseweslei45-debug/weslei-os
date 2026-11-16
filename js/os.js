/**
 * Gerenciador de janelas do Weslei OS.
 * Cada app é um objeto { id, titulo, icone, descricao, largura, altura, repo, montar(container, os) }.
 * montar() pode devolver uma função de limpeza, chamada quando a janela fecha.
 */

const apps = new Map();
const janelas = new Map();
const ouvintes = new Set();
let zTopo = 10;
let cascata = 0;

const desktop = () => document.getElementById('desktop');
const notificar = () => ouvintes.forEach((fn) => fn());

export const registrar = (app) => apps.set(app.id, app);
export const listarApps = () => [...apps.values()];
export const aoMudar = (fn) => ouvintes.add(fn);

export function janelasAbertas() {
  return [...janelas.values()].map((j) => ({
    id: j.id,
    app: j.app,
    minimizada: j.el.classList.contains('minimizada'),
    ativa: j.el.classList.contains('ativa'),
  }));
}

export function abrir(id, opcoes = {}) {
  const app = apps.get(id);
  if (!app) return false;

  if (janelas.has(id)) {
    janelas.get(id).el.classList.remove('minimizada');
    focar(id);
    return true;
  }

  const area = desktop().getBoundingClientRect();
  const w = Math.min(app.largura || 640, area.width - 24);
  const h = Math.min(app.altura || 460, area.height - 24);
  const passo = cascata++ % 6;
  const x = Math.max(12, Math.round((area.width - w) / 2) + passo * 28 - 70);
  const y = Math.max(12, Math.round((area.height - h) / 2.6) + passo * 24 - 40);

  const el = document.createElement('section');
  el.className = 'janela';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', app.titulo);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  el.innerHTML =
    '<header class="janela-barra">' +
    '<span aria-hidden="true"></span><span class="janela-titulo"></span>' +
    '<div class="janela-controles">' +
    '<button type="button" data-acao="min" aria-label="Minimizar">—</button>' +
    '<button type="button" data-acao="max" aria-label="Maximizar">▢</button>' +
    '<button type="button" data-acao="fechar" aria-label="Fechar">✕</button>' +
    '</div></header><div class="janela-conteudo"></div>';
  el.querySelector('header span').textContent = app.icone;
  el.querySelector('.janela-titulo').textContent = app.titulo;
  desktop().append(el);

  const janela = { id, app, el, destruir: null };
  janelas.set(id, janela);

  el.addEventListener('pointerdown', () => focar(id));
  el.querySelector('.janela-controles').addEventListener('click', (e) => {
    const acao = e.target.closest('button')?.dataset.acao;
    if (acao === 'fechar') fechar(id);
    else if (acao === 'min') minimizar(id);
    else if (acao === 'max') alternarMaximizar(id);
  });
  el.querySelector('.janela-barra').addEventListener('dblclick', (e) => {
    if (!e.target.closest('button')) alternarMaximizar(id);
  });
  arrastavel(el, el.querySelector('.janela-barra'));
  focar(id);

  const conteudo = el.querySelector('.janela-conteudo');
  try {
    janela.destruir = app.montar(conteudo, api, opcoes) || null;
  } catch (erro) {
    console.error(erro);
    conteudo.innerHTML = '<div class="app"><div class="erro"></div></div>';
    conteudo.querySelector('.erro').textContent = 'Não foi possível abrir o app: ' + erro.message;
  }
  notificar();
  return true;
}

export function fechar(id) {
  const janela = janelas.get(id);
  if (!janela) return;
  try {
    if (janela.destruir) janela.destruir();
  } catch (erro) {
    console.error(erro);
  }
  janela.el.remove();
  janelas.delete(id);
  const proxima = [...janelas.values()]
    .filter((j) => !j.el.classList.contains('minimizada'))
    .sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex))[0];
  if (proxima) focar(proxima.id);
  notificar();
}

export function fecharTodas() {
  [...janelas.keys()].forEach(fechar);
}

export function minimizar(id) {
  const janela = janelas.get(id);
  if (!janela) return;
  janela.el.classList.add('minimizada');
  janela.el.classList.remove('ativa');
  notificar();
}

export function alternarMaximizar(id) {
  janelas.get(id)?.el.classList.toggle('maximizada');
}

export function focar(id) {
  const janela = janelas.get(id);
  if (!janela) return;
  janelas.forEach((j) => j.el.classList.toggle('ativa', j.id === id));
  janela.el.style.zIndex = String(++zTopo);
  notificar();
}

/** Clique na barra de tarefas: restaura, foca ou minimiza. */
export function alternarTarefa(id) {
  const janela = janelas.get(id);
  if (!janela) return;
  if (janela.el.classList.contains('minimizada')) {
    janela.el.classList.remove('minimizada');
    focar(id);
  } else if (janela.el.classList.contains('ativa')) {
    minimizar(id);
  } else {
    focar(id);
  }
}

function arrastavel(el, alca) {
  alca.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    if (el.classList.contains('maximizada') || window.innerWidth <= 760) return;
    const r = el.getBoundingClientRect();
    const area = desktop().getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    alca.setPointerCapture(e.pointerId);

    const mover = (ev) => {
      const x = Math.min(Math.max(ev.clientX - dx - area.left, 80 - r.width), area.width - 80);
      const y = Math.min(Math.max(ev.clientY - dy - area.top, 0), area.height - 44);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    };
    const soltar = () => {
      alca.removeEventListener('pointermove', mover);
      alca.removeEventListener('pointerup', soltar);
      alca.removeEventListener('pointercancel', soltar);
    };
    alca.addEventListener('pointermove', mover);
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);
  });
}

/** API entregue aos apps. */
export const api = { abrir, fechar, listarApps, focar };
