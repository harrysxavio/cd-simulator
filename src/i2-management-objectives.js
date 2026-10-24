/**
 * I2-14 · Small managerial targets. These are evaluation preferences only.
 * They never enter SKU procurement, demand, physical events or cost engines.
 * A budget limit is for known incremental *modeled* expense, not full P&L.
 */
export const I2_OBJECTIVES_KEY='supply-lab-i2-objectives-v1';
export const I2_GOALS=Object.freeze({
 service:Object.freeze({label:'Priorizar servicio',serviceTargetPercent:95}),
 balanced:Object.freeze({label:'Equilibrar servicio y gasto',serviceTargetPercent:90}),
 cost:Object.freeze({label:'Controlar gasto',serviceTargetPercent:85})
});
export const I2_BUDGET_CHOICES=Object.freeze([0,50000,150000,300000,600000]);
export const I2_DEFAULT_OBJECTIVES=Object.freeze({
 goal:'balanced',incrementalBudgetCLP:150000
});
export function i2ValidateObjectives(value){
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||!Object.hasOwn(I2_GOALS,value.goal)
  ||!I2_BUDGET_CHOICES.includes(value.incrementalBudgetCLP)){
  throw new Error('I2-14: metas o presupuesto inválidos');
 }
 return Object.freeze({
  goal:value.goal,incrementalBudgetCLP:value.incrementalBudgetCLP
 });
}
export function i2ReadObjectives(storage){
 try{
  const value=storage.getItem(I2_OBJECTIVES_KEY);
  return value===null?I2_DEFAULT_OBJECTIVES:
   i2ValidateObjectives(JSON.parse(value));
 }catch{return I2_DEFAULT_OBJECTIVES}
}
export function i2SaveObjectives(storage,value){
 const safe=i2ValidateObjectives(value);
 storage.setItem(I2_OBJECTIVES_KEY,JSON.stringify(safe));
 return safe;
}
function status(value,green,amber){
 return value>=green?'green':value>=amber?'amber':'red';
}
export function i2EvaluateObjectives(score,objectives=I2_DEFAULT_OBJECTIVES){
 const cfg=i2ValidateObjectives(objectives);
 if(score?.status!=='revealed-canonical'||score.scope!=='sku-cohort'
  ||score.horizonDays!==12||!Number.isSafeInteger(score.actualOrders?.value)
  ||score.actualOrders.value<=0||!Number.isSafeInteger(score.shippedOrders?.value)
  ||score.shippedOrders.value<0||score.shippedOrders.value>score.actualOrders.value
  ||score.incrementalExpense?.kind!=='incremental-expense'
  ||score.incrementalExpense.currency!=='CLP'
  ||score.incrementalExpense.scope!=='sku-cohort'
  ||typeof score.incrementalExpense.value!=='number'
  ||!Number.isFinite(score.incrementalExpense.value)
  ||score.incrementalExpense.value<0){
  throw new Error('I2-14: evaluación no verificable');
 }
 const pct=100*score.shippedOrders.value/score.actualOrders.value;
 const target=I2_GOALS[cfg.goal].serviceTargetPercent;
 const budget=cfg.incrementalBudgetCLP,expense=score.incrementalExpense.value;
 const service=status(pct,target,Math.max(0,target-10));
 const cost=expense<=budget?'green':expense<=budget*1.1?'amber':'red';
 return Object.freeze({
  goal:cfg.goal,
  service:Object.freeze({
   status:service,actualPercent:pct,targetPercent:target,
   description:service==='green'?'Meta de expedición cumplida':
    service==='amber'?'Servicio cerca de la meta':'Servicio bajo la meta',
   source:'pedidos completos expedidos / pedidos reales; día 12'
  }),
  expense:Object.freeze({
   status:cost,valueCLP:expense,budgetCLP:budget,
   varianceCLP:expense-budget,
   description:cost==='green'?'Dentro del límite incremental modelado':
    cost==='amber'?'Ligero exceso del presupuesto':'Presupuesto incremental sobrepasado',
   source:'gasto incremental SKU modelado; no costo total ni caja pagada'
  }),
  allGreen:service==='green'&&cost==='green',
  missing:Object.freeze(['productividad por hora-persona','costo integral operativo','utilidad neta'])
 });
}
