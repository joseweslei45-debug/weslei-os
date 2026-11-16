/** Faz o navegador baixar um texto como arquivo. */
export function baixar(nome, conteudo, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
