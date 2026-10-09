import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryComparison} from '../src/recovery.js';

test('no intervention leaves purchases and backlog unchanged',()=>{
 const r=recoveryComparison({option:'wait'});
 assert.equal(r.base.completed,r.recovered.completed);
 assert.equal(r.incrementalExpense,0);
 assert.equal(r.recovered.pending,60);
});
test('urgent stock is received after day zero and conserves stock',()=>{
 const r=recoveryComparison({option:'emergency'});
 assert.equal(r.recovered.ledger[0].shipped,r.base.ledger[0].shipped);
 assert.equal(r.recovered.completed,260);
 assert.equal(r.recovered.pending,0);
 assert.ok(r.urgent.every(x=>x.day===1));
 for(const [id,initial] of Object.entries(r.recovered.initial)){
  const ordinary=r.recovered.deliveries.filter(x=>x.id===id&&x.arrivalDay<=r.recovered.days).reduce((n,x)=>n+x.received,0);
  const urgent=r.urgent.filter(x=>x.id===id&&x.day<=r.recovered.days).reduce((n,x)=>n+x.qty,0);
  assert.equal(initial+ordinary+urgent,r.recovered.endingStock[id]+r.recovered.consumed[id]);
 }
});
test('capacity alone cannot fix missing SKU',()=>{
 const r=recoveryComparison({option:'overtime'});
 assert.equal(r.recovered.completed,r.base.completed);
 assert.ok(r.extraLabor>0);
});
test('cash arithmetic and invalid option',()=>{
 const r=recoveryComparison({option:'combined'});
 assert.equal(r.netCashDelta,r.incrementalRevenue-r.incrementalExpense);
 assert.equal(r.incrementalExpense,r.urgentBase+r.urgentSurcharge+r.extraLabor);
 assert.throws(()=>recoveryComparison({option:'other'}),/desconocida/);
});

test('backlog penalty and stock holding proxies reconcile',()=>{
 const wait=recoveryComparison({option:'wait'});
 const urgent=recoveryComparison({option:'emergency'});
 assert.equal(wait.economicProxyDelta,0);
 assert.ok(urgent.penaltySaved>0);
 assert.equal(urgent.economicProxyDelta,urgent.netCashDelta+urgent.penaltySaved-urgent.holdingDelta);
 assert.ok(Number.isFinite(urgent.holdingDelta));
});
test('zero penalty and holding rates collapse proxy to cash delta',()=>{
 const r=recoveryComparison({option:'emergency',latePenaltyPerOrderDay:0,holdingRatePerDay:0});
 assert.equal(r.economicProxyDelta,r.netCashDelta);
 assert.throws(()=>recoveryComparison({latePenaltyPerOrderDay:-1}),/inválidos/);
});

test('same baseline for all recovery alternatives and no retroactive urgent receipt',()=>{
 const opts=['wait','overtime','emergency','combined'];
 const trials=opts.map(option=>recoveryComparison({option,policy:'balanced',actualOrders:260,urgentArrivalDay:13}));
 for(const r of trials){
  assert.equal(r.base.completed,trials[0].base.completed);
  assert.equal(r.recovered.ledger[0].shipped,r.base.ledger[0].shipped);
  assert.equal(r.recovered.completed,r.base.completed);
 }
 assert.equal(trials[2].urgent.every(x=>x.day===13),true);
});

test('urgent purchase coverage scales actual shortages and never exceeds them',()=>{
 const options=[0,25,50,75,100].map(purchaseCoveragePercent=>recoveryComparison({
  option:'emergency',actualOrders:260,urgentArrivalDay:2,purchaseCoveragePercent
 }));
 const quantities=options.map(r=>r.urgent.reduce((a,p)=>a+p.qty,0));
 assert.equal(quantities[0],0);
 assert.ok(quantities[4]>0);
 for(let i=1;i<quantities.length;i++)assert.ok(quantities[i]>=quantities[i-1]);
 assert.ok(options.every((r,i)=>r.purchaseCoveragePercent===i*25));
 assert.ok(options.every(r=>r.recovered.ledger[0].shipped===r.base.ledger[0].shipped));
 assert.ok(options.every(r=>r.recovered.completed+r.recovered.pending===260));
 assert.equal(options[0].urgentBase,0);
 assert.equal(options[0].incrementalExpense,0);
 const less=options[2],full=options[4];
 assert.ok(less.urgentBase<=full.urgentBase);
 assert.ok(less.recovered.completed<=full.recovered.completed);
 assert.throws(()=>recoveryComparison({purchaseCoveragePercent:101}),/Cobertura de compra urgente inválida/);
 assert.throws(()=>recoveryComparison({purchaseCoveragePercent:-1}),/Cobertura de compra urgente inválida/);
 assert.throws(()=>recoveryComparison({purchaseCoveragePercent:12.5}),/Cobertura de compra urgente inválida/);
});


test('Quality-held stock remains financially held inventory, not pickable sales',()=>{
 const r=recoveryComparison({option:'emergency',actualOrders:260,urgentArrivalDay:12,qualityReleasePercent:0});
 const last=r.recovered.ledger.at(-1);
 assert.ok(last.waitingQuality>0);
 const heldValue=Object.entries(last.heldQuality).reduce((sum,[id,qty])=>sum+qty*({A:1800,B:3200,C:6500}[id]),0);
 assert.ok(heldValue>0);
 assert.ok(r.holdingRecovered>0);
 assert.equal(r.economicProxyDelta,r.netCashDelta+r.penaltySaved-r.holdingDelta);
 assert.equal(r.recovered.completed+r.recovered.pending,260);
});
