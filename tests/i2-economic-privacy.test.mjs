import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {i2MvpPhysicalResult} from '../src/i2-mvp-adapter.js';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {measuredCount,addMeasuredCounts} from '../src/measurements.js';
import {newI2GameState,saveI2GameState,I2_GAME_STORAGE_KEY} from '../src/i2-game-state.js';

const base=()=>i2MvpPhysicalResult({option:'wait'});
test('I2-06: canonical SKU measures reconcile and unknown financial totals stay null',()=>{
 const source=base(),s=i2SafeScorecard(source);
 assert.equal(s.scope,'sku-cohort');
 assert.equal(s.horizonDays,12);
 assert.equal(s.status,'revealed-canonical');
 assert.deepEqual(s.shippedOrders,measuredCount(source.shippedOrders,{
  scope:'sku-cohort',unit:'orders',horizonDays:12
 }));
 assert.equal(addMeasuredCounts(s.shippedOrders,s.pendingOrders).value,s.actualOrders.value);
 assert.equal(s.baselineShipped.value+source.baselinePending,s.actualOrders.value);
 assert.equal(s.recoveredOrders.value,s.shippedOrders.value-s.baselineShipped.value);
 assert.equal(s.totalCostCLP,null);
 assert.equal(s.netProfitCLP,null);
 assert.equal(s.ebitdaCLP,null);
 assert.equal(s.customerDeliveredOrders,null);
 assert.match(s.limits.totalCost,/no es cero/);
 assert.match(s.limits.physical,/no entrega final/);
 assert.equal(s.incrementalExpense.kind,'incremental-expense');
 assert.equal(s.committedOriginalPurchases.kind,'purchase-commitment');
 assert.equal(s.economicProxyDelta.kind,'economic-proxy-delta');
 assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.shippedOrders)&&Object.isFrozen(s.limits));
});

test('I2-06: all recovery choices preserve total and avoid declaring modeled CLP as accounting profit',()=>{
 for(const option of ['wait','overtime','reserve','emergency','combined']){
  const source=i2MvpPhysicalResult({option,urgentArrivalDay:2,purchaseCoveragePercent:75});
  const safe=i2SafeScorecard(source);
  assert.equal(safe.actualOrders.value,safe.shippedOrders.value+safe.pendingOrders.value,option);
  assert.equal(safe.actualOrders.value,source.actualOrders);
  assert.equal(safe.incrementalExpense.value,source.incrementalExpenseCLP);
  assert.equal(safe.committedOriginalPurchases.value,source.committedPurchaseCLP);
  assert.equal(safe.economicProxyDelta.value,source.economicProxyDeltaCLP);
  for(const field of ['incrementalExpense','committedOriginalPurchases','economicProxyDelta']){
   assert.equal(safe[field].currency,'CLP');
   assert.equal(safe[field].modeled,true);
   assert.equal(safe[field].partial,true);
  }
  assert.equal(safe.netProfitCLP,null);
 }
});

test('I2-06: malformed scope, counts and finances fail closed rather than render fake gains',()=>{
 const good=base(),bad=[
  {...good,scope:'aggregate-shift'},
  {...good,horizonDays:1},
  {...good,unknownTotalCost:false},
  {...good,shippedOrders:good.shippedOrders+1},
  {...good,recoveredOrders:good.recoveredOrders+1},
  {...good,pendingOrders:-1},
  {...good,actualOrders:1.5},
  {...good,incrementalExpenseCLP:-30},
  {...good,incrementalExpenseCLP:Infinity},
  {...good,incrementalExpenseCLP:NaN},
  {...good,committedPurchaseCLP:undefined},
  {...good,economicProxyDeltaCLP:'100'},
  {...good,economicProxyDeltaCLP:Number.MAX_VALUE}
 ];
 for(const value of bad)assert.throws(()=>i2SafeScorecard(value),/I2-06:/);
 assert.throws(()=>i2SafeScorecard(null),/I2-06:/);
});

test('I2-06: exposed projection is allow-listed; no ledger, customer, tracking or raw aggregate finances',()=>{
 const privateSource={...base(),
  customerName:'Persona privada',
  customerEmail:'private@example.com',
  address:'Calle privada 123',
  trackingNumber:'PII0001',
  originalPurchaseOrders:{raw:{names:['confidential']}},
  scenario:{actualDemand:9999,scope:'aggregate-shift'},
  orders:[{id:'TRACKING-ONE'}]
 };
 const s=i2SafeScorecard(privateSource);
 const flat=JSON.stringify(s);
 for(const prohibited of ['Persona privada','private@example.com','Calle privada',
  'PII0001','TRACKING-ONE','confidential','originalPurchaseOrders',
  'aggregate-shift','scenario','customerName','customerEmail']){
  assert.equal(flat.includes(prohibited),false,'Unexpected disclosure: '+prohibited);
 }
 assert.equal(Object.keys(s).includes('purchaseOrders'),false);
 assert.equal(Object.keys(s).includes('physicalLedger'),false);
 const stored=[];
 const fake={setItem(k,v){stored.push([k,v])}};
 saveI2GameState(fake,{...newI2GameState(),
  customerEmail:'private@example.com',orders:[{tracking:'PII0001'}],
  physicalLedger:privateSource.orders});
 assert.equal(stored.length,1);
 assert.equal(stored[0][0],I2_GAME_STORAGE_KEY);
 // Un parámetro legítimo como plannedOrders no equivale a guardar pedidos,
 // tracking ni un ledger. Validamos estructura y ausencia de PII por separado.
 const saved=JSON.parse(stored[0][1]);
 assert.deepEqual(Object.keys(saved).sort(),[
  'schema','campaignId','seed','phase','substep','index','choices','recovery',
  'arrivalDay','coverage','advanced','confirmedAreas','reveal'
 ].sort());
 assert.deepEqual(Object.keys(saved.advanced).sort(),[
  'plannedOrders','pickingOperators','stockProfile','extraCapacityDailyCostCLP'
 ].sort());
 assert.doesNotMatch(stored[0][1],
  /tracking|customer|physicalLedger|private@example.com|PII0001|confidential/i);
});

test('I2-06: Pages verifier checks current served module chain, not the removed direct dependency',()=>{
 const root=new URL('../',import.meta.url);
 const js=readFileSync(new URL('juego/app.js',root),'utf8');
 const adapter=readFileSync(new URL('src/i2-mvp-adapter.js',root),'utf8');
 const shared=readFileSync(new URL('src/i2-game-campaign-adapter.js',root),'utf8');
 const state=readFileSync(new URL('src/i2-game-state.js',root),'utf8');
 const boundary=readFileSync(new URL('src/i2-result-boundary.js',root),'utf8');
 const verifier=readFileSync(new URL('scripts/verify-pages.mjs',root),'utf8');
 assert.match(js,/from '\.\.\/src\/i2-result-boundary\.js'/);
 assert.match(adapter,/from '\.\/i2-game-campaign-adapter\.js'/);
 assert.match(shared,/from '\.\/campaign-contract\.js'/);
 assert.match(state,/loadI2GameState/);
 assert.match(boundary,/i2SafeScorecard/);
 for(const path of ['src/i2-mvp-adapter.js','src/i2-game-campaign-adapter.js',
  'src/i2-game-state.js','src/i2-result-boundary.js']){
  assert.ok(verifier.includes('req(\''+path+'\',attempt)'),'Verifier not fetching '+path);
 }
 assert.ok(!verifier.includes("adapterJs.includes('campaignSkuContract')"),
  'Do not check obsolete direct import that caused Pages CI false failure');
});
