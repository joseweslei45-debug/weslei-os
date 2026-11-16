/**
 * Regras de negócio da Agenda Inteligente, portadas da API Java
 * (github.com/joseweslei45-debug/agenda-inteligente-api) para rodar no navegador.
 */

export const ANTECEDENCIA_MIN = 60; // minutos
export const PRAZO_CANCELAMENTO_MIN = 120; // minutos
export const PASSO_MIN = 15;

export const PROFISSIONAIS = [
  { id: 1, nome: 'Ana Lima', especialidade: 'Cabeleireira', inicio: '08:00', fim: '18:00', intervalo: ['12:00', '13:00'], dias: [1, 2, 3, 4, 5] },
  { id: 2, nome: 'Bruno Costa', especialidade: 'Esteticista', inicio: '09:00', fim: '17:00', intervalo: ['12:30', '13:30'], dias: [2, 4, 6] },
];

export const SERVICOS = [
  { id: 1, nome: 'Corte de cabelo', duracao: 30, preco: 35 },
  { id: 2, nome: 'Coloração', duracao: 90, preco: 120 },
  { id: 3, nome: 'Design de sobrancelhas', duracao: 45, preco: 50 },
  { id: 4, nome: 'Limpeza de pele', duracao: 60, preco: 90 },
];

/** '08:30' -> 510 */
export function minutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const minutosDoDia = (data) => data.getHours() * 60 + data.getMinutes();
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
export const somarMinutos = (data, min) => new Date(data.getTime() + min * 60000);

/** O intervalo [inicio, fim) cabe inteiro na jornada do profissional? */
export function atendeEm(prof, inicio, fim) {
  if (!mesmoDia(inicio, new Date(fim.getTime() - 1))) return false;
  if (!prof.dias.includes(inicio.getDay())) return false;
  const i = minutosDoDia(inicio);
  const f = i + (fim - inicio) / 60000;
  if (i < minutos(prof.inicio) || f > minutos(prof.fim)) return false;
  const [ia, fa] = prof.intervalo.map(minutos);
  return !(i < fa && f > ia);
}

/** Dois intervalos [a, b) e [c, d) se sobrepõem quando a < d e b > c. */
export function conflita(agendamentos, profId, inicio, fim, ignorarId = null) {
  return agendamentos.some(
    (a) => a.status === 'CONFIRMADO' && a.profId === profId && a.id !== ignorarId && a.inicio < fim && a.fim > inicio,
  );
}

/** Retorna null quando o horário é válido, ou a mensagem de erro. */
export function validar(prof, servico, inicio, agendamentos, agora, ignorarId = null) {
  const fim = somarMinutos(inicio, servico.duracao);
  if (inicio < somarMinutos(agora, ANTECEDENCIA_MIN)) return 'Agendamentos exigem pelo menos 1h de antecedência';
  if (!atendeEm(prof, inicio, fim)) return 'Horário fora da jornada de atendimento do profissional';
  if (conflita(agendamentos, prof.id, inicio, fim, ignorarId)) return 'Horário indisponível: conflita com outro agendamento';
  return null;
}

/**
 * Monta a grade do dia em blocos de 15 minutos, dizendo o status de cada um:
 * livre | ocupado | intervalo | passado | fechado
 */
export function gradeDoDia(prof, servico, data, agendamentos, agora) {
  const grade = [];
  const base = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  if (!prof.dias.includes(base.getDay())) return grade;
  const limite = somarMinutos(agora, ANTECEDENCIA_MIN);
  for (let m = minutos(prof.inicio); m + servico.duracao <= minutos(prof.fim); m += PASSO_MIN) {
    const inicio = somarMinutos(base, m);
    const fim = somarMinutos(inicio, servico.duracao);
    let status = 'livre';
    if (inicio < limite) status = 'passado';
    else if (!atendeEm(prof, inicio, fim)) status = 'intervalo';
    else if (conflita(agendamentos, prof.id, inicio, fim)) status = 'ocupado';
    grade.push({ inicio, fim, status });
  }
  return grade;
}

export function validarCancelamento(agendamento, agora) {
  if (agendamento.status !== 'CONFIRMADO') return 'Agendamento já está cancelado';
  if (somarMinutos(agora, PRAZO_CANCELAMENTO_MIN) > agendamento.inicio) {
    return 'Cancelamentos devem ser feitos com pelo menos 2h de antecedência';
  }
  return null;
}
