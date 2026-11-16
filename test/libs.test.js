import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatarTempo, paraSrt, paraVtt, quebrarLinhas } from '../js/lib/legendas.js';
import { formatDuration, thumbnailTimestamps } from '../js/lib/thumbnails.js';
import { analisarUserAgent, gerarCodigo, origem, paisPorIdioma } from '../js/lib/useragent.js';

describe('legendas', () => {
  it('formata tempo para SRT e VTT', () => {
    assert.equal(formatarTempo(3661.5), '01:01:01,500');
    assert.equal(formatarTempo(1.25, '.'), '00:00:01.250');
  });

  it('gera SRT e VTT', () => {
    const segs = [{ inicio: 0, fim: 2.5, texto: ' Olá, mundo! ' }];
    assert.equal(paraSrt(segs), '1\n00:00:00,000 --> 00:00:02,500\nOlá, mundo!\n');
    assert.ok(paraVtt(segs).startsWith('WEBVTT\n\n00:00:00.000 --> 00:00:02.500'));
  });

  it('quebra linhas longas', () => {
    const linhas = quebrarLinhas('uma frase bem longa que precisa ser quebrada em mais de uma linha', 20).split('\n');
    assert.ok(linhas.length > 1 && linhas.every((l) => l.length <= 20));
  });
});

describe('thumbnails', () => {
  it('distribui capturas com margem de 10%', () => {
    assert.deepEqual(thumbnailTimestamps(100, 3), [10, 50, 90]);
    assert.equal(formatDuration(65), '01:05');
  });
});

describe('useragent', () => {
  it('identifica navegador e dispositivo', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    assert.deepEqual(analisarUserAgent(iphone), { navegador: 'Safari', sistema: 'iOS', dispositivo: 'Celular', bot: false });
    assert.equal(analisarUserAgent('WhatsApp/2.24 A').bot, true);
  });

  it('país pelo idioma e origem pelo referer', () => {
    assert.equal(paisPorIdioma('pt-BR'), 'BR');
    assert.equal(origem('https://www.instagram.com/x'), 'instagram.com');
  });

  it('gera códigos base62', () => {
    assert.match(gerarCodigo(9), /^[A-Za-z0-9]{9}$/);
  });
});
