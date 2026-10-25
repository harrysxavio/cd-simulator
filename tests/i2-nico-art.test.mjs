import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {I2_NICO_ASSETS_READY,i2NicoPoseAsset,i2NicoSheet} from '../src/i2-nico-art.js';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(readFileSync(new URL('../juego/assets/nico/manifest.json',import.meta.url),'utf8'));
const assetDir=ROOT+'juego/assets/nico/';
test('I2-20 Nico: inventario verificable tanto pendiente como instalado',()=>{
 assert.equal(manifest.files.length,21);
 assert.equal(new Set(manifest.files.map(f=>f.path)).size,21);
 assert.equal(I2_NICO_ASSETS_READY,manifest.status==='VERIFIED_BINARY_ASSETS');
 assert.equal(manifest.files.some(x=>x.path.includes('nico_trabajador_logístico_pixel_art')),false);
 assert.ok(existsSync(ROOT+'juego/nico.svg'));
 for(const f of manifest.files){
  assert.match(f.path,/\.png$/);
  assert.match(f.sha256,/^[a-f0-9]{64}$/);
  if(I2_NICO_ASSETS_READY){
   const path=assetDir+f.path;
   assert.ok(existsSync(path),'Falta PNG original '+f.path);
   assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),f.sha256,
    'El archivo no coincide con SHA-256 original '+f.path);
  }
 }
 if(I2_NICO_ASSETS_READY)assert.equal(manifest.installed_count,21);
});
test('I2-20 Nico: 12 poses y 5 colecciones conservan sus paths con fallback protegido',()=>{
 const poses=['welcome','explanation','hint','doubt','alert','reveal','analysis',
  'good','improvement','deviation','recovery','result'];
 for(const pose of poses){
  const r=i2NicoPoseAsset(pose);
  assert.equal(r.ready,I2_NICO_ASSETS_READY);
  if(I2_NICO_ASSETS_READY){
   assert.match(r.src,/^\.\/assets\/nico\/expresiones\/individual\/[a-z0-9_]+\.png$/);
   assert.ok(existsSync(ROOT+'juego/'+r.src.slice(2)));
  }else assert.equal(r.src,'./nico.svg');
  assert.equal(Object.isFrozen(r),true);
 }
 for(const id of ['commercial','planning','purchasing','receiving','quality','inventory',
  'picking','transport','alerts','kpi','progress']){
  const art=i2NicoSheet(id);
  assert.equal(art.ready,I2_NICO_ASSETS_READY);
  if(I2_NICO_ASSETS_READY){
   assert.match(art.src,/^\.\/assets\/nico\/iconos\/[a-z_]+\.png$/);
   assert.ok(existsSync(ROOT+'juego/'+art.src.slice(2)));
  }else assert.equal(art.src,null);
 }
 assert.throws(()=>i2NicoPoseAsset('secret'),/Nico/);
 assert.throws(()=>i2NicoSheet('secret'),/Nico/);
});
