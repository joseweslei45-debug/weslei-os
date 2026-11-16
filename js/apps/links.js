import { analisarUserAgent, gerarCodigo, origem, paisPorIdioma } from '../lib/useragent.js';
import { repo } from '../projetos.js';

const DOMINIO = 'weslei.link';
const RESERVADOS = new Set(['api', 'estatisticas', 'index', 'admin', 'css', 'js']);

const AMOSTRA_UA = [
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 30, 'pt-BR'],
  ['Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36', 34, 'pt-BR'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 16, 'pt-BR'],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0', 7, 'pt-BR'],
  ['Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36', 6, 'pt-BR'],
  ['Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0', 4, 'en-US'],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 4, 'pt-PT'],
  ['WhatsApp/2.24.20.79 A', 9, ''],
];
const ORIGENS = [['https://www.instagram.com/', 35], ['', 30], ['https://www.linkedin.com/feed/', 15], ['https://www.google.com/', 12], ['https://github.com/joseweslei45-debug', 8]];

function sortear(lista) {
  const total = lista.reduce((s, x) => s + x[1], 0);
  let r = Math.random() * total;
  for (const item of lista) {
    if ((r -= item[1]) <= 0) return item;
  }
  return lista[0];
}

/** Horários mais prováveis à noite e no almoço, como em redes sociais. */
function sortearHora() {
  const pesos = [1, 0.5, 0.3, 0.2, 0.2, 0.4, 1, 2, 3, 3, 3, 4, 6, 5, 3, 3, 3, 4, 6, 8, 9, 8, 6, 3];
  return sortear(pesos.map((p, h) => [h, p]))[0];
}

function contar(cliques, campo) {
  const mapa = new Map();
  for (const c of cliques) mapa.set(c[campo], (mapa.get(c[campo]) || 0) + 1);
  return [...mapa].sort((a, b) => b[1] - a[1]);
}

async function hash(texto) {
  const dados = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default {
  id: 'links',
  titulo: 'Link Lab',
  icone: '🔗',
  descricao: 'Encurtador com métricas e raio-x do clique',
  largura: 820,
  altura: 640,
  montar(el) {
    const links = [];
    const salt = gerarCodigo(16);

    el.innerHTML =
      '<div class="app links">' +
      '<div class="linha entre">' +
      '<div><h2>🔗 Link Lab</h2><p class="suave">O motor de análise do meu encurtador de URL, rodando no seu navegador.</p></div>' +
      '<a class="codigo-link" target="_blank" rel="noopener">ver código (Node.js) ↗</a>' +
      '</div>' +
      '<section class="cartao raio-x"><h3>🔍 Raio-X do seu clique</h3>' +
      '<p class="suave pequeno">Isto é exatamente o que o encurtador registraria se você clicasse em um link agora. Repare: o IP nunca é salvo, só um hash.</p>' +
      '<dl class="dados-clique"></dl></section>' +
      '<section class="cartao"><h3>✂️ Encurtar um link</h3>' +
      '<form class="form-link"><input class="campo" name="url" type="url" required placeholder="https://..." />' +
      '<input class="campo" name="alias" placeholder="alias (opcional)" maxlength="32" />' +
      '<button class="botao" type="submit">Encurtar</button></form>' +
      '<p class="msg" aria-live="polite"></p>' +
      '<div class="lista-links"></div></section>' +
      '<p class="suave pequeno">Simulação no navegador: a versão real tem backend Node.js + SQLite e redireciona com HTTP 302.</p>' +
      '</div>';

    const $ = (s) => el.querySelector(s);
    $('.codigo-link').href = repo('encurtador-url-metricas');

    // ---------- Raio-X ----------
    (async () => {
      const ua = analisarUserAgent(navigator.userAgent);
      const agora = new Date();
      const dados = [
        ['Navegador', ua.navegador],
        ['Sistema', ua.sistema],
        ['Dispositivo', ua.dispositivo],
        ['País (aprox.)', paisPorIdioma(navigator.language)],
        ['Origem', origem(document.referrer)],
        ['Dia / hora', agora.toLocaleDateString('pt-BR') + ' · ' + agora.getHours() + 'h'],
        ['Visitante', await hash(salt + navigator.userAgent)],
        ['É robô?', ua.bot ? 'sim — não contaria' : 'não — clique contado ✔'],
      ];
      $('.dados-clique').replaceChildren(
        ...dados.map(([k, v]) => {
          const par = document.createElement('div');
          const dt = document.createElement('dt');
          dt.textContent = k;
          const dd = document.createElement('dd');
          dd.textContent = v;
          par.append(dt, dd);
          return par;
        }),
      );
    })();

    // ---------- Encurtador ----------
    const msg = (texto, tipo) => {
      $('.msg').className = 'msg' + (texto ? ' ' + tipo : '');
      $('.msg').textContent = texto;
    };

    function registrar(link, uaTexto, idioma, referer, horaFixa) {
      const ua = analisarUserAgent(uaTexto);
      if (ua.bot) {
        link.robos++;
        return;
      }
      link.cliques.push({
        navegador: ua.navegador,
        sistema: ua.sistema,
        dispositivo: ua.dispositivo,
        pais: paisPorIdioma(idioma),
        origem: origem(referer),
        hora: horaFixa ?? new Date().getHours(),
      });
    }

    function barras(titulo, pares) {
      const box = document.createElement('div');
      const h = document.createElement('h3');
      h.textContent = titulo;
      const g = document.createElement('div');
      g.className = 'grafico-barras';
      const max = Math.max(1, ...pares.map((p) => p[1]));
      for (const [nome, n] of pares.slice(0, 5)) {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = '<span></span><div><i></i></div><b></b>';
        item.firstChild.textContent = nome;
        item.querySelector('i').style.width = (100 * n) / max + '%';
        item.lastChild.textContent = n;
        g.append(item);
      }
      box.append(h, g);
      return box;
    }

    function painel(link) {
      const p = document.createElement('div');
      p.className = 'painel-link';
      const total = link.cliques.length;
      const unicos = new Set(link.cliques.map((c) => c.navegador + c.sistema + c.dispositivo + c.pais)).size;
      const resumo = document.createElement('p');
      resumo.className = 'suave pequeno';
      resumo.textContent = total + ' cliques · ~' + unicos + ' perfis distintos · ' + link.robos + ' pré-visualizações de robô ignoradas';
      p.append(resumo);
      if (!total) return p;
      const grade = document.createElement('div');
      grade.className = 'grade-metricas';
      grade.append(
        barras('Navegadores', contar(link.cliques, 'navegador')),
        barras('Dispositivos', contar(link.cliques, 'dispositivo')),
        barras('Sistemas', contar(link.cliques, 'sistema')),
        barras('Origem', contar(link.cliques, 'origem')),
      );
      const horas = document.createElement('div');
      horas.innerHTML = '<h3>Cliques por hora</h3><div class="mini-horas"></div><div class="horas-legenda"><span>0h</span><span>12h</span><span>23h</span></div>';
      const porHora = Array(24).fill(0);
      link.cliques.forEach((c) => porHora[c.hora]++);
      const maxH = Math.max(1, ...porHora);
      horas.querySelector('.mini-horas').replaceChildren(
        ...porHora.map((n, h) => {
          const i = document.createElement('i');
          i.style.height = (100 * n) / maxH + '%';
          i.title = h + 'h: ' + n;
          return i;
        }),
      );
      grade.append(horas);
      p.append(grade);
      return p;
    }

    function render() {
      $('.lista-links').replaceChildren(
        ...links.map((link) => {
          const c = document.createElement('article');
          c.className = 'link-item';
          c.innerHTML =
            '<div class="linha entre"><div><strong class="curto"></strong><small class="suave destino"></small></div>' +
            '<div class="linha"><button type="button" class="botao sec mini" data-acao="abrir">Abrir ↗</button>' +
            '<button type="button" class="botao mini" data-acao="simular">+50 cliques</button></div></div>';
          c.querySelector('.curto').textContent = DOMINIO + '/' + link.codigo;
          c.querySelector('.destino').textContent = '→ ' + link.url;
          c.querySelector('[data-acao=abrir]').addEventListener('click', () => {
            registrar(link, navigator.userAgent, navigator.language, document.referrer);
            window.open(link.url, '_blank', 'noopener');
            render();
          });
          c.querySelector('[data-acao=simular]').addEventListener('click', () => {
            for (let i = 0; i < 50; i++) {
              const [ua, , idioma] = sortear(AMOSTRA_UA);
              registrar(link, ua, idioma, sortear(ORIGENS)[0], sortearHora());
            }
            render();
          });
          c.append(painel(link));
          return c;
        }),
      );
    }

    $('.form-link').addEventListener('submit', (e) => {
      e.preventDefault();
      const url = e.target.url.value.trim();
      const alias = e.target.alias.value.trim();
      try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
      } catch {
        return msg('400 · Informe uma URL válida começando com http:// ou https://', 'erro');
      }
      if (alias && (!/^[A-Za-z0-9_-]{3,32}$/.test(alias) || RESERVADOS.has(alias.toLowerCase()))) {
        return msg('400 · O alias deve ter de 3 a 32 caracteres: letras, números, - ou _ (e não pode ser reservado)', 'erro');
      }
      if (alias && links.some((l) => l.codigo === alias)) return msg('409 · Esse alias já está em uso', 'erro');
      let codigo = alias || gerarCodigo();
      while (!alias && links.some((l) => l.codigo === codigo)) codigo = gerarCodigo();
      links.unshift({ codigo, url, cliques: [], robos: 0 });
      msg('201 · Criado: ' + DOMINIO + '/' + codigo, 'ok');
      e.target.reset();
      render();
    });

    // Um link de exemplo já com cliques, para o painel não começar vazio.
    links.push({ codigo: 'portfolio', url: 'https://github.com/joseweslei45-debug', cliques: [], robos: 0 });
    for (let i = 0; i < 120; i++) {
      const [ua, , idioma] = sortear(AMOSTRA_UA);
      registrar(links[0], ua, idioma, sortear(ORIGENS)[0], sortearHora());
    }
    render();
  },
};
