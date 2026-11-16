import { GITHUB, PROJETOS, repo } from '../projetos.js';

export default {
  id: 'sobre',
  titulo: 'Bem-vindo',
  icone: '👋',
  descricao: 'Quem sou eu e o que tem aqui',
  largura: 720,
  altura: 600,
  montar(el, os) {
    el.innerHTML =
      '<div class="app sobre">' +
      '<div class="sobre-topo">' +
      '<div class="avatar grande">W</div>' +
      '<div><h2>Olá, eu sou o Weslei 👋</h2>' +
      '<p class="suave">Desenvolvedor em formação (ADS) em Quixadá, Ceará. Gosto de backend, automação e IA rodando localmente.</p></div>' +
      '</div>' +
      '<div class="cartao destaque">' +
      '<p>Este é o <strong>Weslei OS</strong>: um portfólio em forma de sistema operacional. ' +
      'Cada app nesta área de trabalho é uma versão interativa de um projeto real do meu GitHub — ' +
      'com a <strong>mesma lógica</strong> portada para JavaScript, rodando aqui no seu navegador.</p>' +
      '</div>' +
      '<h3>Projetos</h3>' +
      '<div class="grade-projetos"></div>' +
      '<p class="suave dica">💡 Dica: abra o <button type="button" class="link-btn" data-abrir="terminal">Terminal</button> e digite <code>help</code>. ' +
      'Arraste as janelas pela barra de título e dê duplo clique para maximizar.</p>' +
      '<div class="linha"><a class="botao" target="_blank" rel="noopener"></a></div>' +
      '</div>';

    el.querySelector('.linha a').href = GITHUB;
    el.querySelector('.linha a').textContent = 'Ver meu GitHub ↗';

    const grade = el.querySelector('.grade-projetos');
    for (const p of PROJETOS) {
      const app = os.listarApps().find((a) => a.id === p.app);
      const card = document.createElement('article');
      card.className = 'cartao projeto';
      card.innerHTML =
        '<div class="projeto-topo"><span class="projeto-icone"></span><div><strong></strong><small class="suave"></small></div></div>' +
        '<p></p><div class="linha"><button type="button" class="botao">Abrir app</button><a class="botao sec" target="_blank" rel="noopener">Código</a></div>';
      card.querySelector('.projeto-icone').textContent = app ? app.icone : '📦';
      card.querySelector('strong').textContent = p.nome;
      card.querySelector('small').textContent = p.stack;
      card.querySelector('p').textContent = p.resumo;
      card.querySelector('button').addEventListener('click', () => os.abrir(p.app));
      card.querySelector('a').href = repo(p.nome);
      grade.append(card);
    }

    el.querySelector('[data-abrir]').addEventListener('click', () => os.abrir('terminal'));
  },
};
