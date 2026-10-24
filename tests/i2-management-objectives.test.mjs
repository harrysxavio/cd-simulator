import test from 'node:test';
import assert from 'node:assert/strict';
import {i2SafeScorecard} from '../src/i2-result-boundary.js';
import {I2_OBJECTIVES_KEY,I2_DEFAULT_OBJECTIVES,i2ValidateObjectives,
 i2ReadObjectives,i2SaveObjectives,i2EvaluateObjectives} from '../src/i2-management-objectives.js';

const result={scope:'sku-cohort',horizonDays:12,unknownTotalCost:true,
 plannedOrders:200,actualOrders:200,baselineShipped:180,baselinePending:20,
 shippedOrders:196,pendingOrders:4,recoveredOrders:16,
 incrementalExpenseCLP:125000,committedPurchaseCLP:90000,economicProxyDeltaCLP:6000};
const score=i2SafeScorecard(result);
test('I2-14: goals and budgets grade service and incremental expense independently',()=>{
 const balanced=i2EvaluateObjectives(score);
 assert.equal(balanced.service.status,'green'); // 98 >= 90
 assert.equal(balanced.expense.status,'green'); // 125k <= 150k
 assert.equal(balanced.allGreen,true);
 const strict=i2EvaluateObjectives(score,{goal:'service',incrementalBudgetCLP:50000});
 assert.equal(strict.service.actualPercent,98);
 assert.equal(strict.service.targetPercent,95);
 assert.equal(strict.service.status,'green');
 assert.equal(strict.expense.status,'red');
 assert.equal(strict.expense.valueCLP,125000);
 assert.equal(strict.allGreen,false,'100% shipping cannot cancel expensive recovery');
 assert.equal(strict.expense.varianceCLP,75000);
 const zero=i2EvaluateObjectives(score,{goal:'cost',incrementalBudgetCLP:0});
 assert.equal(zero.expense.status,'red');
 assert.equal(zero.service.targetPercent,85);
 const light=i2EvaluateObjectives(i2SafeScorecard({...result,shippedOrders:174,
 pendingOrders:26,recoveredOrders:-6,incrementalExpenseCLP:0}),{goal:'service',incrementalBudgetCLP:0});
 assert.equal(light.service.status,'amber');
 assert.equal(light.expense.status,'green');
 assert.equal(light.allGreen,false);
 const risk=i2EvaluateObjectives(i2SafeScorecard({...result,shippedOrders:100,
 pendingOrders:100,recoveredOrders:-80,incrementalExpenseCLP:60001}),{goal:'service',incrementalBudgetCLP:50000});
 assert.equal(risk.service.status,'red');
 assert.equal(risk.expense.status,'red');
 assert.equal(risk.missing.includes('utilidad neta'),true);
 assert.equal(score.totalCostCLP,null);
});
test('I2-14: save, validate and restore preference without touching original simulation',()=>{
 const rows=new Map([['supply-lab-v90','legacy'],['supply-lab-i2-v1','game']]);
 const storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)};
 assert.deepEqual(i2ReadObjectives(storage),I2_DEFAULT_OBJECTIVES);
 const objective={goal:'cost',incrementalBudgetCLP:300000};
 assert.deepEqual(i2SaveObjectives(storage,objective),objective);
 assert.deepEqual(i2ReadObjectives(storage),objective);
 assert.equal(rows.get('supply-lab-v90'),'legacy');
 assert.equal(rows.get('supply-lab-i2-v1'),'game');
 assert.ok(rows.has(I2_OBJECTIVES_KEY));
 assert.throws(()=>i2ValidateObjectives({goal:'unknown',incrementalBudgetCLP:300000}),/I2-14/);
 assert.throws(()=>i2ValidateObjectives({goal:'cost',incrementalBudgetCLP:Infinity}),/I2-14/);
 assert.throws(()=>i2EvaluateObjectives({scope:'aggregate-shift'},objective),/I2-14/);
 rows.set(I2_OBJECTIVES_KEY,'{broken');
 assert.deepEqual(i2ReadObjectives(storage),I2_DEFAULT_OBJECTIVES);
 assert.deepEqual(i2ReadObjectives({getItem(){throw Error('blocked')}}),I2_DEFAULT_OBJECTIVES);
});
