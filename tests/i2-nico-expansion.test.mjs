import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {I2_NICO_MANAGER_TOUR} from '../src/i2-nico-manager-learning.js';
import {I2_NICO_EXPANSION_READY,I2_NICO_EXPANSION_CATALOG,
 I2_NICO_MOMENTS,i2NicoMomentAsset} from '../src/i2-nico-expansion.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));

test('Nico: 24 tarjetas están catalogadas sin activar URLs ausentes',()=>{
 const assets=Object.values(I2_NICO_EXPANSION_CATALOG);
 assert.equal(assets.length,24);
 assert.equal(new Set(assets).size,24);
 for(const path of assets){
  assert.match(path,/^(escenas|gestion|resultados|gestos)\/[a-z0-9_]+\.png$/);
 }
 // Esta revisión de integración no carga los archivos binarios aún.
 assert.equal(I2_NICO_EXPANSION_READY,false);
 assert.equal(I2_NICO_MOMENTS.length>15,true);
 for(const moment of I2_NICO_MOMENTS){
  const image=i2NicoMomentAsset(moment);
  assert.equal(image.ready,false);
  assert.equal(image.src,image.fallbackSrc);
  assert.ok(existsSync(ROOT+'juego/'+image.src.slice(2)),
   'El respaldo ya publicado debe existir: '+image.src);
  const hypothetical=i2NicoMomentAsset(moment,{published:true});
  assert.equal(hypothetical.src,hypothetical.desiredSrc);
  assert.match(hypothetical.src,/^\.\/assets\/nico\/expansion-2026-10-31\//);
  assert.ok(Object.isFrozen(image));
 }
 assert.throws(()=>i2NicoMomentAsset('invented-secret-reveal'),/Nico/);
});

test('Nico: los siete pasos del tutorial poseen gesto distinto y seguro',()=>{
 assert.equal(I2_NICO_MANAGER_TOUR.length,7);
 const srcs=I2_NICO_MANAGER_TOUR.map(step=>{
  const image=i2NicoMomentAsset('tour-'+step.id);
  assert.equal(image.ready,false);
  // Un tutorial abierto antes de jugar nunca usa el arte observado de demanda.
  assert.doesNotMatch(image.desiredSrc,/15_revelacion_demanda|16_evento_inesperado/);
  return image.src;
 });
 assert.ok(new Set(srcs).size>=5);
 assert.equal(i2NicoMomentAsset('pre-reveal').ready,false);
 assert.match(i2NicoMomentAsset('observed-demand').desiredSrc,/15_revelacion_demanda/);
 assert.match(i2NicoMomentAsset('incident-observed').desiredSrc,/16_evento_inesperado/);
 assert.match(i2NicoMomentAsset('results-success').desiredSrc,/25_exito/);
});
