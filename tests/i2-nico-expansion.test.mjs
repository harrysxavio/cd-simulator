import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
 // En la rama actual aún no hay PNG nuevos, pero este mismo test debe servir
 // después de que el importador active la expansión verificando el manifiesto.
 if(I2_NICO_EXPANSION_READY){
  const base=ROOT+'juego/assets/nico/expansion-2026-10-31/';
  const manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));
  assert.equal(manifest.assets.length,24);
  for(const item of manifest.assets){
   assert.ok(existsSync(base+item.path),'Falta imagen nueva '+item.path);
   assert.equal(createHash('sha256').update(readFileSync(base+item.path)).digest('hex'),
    item.sha256,'Imagen alterada '+item.path);
  }
 }
 assert.equal(I2_NICO_MOMENTS.length>15,true);
 for(const moment of I2_NICO_MOMENTS){
  const image=i2NicoMomentAsset(moment);
  assert.equal(image.ready,I2_NICO_EXPANSION_READY);
  assert.equal(image.src,I2_NICO_EXPANSION_READY?image.desiredSrc:image.fallbackSrc);
  assert.ok(existsSync(ROOT+'juego/'+image.fallbackSrc.slice(2)),
   'El respaldo aprobado debe existir: '+image.fallbackSrc);
  const hypothetical=i2NicoMomentAsset(moment,{published:true});
  assert.equal(hypothetical.src,hypothetical.desiredSrc);
  assert.match(hypothetical.src,/^\.\/assets\/nico\/expansion-2026-10-31\//);
  assert.ok(Object.isFrozen(image));
 }
 assert.throws(()=>i2NicoMomentAsset('invented-secret-reveal'),/Nico/);
});

test('Nico: guía contextual de ocho áreas, sin depender del replay físico',()=>{
 const areas=['commercial','planning','purchasing','receiving','quality',
  'inventory','picking','transport'];
 const images=areas.map(area=>i2NicoMomentAsset('mentor-'+area));
 assert.equal(images.length,8);
 for(const image of images){
  assert.ok(existsSync(ROOT+'juego/'+image.fallbackSrc.slice(2)));
  assert.doesNotMatch(image.desiredSrc,/15_revelacion_demanda|16_evento_inesperado/);
 }
});

test('Nico: los siete pasos del tutorial poseen gesto distinto y seguro',()=>{
 assert.equal(I2_NICO_MANAGER_TOUR.length,7);
 const srcs=I2_NICO_MANAGER_TOUR.map(step=>{
  const image=i2NicoMomentAsset('tour-'+step.id);
  assert.equal(image.ready,I2_NICO_EXPANSION_READY);
  // Un tutorial abierto antes de jugar nunca usa el arte observado de demanda.
  assert.doesNotMatch(image.desiredSrc,/15_revelacion_demanda|16_evento_inesperado/);
  return image.src;
 });
 assert.ok(new Set(srcs).size>=5);
 assert.equal(i2NicoMomentAsset('pre-reveal').ready,I2_NICO_EXPANSION_READY);
 assert.match(i2NicoMomentAsset('observed-demand').desiredSrc,/15_revelacion_demanda/);
 assert.match(i2NicoMomentAsset('incident-observed').desiredSrc,/16_evento_inesperado/);
 assert.match(i2NicoMomentAsset('results-success').desiredSrc,/25_exito/);
});
