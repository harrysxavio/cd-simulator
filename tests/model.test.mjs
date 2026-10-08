// Ejecutar con Node.js 22+: node --test tests/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {flow} from '../src/flow.js';
import {DEFAULT_SCENARIO,finance,cleanScenario} from '../src/scenario.js';
import {START} from '../src/engine.js';

const scenario={...DEFAULT_SCENARIO};
const run=(decisions=START,actions={},config=scenario)=>{
 const output=flow(decisions,actions,config);
 return {output,cost:finance(output,config)};
};
const almost=(a,b)=>assert.ok(Math.abs(a-b)<0.00001, `${a} !== ${b}`);

test('el flujo no crea unidades en las etapas físicas',()=>{
 const {output:r}=run();
 assert.ok(r.received<=r.delivered);
 assert.ok(r.released<=r.received);
 assert.ok(r.picked<=r.available);
 assert.ok(r.dispatched<=r.picked);
 assert.equal(r.pending+r.dispatched,r.demand);
});
test('compras urgentes tienen un costo adicional explícito',()=>{
 const {output:r,cost:f}=run({...START,purchasing:'express'});
 assert.equal(f.urgentSurcharge,r.received*scenario.urgentPurchaseSurcharge);
 assert.ok(f.urgentSurcharge>0);
});
test('los costos de mercancía y los desembolsos son diferentes',()=>{
 const {cost:f}=run();
 almost(f.total,f.costOfGoods+f.operationalExpenses);
 almost(f.cashOutflow,f.operationalExpenses+f.purchase);
 almost(f.margin,f.revenue-f.total);
});
test('el inventario inicial se valoriza en el costo de mercancía',()=>{
 const {output:r,cost:f}=run();
 assert.equal(f.initialConsumed,Math.min(r.dispatched,r.stock+r.eligibleReserve));
 assert.equal(f.costOfGoods,f.initialConsumed*scenario.initialStockUnitCost+f.newlyConsumed*scenario.unitPurchaseCost);
});
test('toda medida de recuperación con gasto tiene costo explícito',()=>{
 const base=run();
 for(const id of ['commercial','planning','purchasing','receiving','quality','inventory','picking','transport']){
 const next=run(START,{[id]:id==='inventory'?100:20});
 assert.ok(next.cost.actionCostTotal+next.cost.recoveryLaborTotal>0,`sin costo: ${id}`);
 assert.ok(next.cost.total>=base.cost.total-100000,`costo inesperado: ${id}`);
 }
});
test('el refuerzo de modo especial cuesta más que la opción normal',()=>{
 for(const [id,value] of Object.entries({receiving:'extra',quality:'priority',inventory:'count',picking:'reinforce',transport:'extra'})){
 const next=run({...START,[id]:value});
 assert.ok(next.cost.modeCosts[id]>0,`sin recargo: ${id}`);
 }
});
test('no hay productividad ficticia sin dotación',()=>{
 const {output:r}=run(START,{}, {...scenario,receivingOperators:0,pickingOperators:0,inventoryOperators:0});
 assert.equal(r.dispatched,0);
});
test('las capacidades configurables permiten escenarios grandes',()=>{
 const r=run({...START,values:{receiving:10000,picking:10000,transport:10000}}, {}, {...scenario,demand:10000,receivingOperators:20,pickingOperators:30,inventoryOperators:40}).output;
 assert.equal(r.stages[7].capacity,10000);
 assert.equal(r.stages[3].capacity,100000);
});
test('configuración inválida no genera NaN ni valores negativos',()=>{
 const c=cleanScenario({demand:-100,unitPrice:'incorrecto',receivingOperators:-5});
 const {output:r,cost:f}=run(START,{},c);
 assert.ok(r.demand>0);
 assert.ok(Object.values(f).filter(v=>typeof v==='number').every(Number.isFinite));
 assert.ok(f.total>=0);
});
test('recuperar forecast sobreestimado no debe aumentarlo',()=>{
 const before=run({...START,values:{commercial:140}}).output;
 const after=run({...START,values:{commercial:140}},{commercial:40}).output;
 assert.equal(before.estimated,1400);
 assert.equal(after.estimated,1000);
});
