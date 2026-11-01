import test from 'node:test';
import assert from 'node:assert/strict';
import {i2NicoMomentAsset} from '../src/i2-nico-expansion.js';

/**
 * Context is only selected after physical observation. The art resolver
 * itself must not inspect demand or invent inventory/cost values.
 */
test('I2 Nico expansion: daily and quality checkpoints select appropriate art',()=>{
 const expected={
  'daily-normal':'14_presentar_informacion.png',
  'daily-interruption':'32_preocupacion.png',
  'daily-quality-bridge':'17_explicar_impacto.png',
  'incident-quality-decision':'29_idea.png'
 };
 for(const [moment,file] of Object.entries(expected)){
  const resolved=i2NicoMomentAsset(moment);
  assert.equal(resolved.ready,true);
  assert.ok(resolved.src.endsWith(file),moment+' incorrect image');
  assert.match(resolved.src,/^\.\/assets\/nico\/expansion-2026-10-31\//);
  assert.match(resolved.fallbackSrc,/^\.\/assets\/nico\/expresiones\/individual\//);
  assert.ok(Object.isFrozen(resolved));
 }
 assert.notEqual(i2NicoMomentAsset('daily-quality-bridge').src,
  i2NicoMomentAsset('daily-normal').src);
 assert.doesNotMatch(i2NicoMomentAsset('daily-normal').src,
  /15_revelacion_demanda|16_evento_inesperado|25_exito/);
});
