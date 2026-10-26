import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_NICO_MANAGER_TOUR,i2NicoManagerGuide,I2_NICO_MANAGER_AREAS} from '../src/i2-nico-manager-learning.js';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {ORDER_TEMPLATES,SKU_CATALOG} from '../src/sku.js';
import {newI2GameState} from '../src/i2-game-state.js';

test('Nico gerente: siete capítulos completos, con ejemplo, cliente y límites honestos',()=>{
 assert.equal(I2_NICO_MANAGER_TOUR.length,7);
 assert.equal(new Set(I2_NICO_MANAGER_TOUR.map(x=>x.id)).size,7);
 for(const item of I2_NICO_MANAGER_TOUR){
  for(const field of ['title','body','example','watch','consumer'])
   assert.ok(typeof item[field]==='string'&&item[field].length>=45,field+' '+item.id);
  assert.ok(Object.isFrozen(item));
 }
 const text=JSON.stringify(I2_NICO_MANAGER_TOUR);
 assert.match(text,/SKU/);
 assert.match(text,/doce|12/);
 assert.match(text,/día 13|día 12/i);
 assert.match(text,/cliente|persona|consumidor/i);
 assert.match(text,/gasto incremental/i);
 assert.doesNotMatch(text,/pedidos reales 280|actualOrders|shippedOrders|shockPercent/);
});
test('Nico gerente: ocho áreas × tres niveles y ninguna consulta de resultado',()=>{
 assert.deepEqual(Object.keys(I2_NICO_MANAGER_AREAS),I2_AREAS.map(x=>x.id));
 const state=JSON.stringify(newI2GameState({seed:'alpha-case-05'}));
 for(const area of I2_AREAS){
  const answers=['novato','intermedio','avanzado'].map(level=>i2NicoManagerGuide(area.id,level));
  for(const guide of answers){
   for(const field of ['name','job','controls','metrics','risks','example','question','lens','boundary']){
    assert.ok(typeof guide[field]==='string'&&guide[field].length>25,area.id+' '+field);
   }
   assert.ok(guide.question.endsWith('?'));
   assert.ok(Object.isFrozen(guide));
   assert.doesNotMatch(JSON.stringify(guide),/actualOrders|shockPercent|shippedOrders|280 pedidos/);
  }
  assert.equal(new Set(answers.map(x=>x.lens)).size,3);
 }
 assert.equal(JSON.stringify(newI2GameState({seed:'alpha-case-05'})),state);
 assert.throws(()=>i2NicoManagerGuide('unknown'),/Nico gerente/);
 assert.throws(()=>i2NicoManagerGuide('inventory','random'),/Nico gerente/);
});
test('Ejemplo SKU corresponde a la BOM real y no inventa plazos ni pedidos',()=>{
 const combo=ORDER_TEMPLATES.find(x=>x.id==='combo');
 const c=SKU_CATALOG.find(x=>x.id==='C');
 assert.deepEqual(combo.lines,{A:1,B:1});
 assert.equal(c.leadDays,10);
 assert.match(I2_NICO_MANAGER_TOUR.find(x=>x.id==='sku').example,/1 A y 1 B/);
});
