/**
 * Conversão para SRT/VTT/TXT — port do módulo formatos.py do Transcritor Local.
 * Segmento: { inicio: segundos, fim: segundos, texto: string }
 */
export const LARGURA_LEGENDA = 42;

export function formatarTempo(segundos, separador = ',') {
  if (segundos < 0) throw new Error('O tempo não pode ser negativo');
  const total = Math.round(segundos * 1000);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  const p = (n, t = 2) => String(n).padStart(t, '0');
  return p(h) + ':' + p(m) + ':' + p(s) + separador + p(ms, 3);
}

export function quebrarLinhas(texto, largura = LARGURA_LEGENDA) {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    if (atual && (atual + ' ' + p).length > largura) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = atual ? atual + ' ' + p : p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.join('\n');
}

export function paraSrt(segmentos) {
  return segmentos
    .map((s, i) => (i + 1) + '\n' + formatarTempo(s.inicio) + ' --> ' + formatarTempo(s.fim) + '\n' + quebrarLinhas(s.texto) + '\n')
    .join('\n');
}

export function paraVtt(segmentos) {
  const linhas = ['WEBVTT', ''];
  for (const s of segmentos) {
    linhas.push(formatarTempo(s.inicio, '.') + ' --> ' + formatarTempo(s.fim, '.'));
    linhas.push(quebrarLinhas(s.texto));
    linhas.push('');
  }
  return linhas.join('\n');
}

export function paraTxt(segmentos) {
  return segmentos.map((s) => s.texto.trim()).join('\n') + '\n';
}
