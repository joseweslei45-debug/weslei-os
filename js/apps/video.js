import { formatDuration, thumbnailTimestamps } from '../lib/thumbnails.js';
import { repo } from '../projetos.js';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const tamanho = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

function esperar(alvo, evento, timeout) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      alvo.removeEventListener(evento, ok);
      reject(new Error('tempo esgotado aguardando ' + evento));
    }, timeout);
    const ok = () => {
      clearTimeout(t);
      resolve();
    };
    alvo.addEventListener(evento, ok, { once: true });
  });
}

/** Desenha uma cena do vídeo de exemplo (3 cenas com cores diferentes). */
function desenharCena(ctx, t) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cena = t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2;
  const cores = [['#ff2d3d', '#3a0008'], ['#4da3ff', '#001a3a'], ['#2ee59d', '#00301c']];
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, cores[cena][1]);
  g.addColorStop(1, '#050507');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    const a = t * Math.PI * 4 + i;
    ctx.beginPath();
    ctx.arc(W / 2 + Math.cos(a) * (120 + i * 18), H / 2 + Math.sin(a * 1.3) * 80, 14 + i * 3, 0, Math.PI * 2);
    ctx.fillStyle = cores[cena][0] + '55';
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText('CENA ' + (cena + 1), W / 2, H / 2 + 10);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = cores[cena][0];
  ctx.fillText('Weslei OS · video-pipeline', W / 2, H / 2 + 50);
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(40, H - 34, W - 80, 6);
  ctx.fillStyle = cores[cena][0];
  ctx.fillRect(40, H - 34, (W - 80) * t, 6);
}

async function gerarVideoExemplo() {
  const tipos = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  const tipo = window.MediaRecorder && tipos.find((t) => MediaRecorder.isTypeSupported(t));
  if (!tipo) throw new Error('Seu navegador não consegue gravar vídeo (MediaRecorder).');
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const gravador = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 2500000 });
  const partes = [];
  gravador.ondataavailable = (e) => e.data.size && partes.push(e.data);
  const parou = new Promise((r) => (gravador.onstop = r));
  desenharCena(ctx, 0);
  gravador.start(250);
  const duracao = 6000;
  const t0 = performance.now();
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      const t = Math.min((performance.now() - t0) / duracao, 1);
      desenharCena(ctx, t);
      if (t >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 33);
  });
  gravador.stop();
  await parou;
  stream.getTracks().forEach((tr) => tr.stop());
  const ext = tipo.includes('mp4') ? 'mp4' : 'webm';
  return new File(partes, 'demo-weslei-os.' + ext, { type: tipo.split(';')[0] });
}

export default {
  id: 'video',
  titulo: 'Video Pipeline',
  icone: '🎬',
  descricao: 'Fila de processamento de vídeos com workers',
  largura: 900,
  altura: 640,
  montar(el) {
    const estado = { jobs: [], fila: [], workers: 2, ocupados: new Set(), qtdThumbs: 4, fechado: false, urls: [] };
    let seq = 0;

    el.innerHTML =
      '<div class="app video">' +
      '<div class="linha entre">' +
      '<div><h2>🎬 Video Pipeline</h2><p class="suave">Fila assíncrona com workers que extraem metadados e geram thumbnails — como o BullMQ + FFmpeg do projeto original, mas usando o decodificador do seu navegador.</p></div>' +
      '<a class="codigo-link" target="_blank" rel="noopener">ver código (Node.js) ↗</a>' +
      '</div>' +
      '<div class="video-topo">' +
      '<label class="drop-video"><input type="file" accept="video/*" multiple hidden /><strong>Solte vídeos aqui</strong><span class="suave">ou clique para escolher — nada é enviado para servidor</span></label>' +
      '<div class="cartao controles-video">' +
      '<button type="button" class="botao btn-demo">✨ Gerar vídeo de exemplo</button>' +
      '<label>Workers simultâneos: <strong class="n-workers">2</strong><input type="range" min="1" max="4" value="2" class="sl-workers" /></label>' +
      '<label>Thumbnails por vídeo <select class="campo sel-thumbs"><option>3</option><option selected>4</option><option>6</option><option>8</option></select></label>' +
      '</div></div>' +
      '<p class="stats suave"></p>' +
      '<div class="kanban">' +
      '<section><h3>⏳ Fila</h3><div class="col" data-col="fila"></div></section>' +
      '<section><h3>⚙️ Processando</h3><div class="col" data-col="ativo"></div></section>' +
      '<section><h3>✅ Concluídos</h3><div class="col" data-col="fim"></div></section>' +
      '</div>' +
      '<details class="cartao"><summary>📜 Logs dos workers</summary><pre class="logs"></pre></details>' +
      '</div>';

    const $ = (s) => el.querySelector(s);
    $('.codigo-link').href = repo('video-pipeline');

    const log = (texto) => {
      const hora = new Date().toLocaleTimeString('pt-BR');
      $('.logs').textContent = '[' + hora + '] ' + texto + '\n' + $('.logs').textContent;
    };

    function card(job) {
      const c = document.createElement('article');
      c.className = 'job cartao' + (job.status === 'falhou' ? ' falhou' : '');
      const titulo = document.createElement('div');
      titulo.className = 'job-titulo';
      titulo.textContent = '#' + job.id + ' · ' + job.arquivo.name;
      const info = document.createElement('small');
      info.className = 'suave';
      info.textContent = job.etapa + ' · ' + tamanho(job.arquivo.size) + (job.worker ? ' · worker-' + job.worker : '');
      c.append(titulo, info);
      if (job.status === 'ativo' || job.status === 'fila') {
        const barra = document.createElement('div');
        barra.className = 'barra-prog';
        barra.innerHTML = '<span></span>';
        barra.firstChild.style.width = job.progresso + '%';
        c.append(barra);
      }
      if (job.meta) {
        const meta = document.createElement('div');
        meta.className = 'linha';
        for (const t of [formatDuration(job.meta.duracao), job.meta.largura + 'x' + job.meta.altura, job.tempo ? job.tempo + ' s' : null]) {
          if (!t) continue;
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = t;
          meta.append(tag);
        }
        c.append(meta);
      }
      if (job.thumbs.length) {
        const grade = document.createElement('div');
        grade.className = 'thumbs';
        for (const th of job.thumbs) {
          const a = document.createElement('a');
          a.href = th.src;
          a.download = 'thumb-' + job.id + '-' + th.segundo + 's.jpg';
          a.title = 'Baixar captura em ' + th.segundo + 's';
          const img = document.createElement('img');
          img.src = th.src;
          img.alt = 'Captura em ' + th.segundo + ' segundos';
          const leg = document.createElement('span');
          leg.textContent = th.segundo + 's';
          a.append(img, leg);
          grade.append(a);
        }
        c.append(grade);
      }
      return c;
    }

    function render() {
      if (estado.fechado) return;
      const cols = { fila: [], ativo: [], fim: [] };
      for (const j of estado.jobs) {
        if (j.status === 'fila' || j.status === 'retry') cols.fila.push(j);
        else if (j.status === 'ativo') cols.ativo.push(j);
        else cols.fim.unshift(j);
      }
      for (const [nome, lista] of Object.entries(cols)) {
        const col = el.querySelector('[data-col=' + nome + ']');
        col.replaceChildren(...lista.map(card));
        if (!lista.length) col.innerHTML = '<p class="suave vazio">vazio</p>';
      }
      const n = (s) => estado.jobs.filter((j) => j.status === s).length;
      $('.stats').textContent =
        'Na fila: ' + (n('fila') + n('retry')) + ' · Ativos: ' + n('ativo') + ' · Concluídos: ' + n('ok') + ' · Falhas: ' + n('falhou') +
        ' · Workers: ' + estado.ocupados.size + '/' + estado.workers + ' ocupados';
    }

    function enfileirar(arquivo) {
      const job = { id: ++seq, arquivo, status: 'fila', etapa: 'aguardando worker', progresso: 0, thumbs: [], tentativas: 0, worker: null, meta: null };
      estado.jobs.push(job);
      estado.fila.push(job);
      log('fila  ← job #' + job.id + ' (' + arquivo.name + ')');
      render();
      bombear();
    }

    function bombear() {
      while (!estado.fechado && estado.ocupados.size < estado.workers && estado.fila.length) {
        const job = estado.fila.shift();
        let w = 1;
        while (estado.ocupados.has(w)) w++;
        estado.ocupados.add(w);
        job.worker = w;
        processar(job, w).finally(() => {
          estado.ocupados.delete(w);
          render();
          bombear();
        });
      }
    }

    async function processar(job, w) {
      const t0 = performance.now();
      job.status = 'ativo';
      job.tentativas++;
      job.thumbs = [];
      job.etapa = 'ffprobe: lendo metadados';
      job.progresso = 5;
      log('worker-' + w + ' → job #' + job.id + ' (tentativa ' + job.tentativas + '/3)');
      render();

      const url = URL.createObjectURL(job.arquivo);
      estado.urls.push(url);
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;

      try {
        await esperar(video, 'loadeddata', 20000);
        let duracao = video.duration;
        if (!Number.isFinite(duracao)) {
          // Vídeos gravados no navegador (WebM) às vezes não trazem a duração no cabeçalho.
          video.currentTime = 1e7;
          await esperar(video, 'timeupdate', 8000).catch(() => {});
          duracao = video.duration;
          video.currentTime = 0;
          await esperar(video, 'seeked', 8000).catch(() => {});
        }
        if (!Number.isFinite(duracao) || duracao <= 0) throw new Error('não foi possível ler a duração');
        job.meta = { duracao, largura: video.videoWidth, altura: video.videoHeight };
        job.progresso = 15;

        const tempos = thumbnailTimestamps(duracao, estado.qtdThumbs);
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = Math.round((320 * video.videoHeight) / video.videoWidth) || 180;
        const ctx = canvas.getContext('2d');

        for (const [i, segundo] of tempos.entries()) {
          if (estado.fechado) return;
          job.etapa = 'ffmpeg: frame ' + (i + 1) + '/' + tempos.length + ' em ' + segundo + 's';
          render();
          video.currentTime = Math.min(segundo, Math.max(0, duracao - 0.05));
          await esperar(video, 'seeked', 10000);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          job.thumbs.push({ segundo, src: canvas.toDataURL('image/jpeg', 0.82) });
          job.progresso = 15 + Math.round((80 * (i + 1)) / tempos.length);
          await dormir(220); // deixa a animação da fila visível
        }

        job.status = 'ok';
        job.progresso = 100;
        job.tempo = ((performance.now() - t0) / 1000).toFixed(1);
        job.etapa = 'concluído';
        log('worker-' + w + ' ✔ job #' + job.id + ' em ' + job.tempo + ' s');
      } catch (erro) {
        if (job.tentativas < 3 && !estado.fechado) {
          const espera = 1000 * 2 ** job.tentativas;
          job.status = 'retry';
          job.etapa = 'falhou (' + erro.message + ') — nova tentativa em ' + espera / 1000 + ' s';
          log('worker-' + w + ' ✖ job #' + job.id + ': ' + erro.message + ' · backoff ' + espera + 'ms');
          setTimeout(() => {
            if (estado.fechado) return;
            job.status = 'fila';
            job.etapa = 'aguardando worker';
            estado.fila.push(job);
            render();
            bombear();
          }, espera);
        } else {
          job.status = 'falhou';
          job.etapa = 'falhou: ' + erro.message;
          log('worker-' + w + ' ✖ job #' + job.id + ' descartado após 3 tentativas');
        }
      } finally {
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(url);
      }
    }

    // ---------- Eventos ----------
    const input = $('input[type=file]');
    const drop = $('.drop-video');
    input.addEventListener('change', () => {
      [...input.files].forEach(enfileirar);
      input.value = '';
    });
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('sobre');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('sobre'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('sobre');
      [...e.dataTransfer.files].filter((f) => f.type.startsWith('video/')).forEach(enfileirar);
    });

    $('.btn-demo').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      b.textContent = '🎥 Gravando 6 s de vídeo...';
      try {
        const arquivo = await gerarVideoExemplo();
        enfileirar(arquivo);
        enfileirar(new File([arquivo], 'demo-copia.' + arquivo.name.split('.').pop(), { type: arquivo.type }));
      } catch (erro) {
        log('erro ao gerar exemplo: ' + erro.message);
        alertaInline(erro.message);
      } finally {
        b.disabled = false;
        b.textContent = '✨ Gerar vídeo de exemplo';
      }
    });

    function alertaInline(texto) {
      const p = document.createElement('p');
      p.className = 'erro';
      p.textContent = texto;
      $('.stats').after(p);
      setTimeout(() => p.remove(), 6000);
    }

    $('.sl-workers').addEventListener('input', (e) => {
      estado.workers = Number(e.target.value);
      $('.n-workers').textContent = estado.workers;
      render();
      bombear();
    });
    $('.sel-thumbs').addEventListener('change', (e) => (estado.qtdThumbs = Number(e.target.value)));

    render();
    log('worker pool iniciado com ' + estado.workers + ' workers');

    return () => {
      estado.fechado = true;
      estado.urls.forEach((u) => URL.revokeObjectURL(u));
    };
  },
};
