/**
 * Análise de user-agent do Encurtador de URL com Métricas, portada para o navegador.
 */
const NAVEGADORES = [
  ['Edge', /Edg(e|A|iOS)?\//],
  ['Opera', /OPR\/|Opera/],
  ['Samsung Internet', /SamsungBrowser\//],
  ['Chrome', /(Chrome|CriOS)\//],
  ['Firefox', /(Firefox|FxiOS)\//],
  ['Safari', /Version\/.*Safari\//],
];

const SISTEMAS = [
  ['Windows', /Windows NT/],
  ['Android', /Android/],
  ['iOS', /iPhone|iPad|iPod/],
  ['ChromeOS', /CrOS/],
  ['macOS', /Mac OS X|Macintosh/],
  ['Linux', /Linux/],
];

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|preview|curl|wget/i;
const primeiro = (lista, ua) => (lista.find(([, re]) => re.test(ua)) || ['Outro'])[0];

export function analisarUserAgent(ua = '') {
  let dispositivo = 'Desktop';
  if (/iPad|Tablet/i.test(ua) || (/Android/.test(ua) && !/Mobi/.test(ua))) dispositivo = 'Tablet';
  else if (/Mobi|iPhone/.test(ua)) dispositivo = 'Celular';
  return {
    navegador: primeiro(NAVEGADORES, ua),
    sistema: primeiro(SISTEMAS, ua),
    dispositivo,
    bot: !ua || BOTS.test(ua),
  };
}

/** País aproximado a partir do idioma (ex.: pt-BR -> BR). */
export function paisPorIdioma(idioma = '') {
  const m = String(idioma).match(/^[a-z]{2,3}-([a-z]{2})$/i);
  return m ? m[1].toUpperCase() : 'Desconhecido';
}

export function origem(referer) {
  if (!referer) return 'Direto';
  try {
    return new URL(referer).hostname.replace(/^www\./, '');
  } catch {
    return 'Desconhecido';
  }
}

const ALFABETO = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Código base62 com gerador criptográfico (sem viés de módulo). */
export function gerarCodigo(tamanho = 7, rng = globalThis.crypto) {
  let codigo = '';
  const buf = new Uint8Array(1);
  while (codigo.length < tamanho) {
    rng.getRandomValues(buf);
    if (buf[0] < 248) codigo += ALFABETO[buf[0] % 62];
  }
  return codigo;
}
