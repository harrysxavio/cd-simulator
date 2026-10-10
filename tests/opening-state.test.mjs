import test from 'node:test';
import assert from 'node:assert/strict';
import {skuOpeningState} from '../src/opening-state.js';
import {campaignSkuContract} from '../src/campaign-contract.js';
import {recoveryComparison} from '../src/recovery.js';
import {campaignSnapshot} from '../src/campaign.js';
import {campaignAreaReadModel} from '../src/area-ledger.js';

const base={policy:'service',plannedOrders:200,actualOrders:280,plannedForecastPercent:80,planningCoveragePercent:70};
const sum=x=>Object.values(x).reduce((n,v)=>n+v,0);

test('M2-02: opening and located reserve partition exactly one physical stock',()=>{
 const o=skuOpeningState({reservePercent:30});
 assert.deepEqual(o.openingBySku,{A:150,B:90,C:55});
 assert.deepEqual(o.reserveBySku,{A:45,B:27,C:16});
 assert.deepEqual(o.pickFaceBySku,{A:105,B:63,C:39});
 assert.equal(o.totals.physicalSkuUnits,295);
 assert.equal(o.totals.reserveSkuUnits+o.totals.pickFaceSkuUnits,295);
 assert.equal(o.openingDay,-1);
 assert.ok(Object.isFrozen(o)&&Object.isFrozen(o.openingBySku));
 assert.throws(()=>{o.openingBySku.A=999},TypeError);
});

test('M2-02: explicit physical SKU stock is not replaced with legacy aggregate stock',()=>{
 const stock={A:40,B:20,C:5};
 const o=skuOpeningState({stock,reservePercent:50});
 assert.deepEqual(o.openingBySku,stock);
 assert.deepEqual(o.reserveBySku,{A:20,B:10,C:2});
 assert.equal(o.totals.physicalSkuUnits,65);
 stock.A=9999;
 assert.equal(o.openingBySku.A,40,'opening must not alias caller');
});

test('M2-02: opening source rejects negative, fractional or unknown SKU quantities',()=>{
 for(const stock of [{A:-1},{A:1.2},{A:'2'},{D:10},[],42]){
  assert.throws(()=>skuOpeningState({stock}),/apertura|Stock SKU|Apertura física|Cantidad inicial/i);
 }
 for(const reservePercent of [-1,51,0.1])assert.throws(()=>skuOpeningState({reservePercent}),/reserva física/);
});

test('M2-02: planning, surprise, recovery and area report use identical opening',()=>{
 const contract=campaignSkuContract({decisions:{commercial:'under',planning:'partial',purchasing:'reliable'},
  scenario:{demand:1000,actualDemand:1400,lockUpstream:true},campaignId:'OPEN-1'});
 assert.equal(contract.openingState.totals.physicalSkuUnits,295);
 assert.deepEqual(contract.skuInputs.stock,contract.openingState.openingBySku);
 for(const option of ['wait','reserve','emergency','combined']){
  const comparison=recoveryComparison({...contract.skuInputs,option,reservePercent:30,urgentArrivalDay:2});
  const snapshot=campaignSnapshot({comparison,campaignId:contract.campaignId,plannedOrders:200});
  const areas=campaignAreaReadModel({comparison,campaign:snapshot,campaignId:contract.campaignId,plannedOrders:200});
  assert.equal(snapshot.passed,true);
  assert.equal(areas.passed,true);
  assert.equal(areas.checks.sameOpening,true);
  assert.deepEqual(snapshot.inventory.initial,contract.skuInputs.stock);
  assert.equal(areas.openingState,snapshot.openingState);
  assert.equal(snapshot.inventory.initial,snapshot.openingState.openingBySku);
  assert.equal(snapshot.inventory.openingReserve,snapshot.openingState.reserveBySku);
  for(const simulation of [comparison.integrated.planned,comparison.base,comparison.recovered]){
   assert.deepEqual(simulation.initial,contract.skuInputs.stock);
  }
  assert.equal(sum(comparison.reserveStock)+sum(comparison.openingState.pickFaceBySku),295);
 }
});

test('M2-02: custom stock is propagated to original purchasing and subsequent simulations',()=>{
 const stock={A:0,B:20,C:40};
 const p=recoveryComparison({...base,stock,option:'reserve',reservePercent:25,urgentArrivalDay:1});
 const snapshot=campaignSnapshot({comparison:p,campaignId:'STOCK-2',plannedOrders:200});
 assert.equal(snapshot.passed,true);
 assert.deepEqual(p.openingState.openingBySku,stock);
 assert.deepEqual(p.integrated.planned.initial,stock);
 assert.deepEqual(p.base.initial,stock);
 assert.deepEqual(p.recovered.initial,stock);
 assert.deepEqual(snapshot.inventory.initial,stock);
 assert.equal(p.originalPurchase.A>0,true,'planning must order A against zero initial stock');
 assert.equal(snapshot.openingState.totals.physicalSkuUnits,60);
 assert.ok(snapshot.inventory.bySku.every(s=>s.opening+s.received===s.dispatched+s.available+s.held+s.reserved));
});

test('M2-02: mutate replay opening -> fail before presenting false campaign',()=>{
 const p=recoveryComparison({...base,option:'wait'});
 const changed={...p,recovered:{...p.recovered,initial:{...p.recovered.initial,A:999}}};
 assert.throws(()=>campaignSnapshot({comparison:changed,campaignId:'INVALID-OPEN',plannedOrders:200}),/apertura y reserva SKU/);
});
