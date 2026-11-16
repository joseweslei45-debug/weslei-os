import { repo } from '../projetos.js';

const URL_APP = 'https://joseweslei45-debug.github.io/dashboard-financas/';

export default {
  id: 'financas',
  titulo: 'Finanças',
  icone: '💰',
  descricao: 'Dashboard de finanças pessoais',
  largura: 1000,
  altura: 680,
  montar(el) {
    el.innerHTML =
      '<div class="financas">' +
      '<div class="financas-barra"><span>💰 Dashboard de Finanças — clique em <strong>Carregar exemplo</strong> para testar</span>' +
      '<span class="linha"><a class="codigo-link" target="_blank" rel="noopener">código ↗</a>' +
      '<a class="codigo-link nova-aba" target="_blank" rel="noopener">abrir em nova aba ↗</a></span></div>' +
      '<iframe title="Dashboard de Finanças" loading="lazy" referrerpolicy="no-referrer"></iframe>' +
      '</div>';
    el.querySelector('iframe').src = URL_APP;
    el.querySelector('.nova-aba').href = URL_APP;
    el.querySelector('.codigo-link').href = repo('dashboard-financas');
  },
};
