import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {I2_NICO_ASSETS_READY,i2NicoPoseAsset,i2NicoSheet} from '../src/i2-nico-art.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('../juego/assets/nico/manifest.json',import.meta.url),'utf8'));
test('I2-20 Nico: 21 assets inventariados sin fingir subida binaria',()=>{
 assert.equal(manifest.files.length,21);
 assert.equal(new Set(manifest.files.map(f=>f.path)).size,21);
 assert.equal(I2_NICO_ASSETS_READY,manifest.status==='VERIFIED_BINARY_ASSETS');
 assert.equal(I2_NICO_ASSETS_READY,false,'Los originales se activan SOLO tras instalar ZIP');
 assert.equal(manifest.files.some(x=>x.path.includes('nico_trabajador_logístico_pixel_art')),false);
 assert.ok(existsSync(ROOT+'juego/nico.svg'));
 for(const f of manifest.files){
  assert.match(f.path,/\.png$/);
  assert.match(f.sha256,/^[a-f0-9]{64}$/);
 }
});
test('I2-20 Nico: 12 poses estables y iconos de las 8 áreas',()=>{
 for(const [pose] of [['welcome'],['explanation'],['hint'],['doubt'],['alert'],
  ['reveal'],['analysis'],['good'],['improvement'],['deviation'],['recovery'],['result']]){
  const r=i2NicoPoseAsset(pose);
  assert.equal(r.ready,false);
  assert.equal(r.src,'./nico.svg');
  assert.equal(Object.isFrozen(r),true);
 }
 for(const id of ['commercial','planning','purchasing','receiving','quality','inventory',
  'picking','transport','alerts','kpi','progress']){
  const art=i2NicoSheet(id);
  assert.equal(art.ready,false);
  assert.equal(art.src,null);
 }
 assert.throws(()=>i2NicoPoseAsset('secret'),/Nico/);
 assert.throws(()=>i2NicoSheet('secret'),/Nico/);
});
