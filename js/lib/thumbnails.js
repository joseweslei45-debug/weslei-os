/**
 * Lógica de capturas do Video Pipeline (Node.js), reaproveitada no navegador.
 * Distribui N capturas deixando 10% de margem no início e no fim.
 */
export function thumbnailTimestamps(duration, count) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duração inválida');
  if (!Number.isInteger(count) || count < 1) throw new Error('Quantidade de thumbnails inválida');
  if (count === 1) return [round(duration / 2)];
  const margin = duration * 0.1;
  const usable = duration - 2 * margin;
  return Array.from({ length: count }, (_, i) => round(margin + (usable * i) / (count - 1)));
}

export function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? h + ':' + pad(m) + ':' + pad(r) : pad(m) + ':' + pad(r);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
