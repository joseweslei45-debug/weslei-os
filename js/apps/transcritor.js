import { baixar } from '../baixar.js';
import { formatarTempo, paraSrt, paraTxt, paraVtt } from '../lib/legendas.js';
import { repo } from '../projetos.js';

const EXEMPLO = [
  { inicio: 0.4, fim: 3.1, texto: 'Olá! Este é um exemplo de legenda gerada pelo transcritor.' },
  { inicio: 3.4, fim: 7.8, texto: 'No projeto original, o modelo Whisper roda inteiro no seu computador, sem internet.' },
  { inicio: 8.1, fim: 11.6, texto: 'Aqui no Weslei OS a mesma formatação de SRT e VTT foi portada para JavaScript.' },
];

export default {
  id: 'transcritor',
  titulo: 'Transcritor',
  icone: '🎙️',
  descricao: 'Legendas ao vivo a partir do microfone',
  largura: 760,
  altura: 600,
  montar(el) {
    const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    const estado = { segmentos: [], gravando: false, t0: 0, inicios: new Map(), rec: null, fechado: false };

    el.innerHTML =
      '<div class="app transcritor">' +
      '<div class="linha entre">' +
      '<div><h2>🎙️ Transcritor</h2><p class="suave">Fale e veja as legendas surgirem com tempo marcado. Exporte em SRT, VTT ou TXT.</p></div>' +
      '<a class="codigo-link" target="_blank" rel="noopener">ver código (Python) ↗</a>' +
      '</div>' +
      '<div class="aviso privacidade"></div>' +
      '<div class="linha">' +
      '<select class="campo idioma" aria-label="Idioma"><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option></select>' +
      '<button type="button" class="botao btn-gravar">🎙️ Iniciar</button>' +
      '<button type="button" class="botao sec btn-exemplo">Carregar exemplo</button>' +
      '<button type="button" class="botao sec btn-limpar">Limpar</button>' +
      '</div>' +
      '<div class="ao-vivo" aria-live="polite"><span class="pulso" hidden></span><p class="legenda-final">As legendas aparecem aqui…</p><p class="legenda-parcial"></p></div>' +
      '<div class="cartao"><div class="linha entre"><h3>Segmentos</h3><div class="linha exportar">' +
      '<button type="button" class="botao sec mini" data-formato="srt">⬇ SRT</button>' +
      '<button type="button" class="botao sec mini" data-formato="vtt">⬇ VTT</button>' +
      '<button type="button" class="botao sec mini" data-formato="txt">⬇ TXT</button>' +
      '</div></div><ol class="segmentos"></ol><pre class="preview-srt" hidden></pre></div>' +
      '</div>';

    const $ = (s) => el.querySelector(s);
    $('.codigo-link').href = repo('transcritor-local');
    $('.privacidade').textContent = Reconhecimento
      ? 'Aqui no navegador, o reconhecimento de voz é feito pelo próprio navegador (no Chrome, ele usa servidores do Google). A versão 100% offline de verdade é o projeto em Python com Whisper.'
      : 'Seu navegador não tem reconhecimento de voz (funciona no Chrome e no Edge). Use "Carregar exemplo" para ver a geração de legendas.';
    if (!Reconhecimento) $('.btn-gravar').disabled = true;

    const segundosDesde = () => (performance.now() - estado.t0) / 1000;

    function render() {
      const lista = $('.segmentos');
      if (!estado.segmentos.length) {
        lista.innerHTML = '<li class="suave sem-marcador">Nenhum segmento ainda.</li>';
      } else {
        lista.replaceChildren(
          ...estado.segmentos.map((s) => {
            const li = document.createElement('li');
            const t = document.createElement('code');
            t.textContent = formatarTempo(s.inicio).slice(3, 9) + ' → ' + formatarTempo(s.fim).slice(3, 9);
            li.append(t, document.createTextNode(' ' + s.texto));
            return li;
          }),
        );
      }
      const prev = $('.preview-srt');
      prev.hidden = !estado.segmentos.length;
      prev.textContent = paraSrt(estado.segmentos.slice(-3));
      el.querySelectorAll('[data-formato]').forEach((b) => (b.disabled = !estado.segmentos.length));
    }

    function iniciar() {
      const rec = new Reconhecimento();
      rec.lang = $('.idioma').value;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e) => {
        let parcial = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const chave = estado.sessao + ':' + i;
          if (!estado.inicios.has(chave)) estado.inicios.set(chave, Math.max(0, segundosDesde() - 0.6));
          if (r.isFinal) {
            const texto = r[0].transcript.trim();
            if (texto) {
              estado.segmentos.push({ inicio: estado.inicios.get(chave), fim: segundosDesde(), texto: texto.charAt(0).toUpperCase() + texto.slice(1) });
              $('.legenda-final').textContent = texto;
            }
          } else {
            parcial += r[0].transcript;
          }
        }
        $('.legenda-parcial').textContent = parcial;
        render();
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        const mensagens = {
          'not-allowed': 'Permissão de microfone negada. Libere o microfone no cadeado da barra de endereço.',
          'audio-capture': 'Nenhum microfone encontrado.',
          network: 'Falha de rede no reconhecimento de voz do navegador.',
        };
        $('.legenda-final').textContent = mensagens[e.error] || 'Erro: ' + e.error;
        parar();
      };
      rec.onend = () => {
        // O Chrome encerra sozinho depois de um silêncio: reiniciamos enquanto estiver gravando.
        if (estado.gravando && !estado.fechado) {
          estado.sessao++;
          try {
            rec.start();
          } catch {
            parar();
          }
        }
      };

      estado.rec = rec;
      estado.gravando = true;
      estado.sessao = 1;
      if (!estado.segmentos.length) estado.t0 = performance.now();
      rec.start();
      $('.btn-gravar').textContent = '⏹ Parar';
      $('.pulso').hidden = false;
      $('.legenda-final').textContent = 'Ouvindo… pode falar.';
    }

    function parar() {
      estado.gravando = false;
      try {
        estado.rec?.stop();
      } catch {
        /* já parado */
      }
      $('.btn-gravar').textContent = '🎙️ Iniciar';
      $('.pulso').hidden = true;
      $('.legenda-parcial').textContent = '';
    }

    $('.btn-gravar').addEventListener('click', () => (estado.gravando ? parar() : iniciar()));
    $('.btn-exemplo').addEventListener('click', () => {
      parar();
      estado.segmentos = EXEMPLO.map((s) => ({ ...s }));
      $('.legenda-final').textContent = EXEMPLO[EXEMPLO.length - 1].texto;
      render();
    });
    $('.btn-limpar').addEventListener('click', () => {
      parar();
      estado.segmentos = [];
      estado.inicios.clear();
      $('.legenda-final').textContent = 'As legendas aparecem aqui…';
      render();
    });
    el.querySelector('.exportar').addEventListener('click', (e) => {
      const formato = e.target.closest('[data-formato]')?.dataset.formato;
      if (!formato || !estado.segmentos.length) return;
      const geradores = { srt: paraSrt, vtt: paraVtt, txt: paraTxt };
      const tipos = { srt: 'application/x-subrip', vtt: 'text/vtt', txt: 'text/plain' };
      baixar('legenda.' + formato, geradores[formato](estado.segmentos), tipos[formato]);
    });

    render();
    return () => {
      estado.fechado = true;
      parar();
    };
  },
};
