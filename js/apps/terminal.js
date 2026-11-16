import { GITHUB, PROJETOS, repo } from '../projetos.js';

const inicioSessao = Date.now();

const LOGO = [
  '██╗    ██╗',
  '██║    ██║',
  '██║ █╗ ██║',
  '██║███╗██║',
  '╚███╔███╔╝',
  ' ╚══╝╚══╝ ',
];

function tempoLigado() {
  const s = Math.floor((Date.now() - inicioSessao) / 1000);
  return Math.floor(s / 60) + ' min ' + (s % 60) + ' s';
}

export default {
  id: 'terminal',
  titulo: 'Terminal',
  icone: '⌨️',
  descricao: 'wsh — o shell do Weslei OS',
  largura: 680,
  altura: 440,
  montar(el, os) {
    el.innerHTML =
      '<div class="terminal">' +
      '<div class="term-saida" aria-live="polite"></div>' +
      '<form class="term-linha"><label class="prompt" for="term-in">weslei@wos:~$</label>' +
      '<input id="term-in" autocomplete="off" autocapitalize="off" spellcheck="false" /></form>' +
      '</div>';

    const saida = el.querySelector('.term-saida');
    const input = el.querySelector('input');
    const historico = [];
    let posHist = 0;

    const escrever = (texto = '', classe = '') => {
      const linha = document.createElement('div');
      if (classe) linha.className = classe;
      linha.textContent = texto;
      saida.append(linha);
      saida.parentElement.scrollTop = saida.parentElement.scrollHeight;
    };

    const nomesApps = () => os.listarApps().map((a) => a.id);

    const COMANDOS = {
      help: {
        desc: 'lista os comandos',
        run() {
          escrever('Comandos disponíveis:', 'destaque-term');
          for (const [nome, c] of Object.entries(COMANDOS)) {
            if (!c.oculto) escrever('  ' + nome.padEnd(12) + c.desc);
          }
          escrever('');
          escrever('Dica: Tab completa comandos, ↑/↓ navegam no histórico.', 'apagado');
        },
      },
      sobre: {
        desc: 'quem é o Weslei',
        run() {
          escrever('Weslei Sousa — desenvolvedor em formação (ADS), Quixadá/CE 🇧🇷');
          escrever('Foco: backend, automação e IA rodando localmente.');
          escrever('Stack: Python · Java · JavaScript · Node.js · C · Docker · Redis');
        },
      },
      whoami: { desc: 'quem é você', run: () => escrever('visitante — mas fique à vontade, a casa é sua 😄') },
      projetos: {
        desc: 'lista os projetos',
        run() {
          for (const p of PROJETOS) {
            escrever('● ' + p.nome, 'destaque-term');
            escrever('  ' + p.stack + ' — ' + p.resumo, 'apagado');
          }
          escrever('');
          escrever('Use "abrir <app>" — apps: ' + nomesApps().join(', '));
        },
      },
      apps: { desc: 'lista os apps instalados', run: () => os.listarApps().forEach((a) => escrever('  ' + a.id.padEnd(12) + a.icone + '  ' + a.descricao)) },
      abrir: {
        desc: 'abre um app (ex.: abrir agenda)',
        run(args) {
          const id = (args[0] || '').toLowerCase();
          if (!id) return escrever('uso: abrir <app>  —  ' + nomesApps().join(', '), 'erro-term');
          if (os.abrir(id)) escrever('abrindo ' + id + '...');
          else escrever('app não encontrado: ' + id, 'erro-term');
        },
      },
      github: {
        desc: 'abre o GitHub (ou: github <projeto>)',
        run(args) {
          const p = PROJETOS.find((x) => x.nome === args[0] || x.app === args[0]);
          const url = p ? repo(p.nome) : GITHUB;
          window.open(url, '_blank', 'noopener');
          escrever('↗ ' + url);
        },
      },
      neofetch: {
        desc: 'informações do sistema',
        run() {
          const info = [
            'weslei@wos',
            '----------',
            'OS: Weslei OS 1.0 (web)',
            'Host: ' + (navigator.userAgentData?.brands?.[0]?.brand || 'seu navegador'),
            'Uptime: ' + tempoLigado(),
            'Shell: wsh 1.0',
            'Apps: ' + os.listarApps().length,
            'Resolução: ' + window.innerWidth + 'x' + window.innerHeight,
            'Tema: Vermelho & Preto',
          ];
          const n = Math.max(LOGO.length, info.length);
          for (let i = 0; i < n; i++) {
            const linha = document.createElement('div');
            const logo = document.createElement('span');
            logo.className = 'vermelho-term';
            logo.textContent = (LOGO[i] || '').padEnd(14);
            linha.append(logo, document.createTextNode(info[i] || ''));
            saida.append(linha);
          }
        },
      },
      data: { desc: 'data e hora em Quixadá', run: () => escrever(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'medium' })) },
      echo: { desc: 'repete o texto', run: (args) => escrever(args.join(' ')) },
      historico: { desc: 'comandos já digitados', run: () => historico.forEach((c, i) => escrever(String(i + 1).padStart(3) + '  ' + c)) },
      matrix: {
        desc: 'não digite isso',
        run() {
          const chars = '01アイウエオカキクケコサシスセソWESLEI';
          let n = 0;
          const timer = setInterval(() => {
            let s = '';
            for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * chars.length)];
            escrever(s, 'vermelho-term');
            if (++n > 18) {
              clearInterval(timer);
              escrever('Acorde, visitante... o portfólio te encontrou. 🐇');
            }
          }, 45);
        },
      },
      sudo: { desc: '', oculto: true, run: () => escrever('[sudo] permissão negada: só o Weslei tem a senha 😏', 'erro-term') },
      clear: { desc: 'limpa a tela', run: () => saida.replaceChildren() },
      exit: { desc: 'fecha o terminal', run: () => os.fechar('terminal') },
    };
    COMANDOS.cls = { ...COMANDOS.clear, oculto: true };
    COMANDOS.ls = { ...COMANDOS.projetos, oculto: true };

    function executar(linha) {
      const [cmd, ...args] = linha.trim().split(/\s+/);
      if (!cmd) return;
      const c = COMANDOS[cmd.toLowerCase()];
      if (c) c.run(args);
      else escrever('wsh: comando não encontrado: ' + cmd + ' — digite "help"', 'erro-term');
    }

    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const linha = input.value;
      escrever('weslei@wos:~$ ' + linha, 'eco-term');
      if (linha.trim()) historico.push(linha.trim());
      posHist = historico.length;
      input.value = '';
      executar(linha);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && historico.length) {
        e.preventDefault();
        posHist = Math.max(0, posHist - 1);
        input.value = historico[posHist];
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        posHist = Math.min(historico.length, posHist + 1);
        input.value = historico[posHist] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const partes = input.value.split(' ');
        const opcoes = partes.length === 1
          ? Object.keys(COMANDOS).filter((c) => !COMANDOS[c].oculto)
          : nomesApps().concat(PROJETOS.map((p) => p.nome));
        const achados = opcoes.filter((o) => o.startsWith(partes[partes.length - 1]));
        if (achados.length === 1) {
          partes[partes.length - 1] = achados[0];
          input.value = partes.join(' ') + ' ';
        } else if (achados.length > 1) {
          escrever(achados.join('   '), 'apagado');
        }
      }
    });

    el.querySelector('.terminal').addEventListener('click', () => {
      if (!window.getSelection().toString()) input.focus();
    });

    escrever('Weslei OS 1.0 — wsh (web shell)', 'destaque-term');
    escrever('Digite "help" para ver os comandos ou "projetos" para conhecer meu trabalho.', 'apagado');
    escrever('');
    setTimeout(() => input.focus(), 50);
  },
};
