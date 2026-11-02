import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {I2_CD_ART,I2_CD_AREA_ORDER,I2_CD_IMAGE_COUNT,
 i2CdSceneFor,i2CdTourStages} from '../src/i2-cd-isometric-art.js';

/** Auditoría de los PNG originales; solo lee cabeceras, no modifica archivos. */
test('I2-36: diez PNG originales en ruta única, imagen real y metadatos físicos',()=>{
 assert.equal(I2_CD_IMAGE_COUNT,10);
 assert.deepEqual(I2_CD_AREA_ORDER,[
  'commercial','planning','purchasing','receiving','quality',
  'inventory','picking','transport'
 ]);
 const signatures=new Set();
 const facts=[];
 for(const [key,scene] of Object.entries(I2_CD_ART)){
  assert.match(scene.src,/^\.\/assets\/cd-isometrico\//);
  assert.ok(scene.alt.length>25);
  assert.ok(scene.meaning.length>40);
  assert.ok(scene.question.includes('¿'));
  assert.ok(!signatures.has(scene.file),'Ilustración repetida');
  signatures.add(scene.file);
  const filename='juego/'+scene.src.slice(2);
  const png=readFileSync(filename);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a',key);
  assert.equal(png.toString('ascii',12,16),'IHDR');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  const colour=png.readUInt8(25);
  assert.ok(width>100&&height>100,'Dimensiones inválidas '+key);
  assert.ok(png.length<4_000_000,'PNG excede presupuesto individual '+key);
  facts.push({key,width,height,bytes:png.length,
   pngColourType:colour,hasAlphaChannel:[4,6].includes(colour)});
 }
 assert.equal(facts.length,10);
 console.log('I2-36 CD_ART_PNG_AUDIT '+JSON.stringify(facts));
});

test('I2-36: clasificación administrativa vs física sin resultados de motor',()=>{
 const tour=i2CdTourStages();
 assert.equal(tour.length,8);
 assert.deepEqual(tour.slice(0,3).map(x=>x.kind),
  ['management','management','management']);
 assert.ok(tour.slice(3).every(x=>x.kind==='physical'));
 assert.equal(i2CdSceneFor('monitoring').kind,'management');
 assert.equal(i2CdSceneFor('overview').kind,'map');
 assert.throws(()=>i2CdSceneFor('falso'),/desconocida/);
 assert.ok(i2CdSceneFor('monitoring').meaning.includes('gasto incremental'));
});
