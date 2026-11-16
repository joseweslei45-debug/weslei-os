import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROFISSIONAIS, SERVICOS, gradeDoDia, somarMinutos, validar, validarCancelamento } from '../js/lib/agenda-regras.js';

const ana = PROFISSIONAIS[0];
const corte = SERVICOS[0]; // 30 min
const AGORA = new Date(2026, 10, 30, 8, 0); // segunda-feira, 08:00
const as = (h, m = 0, dia = 30) => new Date(2026, 10, dia, h, m);

describe('validar', () => {
  it('aceita um horário livre dentro da jornada', () => {
    assert.equal(validar(ana, corte, as(10), [], AGORA), null);
  });

  it('recusa sem 1h de antecedência', () => {
    assert.match(validar(ana, corte, as(8, 30), [], AGORA), /antecedência/);
  });

  it('recusa horário que invade o almoço', () => {
    assert.match(validar(ana, corte, as(11, 45), [], AGORA), /jornada/);
  });

  it('recusa dia sem atendimento (sábado)', () => {
    assert.match(validar(ana, corte, new Date(2026, 11, 5, 10, 0), [], AGORA), /jornada/);
  });

  it('recusa sobreposição com outro agendamento', () => {
    const existente = { id: 1, profId: 1, status: 'CONFIRMADO', inicio: as(10), fim: as(10, 30) };
    assert.match(validar(ana, corte, as(10, 15), [existente], AGORA), /conflita/);
    assert.equal(validar(ana, corte, as(10, 30), [existente], AGORA), null);
  });

  it('ignora agendamentos cancelados', () => {
    const cancelado = { id: 1, profId: 1, status: 'CANCELADO', inicio: as(10), fim: as(10, 30) };
    assert.equal(validar(ana, corte, as(10), [cancelado], AGORA), null);
  });
});

describe('gradeDoDia', () => {
  it('marca o status de cada bloco de 15 minutos', () => {
    const grade = gradeDoDia(ana, corte, as(0), [], AGORA);
    const status = (h, m = 0) => grade.find((s) => s.inicio.getTime() === as(h, m).getTime()).status;
    assert.equal(status(8, 30), 'passado');
    assert.equal(status(9), 'livre');
    assert.equal(status(11, 45), 'intervalo');
    assert.equal(status(17, 30), 'livre');
    assert.equal(grade.at(-1).inicio.getHours(), 17);
  });

  it('fica vazia em dia sem atendimento', () => {
    assert.equal(gradeDoDia(ana, corte, new Date(2026, 11, 6), [], AGORA).length, 0);
  });
});

describe('validarCancelamento', () => {
  const ag = (inicio) => ({ status: 'CONFIRMADO', inicio, fim: somarMinutos(inicio, 30) });

  it('exige 2h de antecedência', () => {
    assert.match(validarCancelamento(ag(as(9, 30)), AGORA), /2h/);
    assert.equal(validarCancelamento(ag(as(14)), AGORA), null);
  });
});
