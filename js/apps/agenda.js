import {
  PROFISSIONAIS, SERVICOS, gradeDoDia, somarMinutos, validar, validarCancelamento,
} from '../lib/agenda-regras.js';
import { repo } from '../projetos.js';

const hora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaCurto = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
const moeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Agenda inicial com alguns clientes, para os conflitos aparecerem. */
function agendaInicial() {
  const lista = [];
  let id = 1;
  const hoje = new Date();
  for (let i = 1, achados = 0; i < 10 && achados < 2; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    if (!PROFISSIONAIS[0].dias.includes(d.getDay())) continue;
    achados++;
    for (const [h, m, cliente, servico] of [[10, 0, 'João', 2], [14, 30, 'Maria', 1], [16, 0, 'Carla', 4]]) {
      const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      const s = SERVICOS.find((x) => x.id === servico);
      lista.push({ id: id++, profId: 1, servicoId: s.id, cliente, inicio, fim: somarMinutos(inicio, s.duracao), status: 'CONFIRMADO', meu: false });
    }
  }
  return lista;
}

export default {
  id: 'agenda',
  titulo: 'Agenda Inteligente',
  icone: '📅',
  descricao: 'Agendamento com regras de negócio reais',
  largura: 860,
  altura: 640,
  montar(el) {
    const estado = {
      agendamentos: agendaInicial(),
      profId: 1,
      servicoId: 1,
      dia: null,
      deslocamentoH: 0,
      proximoId: 100,
    };
    const agora = () => somarMinutos(new Date(), estado.deslocamentoH * 60);

    el.innerHTML =
      '<div class="app agenda">' +
      '<div class="linha entre">' +
      '<div><h2>📅 Agenda Inteligente</h2><p class="suave">As mesmas regras da API em Spring Boot, rodando no navegador.</p></div>' +
      '<a class="codigo-link" target="_blank" rel="noopener">ver código (Java) ↗</a>' +
      '</div>' +
      '<div class="agenda-filtros">' +
      '<label>Profissional<select class="campo" data-campo="prof"></select></label>' +
      '<label>Serviço<select class="campo" data-campo="servico"></select></label>' +
      '<label>Seu nome<input class="campo" data-campo="cliente" placeholder="ex.: Weslei" maxlength="40" /></label>' +
      '</div>' +
      '<div class="dias" role="tablist" aria-label="Dias"></div>' +
      '<div class="legenda"><span class="st livre">livre</span><span class="st ocupado">ocupado</span><span class="st intervalo">almoço/fora</span><span class="st passado">sem antecedência</span></div>' +
      '<div class="grade-horarios"></div>' +
      '<div class="msg" aria-live="polite"></div>' +
      '<div class="agenda-rodape">' +
      '<div class="cartao"><h3>Seus agendamentos</h3><ul class="meus"></ul></div>' +
      '<div class="cartao"><h3>⏩ Máquina do tempo</h3>' +
      '<p class="suave pequeno">Avance o relógio para testar a regra de cancelamento (mínimo 2h antes).</p>' +
      '<input type="range" min="0" max="96" step="1" value="0" class="tempo" aria-label="Avançar horas" />' +
      '<p class="agora-txt"></p></div>' +
      '</div>' +
      '<details class="cartao regras"><summary>Regras aplicadas</summary><ul>' +
      '<li>🕗 Só agenda dentro do expediente e nos dias de atendimento do profissional</li>' +
      '<li>🍽️ Nenhum atendimento invade o intervalo de almoço</li>' +
      '<li>⚔️ Sem sobreposição: [a,b) e [c,d) conflitam quando a &lt; d e b &gt; c</li>' +
      '<li>⏱️ Antecedência mínima de 1 hora</li>' +
      '<li>❌ Cancelamento só até 2 horas antes do início</li>' +
      '</ul></details>' +
      '</div>';

    el.querySelector('.codigo-link').href = repo('agenda-inteligente-api');
    const $ = (s) => el.querySelector(s);
    const selProf = $('[data-campo=prof]');
    const selServ = $('[data-campo=servico]');
    PROFISSIONAIS.forEach((p) => selProf.append(new Option(p.nome + ' — ' + p.especialidade, p.id)));
    SERVICOS.forEach((s) => selServ.append(new Option(s.nome + ' · ' + s.duracao + ' min · ' + moeda(s.preco), s.id)));

    const msg = (texto, tipo) => {
      const m = $('.msg');
      m.className = 'msg' + (texto ? ' ' + tipo : '');
      m.textContent = texto;
    };

    const prof = () => PROFISSIONAIS.find((p) => p.id === estado.profId);
    const servico = () => SERVICOS.find((s) => s.id === estado.servicoId);

    function proximosDias() {
      const base = agora();
      return Array.from({ length: 10 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
    }

    function renderDias() {
      const dias = proximosDias();
      if (!estado.dia || !dias.some((d) => d.toDateString() === estado.dia.toDateString())) {
        estado.dia =
          dias.find((d) => gradeDoDia(prof(), servico(), d, estado.agendamentos, agora()).some((s) => s.status === 'livre')) || dias[0];
      }
      $('.dias').replaceChildren(
        ...dias.map((d) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'dia' + (d.toDateString() === estado.dia.toDateString() ? ' sel' : '');
          b.setAttribute('role', 'tab');
          b.disabled = !prof().dias.includes(d.getDay());
          b.textContent = diaCurto(d);
          b.addEventListener('click', () => {
            estado.dia = d;
            render();
          });
          return b;
        }),
      );
    }

    function renderGrade() {
      const grade = gradeDoDia(prof(), servico(), estado.dia, estado.agendamentos, agora());
      const container = $('.grade-horarios');
      if (!grade.length) {
        container.innerHTML = '<p class="suave">Este profissional não atende neste dia.</p>';
        return;
      }
      container.replaceChildren(
        ...grade.map((slot) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'slot ' + slot.status;
          b.textContent = hora(slot.inicio);
          b.title = hora(slot.inicio) + '–' + hora(slot.fim) + ' · ' + slot.status;
          b.addEventListener('click', () => agendar(slot.inicio));
          return b;
        }),
      );
    }

    function agendar(inicio) {
      const cliente = $('[data-campo=cliente]').value.trim();
      if (!cliente) {
        msg('Digite seu nome antes de escolher um horário.', 'aviso');
        $('[data-campo=cliente]').focus();
        return;
      }
      // Mesma validação da API: o clique em um horário "ocupado" mostra o erro real.
      const erro = validar(prof(), servico(), inicio, estado.agendamentos, agora());
      if (erro) return msg('422 · ' + erro, 'erro');
      estado.agendamentos.push({
        id: estado.proximoId++, profId: prof().id, servicoId: servico().id, cliente, inicio,
        fim: somarMinutos(inicio, servico().duracao), status: 'CONFIRMADO', meu: true,
      });
      msg('201 · Agendado: ' + servico().nome + ' com ' + prof().nome + ' em ' + diaCurto(inicio) + ' às ' + hora(inicio) + '.', 'ok');
      render();
    }

    function renderMeus() {
      const meus = estado.agendamentos.filter((a) => a.meu).sort((a, b) => a.inicio - b.inicio);
      if (!meus.length) {
        $('.meus').innerHTML = '<li class="suave">Nenhum ainda — escolha um horário verde.</li>';
        return;
      }
      $('.meus').replaceChildren(
        ...meus.map((a) => {
          const li = document.createElement('li');
          const s = SERVICOS.find((x) => x.id === a.servicoId);
          const p = PROFISSIONAIS.find((x) => x.id === a.profId);
          const txt = document.createElement('span');
          txt.textContent = diaCurto(a.inicio) + ' ' + hora(a.inicio) + ' · ' + s.nome + ' · ' + p.nome.split(' ')[0];
          li.append(txt);
          if (a.status === 'CONFIRMADO') {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'botao sec mini';
            b.textContent = 'Cancelar';
            b.addEventListener('click', () => {
              const erro = validarCancelamento(a, agora());
              if (erro) return msg('422 · ' + erro, 'erro');
              a.status = 'CANCELADO';
              msg('Agendamento cancelado.', 'ok');
              render();
            });
            li.append(b);
          } else {
            const t = document.createElement('span');
            t.className = 'tag';
            t.textContent = 'cancelado';
            li.classList.add('cancelado');
            li.append(t);
          }
          return li;
        }),
      );
    }

    function renderAgora() {
      const a = agora();
      $('.agora-txt').textContent =
        (estado.deslocamentoH ? 'Agora simulado: ' : 'Agora: ') +
        a.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) +
        (estado.deslocamentoH ? ' (+' + estado.deslocamentoH + 'h)' : '');
    }

    function render() {
      renderDias();
      renderGrade();
      renderMeus();
      renderAgora();
    }

    selProf.addEventListener('change', () => {
      estado.profId = Number(selProf.value);
      estado.dia = null;
      msg('');
      render();
    });
    selServ.addEventListener('change', () => {
      estado.servicoId = Number(selServ.value);
      msg('');
      render();
    });
    $('.tempo').addEventListener('input', (e) => {
      estado.deslocamentoH = Number(e.target.value);
      render();
    });

    render();
    const timer = setInterval(renderAgora, 30000);
    return () => clearInterval(timer);
  },
};
