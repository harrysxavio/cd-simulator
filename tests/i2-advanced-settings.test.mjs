import test from 'node:test';
import assert from 'node:assert/strict';
import {i2ValidateAdvanced,i2AdvancedPhysicalOptions,I2_DEFAULT_ADVANCED} from '../src/i2-advanced-settings.js';
import {newI2GameState,loadI2GameState,saveI2GameState,normalizeI2GameState,
 I2_GAME_STORAGE_KEY} from '../src/i2-game-state.js';
import {i2MvpPhysicalResult,i2DefaultChoices} from '../src/i2-mvp-adapter.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {i2FirstMissionBriefing} from '../src/i2-first-mission-briefing.js';

test('I2-15: listas cerradas, defaults antiguos y stock físico SKU no agregado',()=>{
 assert.deepEqual(i2ValidateAdvanced(I2_DEFAULT_ADVANCED),I2_DEFAULT_ADVANCED);
 assert.deepEqual(i2AdvancedPhysicalOptions().openingStock,{A:150,B:90,C:55});
 assert.deepEqual(i2AdvancedPhysicalOptions({...I2_DEFAULT_ADVANCED,stockProfile:'low'}).openingStock,
  {A:112,B:67,C:41});
 assert.deepEqual(i2AdvancedPhysicalOptions({...I2_DEFAULT_ADVANCED,stockProfile:'high'}).openingStock,
  {A:187,B:112,C:68});
 for(const invalid of [
  {...I2_DEFAULT_ADVANCED,plannedOrders:999999},
  {...I2_DEFAULT_ADVANCED,pickingLimitSkuPerDay:'0'},
  {...I2_DEFAULT_ADVANCED,stockProfile:'other'},
  {...I2_DEFAULT_ADVANCED,extraCapacityDailyCostCLP:-1},
  {...I2_DEFAULT_ADVANCED,tracking:'exposed'}
 ])assert.throws(()=>i2ValidateAdvanced(invalid),/I2-15/);
});

test('I2-15: migración de partidas v2 preconfiguración, persistencia y replay del mismo caso',()=>{
 const raw=newI2GameState(),legacy={...raw};
 delete legacy.advanced;
 const migrated=normalizeI2GameState(legacy);
 assert.deepEqual(migrated,newI2GameState());
 const custom={...I2_DEFAULT_ADVANCED,plannedOrders:160,pickingLimitSkuPerDay:'40',
  stockProfile:'low',extraCapacityDailyCostCLP:100000};
 const init=newI2GameState({seed:'alpha-case-03',advanced:custom});
 const entries=new Map([['supply-lab-v90','unchanged']]);
 const storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,String(v))};
 saveI2GameState(storage,init);
 assert.deepEqual(loadI2GameState(storage),init);
 assert.equal(entries.get('supply-lab-v90'),'unchanged');
 assert.equal(entries.get(I2_GAME_STORAGE_KEY).includes('tracking'),false);
 assert.equal(i2FirstMissionBriefing(init).plannedOrders,160);
 const replay=navigateI2GameState(init,'restart');
 assert.equal(replay.seed,init.seed);
 assert.deepEqual(replay.advanced,custom);
 assert.equal(normalizeI2GameState({...init,advanced:{...custom,plannedOrders:NaN}}),null);
});

test('I2-15: configuración cambia base canónica y costo sin inventar gasto integral',()=>{
 const choices=i2DefaultChoices();
 const base=i2MvpPhysicalResult({choices,seed:'alpha-case-03'});
 const custom={...I2_DEFAULT_ADVANCED,plannedOrders:160,pickingLimitSkuPerDay:'40',
  stockProfile:'high',extraCapacityDailyCostCLP:50000};
 const a=i2MvpPhysicalResult({choices,seed:'alpha-case-03',advanced:custom,option:'wait'});
 const b=i2MvpPhysicalResult({choices,seed:'alpha-case-03',advanced:custom,option:'wait'});
 assert.deepEqual(a,b,'El mismo plan y semilla da un replay idéntico');
 assert.equal(base.plannedOrders,200);
 assert.equal(base.actualOrders,170);
 assert.equal(a.plannedOrders,160);
 assert.equal(a.actualOrders,136);
 assert.equal(a.shippedOrders+a.pendingOrders,136);
 assert.equal(a.baselineShipped+a.baselinePending,136);
 assert.equal(a.recoveredOrders,0);
 assert.equal(a.unknownTotalCost,true);
 assert.equal(i2SafeScorecard(a).totalCostCLP,null);
 assert.deepEqual(a.skuIds,['A','B','C']);
 const low={...custom,stockProfile:'low'};
 const lowResult=i2MvpPhysicalResult({choices,seed:'alpha-case-03',advanced:low});
 assert.notEqual(lowResult.baselineKey,a.baselineKey,
  'El stock físico configurado debe formar parte de la base inmutable');
 // Un límite físico relevante debe afectar un resultado observable, no solo metadatos.
 const highDemand=i2MvpPhysicalResult({choices,seed:'alpha-case-04',
  advanced:{...I2_DEFAULT_ADVANCED,plannedOrders:240,stockProfile:'high'}});
 const constrained=i2MvpPhysicalResult({choices,seed:'alpha-case-04',
  advanced:{...I2_DEFAULT_ADVANCED,plannedOrders:240,stockProfile:'high',pickingLimitSkuPerDay:'10'}});
 assert.equal(constrained.actualOrders,highDemand.actualOrders);
 assert.ok(constrained.shippedOrders<highDemand.shippedOrders,
  'El límite de 10 unidades SKU/día debe reducir expedición de pedidos completos');
 assert.notEqual(constrained.baselineKey,highDemand.baselineKey);
 // Tarifa diaria: cambia la economía modelada, no existencias ni capacidad.
 const highCost={...custom,extraCapacityDailyCostCLP:100000};
 const x=i2MvpPhysicalResult({choices,seed:'alpha-case-03',advanced:custom,option:'overtime'});
 const y=i2MvpPhysicalResult({choices,seed:'alpha-case-03',advanced:highCost,option:'overtime'});
 assert.equal(x.baselineKey,y.baselineKey);
 assert.equal(x.shippedOrders,y.shippedOrders);
 assert.deepEqual(x.originalPurchaseOrders,y.originalPurchaseOrders);
 assert.ok(y.incrementalExpenseCLP>x.incrementalExpenseCLP);
});
