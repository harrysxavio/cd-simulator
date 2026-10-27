import {i2CompareMultiRecovery,i2EmptyRecoveryActions,
 i2NormalizeMultiRecovery} from './i2-multi-recovery.js';
import {i2ValidateObjectives,I2_GOALS} from './i2-management-objectives.js';

const fail=reason=>{throw new Error('I2-29: '+reason)};
const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  Object.values(value).forEach(deepFreeze);Object.freeze(value);
 }
 return value;
};
const enabled=a=>['urgentPurchase','reserveTransfer','capacityBoost'].filter(id=>
 a[id].enabled);
function withoutAction(a,key){
 return i2NormalizeMultiRecovery({
  urgentPurchase:{...a.urgentPurchase,enabled:key==='urgentPurchase'?false:a.urgentPurchase.enabled},
  reserveTransfer:{...a.reserveTransfer,enabled:key==='reserveTransfer'?false:a.reserveTransfer.enabled},
  capacityBoost:{enabled:key==='capacityBoost'?false:a.capacityBoost.enabled}
 });
}
const equals=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function status(row,budget,target){
 const percent=100*row.dispatchedOrders/row.actualOrders;
 return {
  dispatchPercent:percent,
  meetsServiceTarget:percent>=target,
  expenseWithinTarget:row.incrementalExpenseCLP<=budget,
  excessCLP:Math.max(0,row.incrementalExpenseCLP-budget)
 };
}
/**
 * Compare the frozen scenario against zero, each selected lever, the full
 * combination, and its last-added lever's marginal contribution. Every
 * alternative calls the I2-28 physical engine with ONE original baseline.
 * This is a read-only what-if: I2-30 owns game decision persistence.
 */
export function i2MultiLeverPreview({state,actions,objectives}={}){
 const a=i2NormalizeMultiRecovery(actions??i2EmptyRecoveryActions());
 const obj=i2ValidateObjectives(objectives);
 const active=enabled(a);
 const baseline=i2EmptyRecoveryActions();
 const plans=[baseline],labels=['No intervenir'];
 for(const key of active){
  const single=withoutAction(a,null);
  const isolated=i2NormalizeMultiRecovery({
   urgentPurchase:{...single.urgentPurchase,enabled:key==='urgentPurchase'},
   reserveTransfer:{...single.reserveTransfer,enabled:key==='reserveTransfer'},
   capacityBoost:{enabled:key==='capacityBoost'}
  });
  if(!plans.some(p=>equals(p,isolated))){plans.push(isolated);labels.push({
   urgentPurchase:'Solo compra urgente',reserveTransfer:'Solo traslado de reserva',
   capacityBoost:'Solo refuerzo de capacidad'
  }[key]);}
 }
 if(active.length>=2){plans.push(a);labels.push('Combinación conjunta');}
 const marginalKey=active.at(-1)??null;
 const predecessor=marginalKey?withoutAction(a,marginalKey):baseline;
 if(active.length>=3&&!plans.some(p=>equals(p,predecessor))){
  plans.push(predecessor);labels.push('Sin última palanca');
 }
 if(!Array.isArray(state?.confirmedAreas)||state.confirmedAreas.length!==8
  ||state.reveal!==true)
  fail('solo puedes comparar después de confirmar plan y demanda');
 if(plans.length>8)fail('comparación demasiado grande');
 const multi=i2CompareMultiRecovery({
  state,plans,reservePercent:state.advanced?.reservePercent??0
 });
 const baselineKey=multi.baselineKey;
 const rows=multi.results.map(({reading},i)=>{
  if(reading.baselineKey!==baselineKey||reading.actualOrders!==multi.baseline.actualOrders)
   fail('una alternativa no comparte el baseline');
  return deepFreeze({
   label:labels[i],...reading,
   ...status(reading,obj.incrementalBudgetCLP,
    I2_GOALS[obj.goal].serviceTargetPercent)
  });
 });
 const selected=active.length>=2?rows.find(r=>r.label==='Combinación conjunta')
  :active.length===1?rows.find(r=>r.label!=='No intervenir'):rows[0];
 const marginal=rows.find(row=>equals(row.actions,predecessor));
 if(!selected||!marginal||rows[0].baselineDispatchedOrders!==selected.baselineDispatchedOrders
  ||selected.actualOrders!==rows[0].actualOrders
  ||selected.originalPurchaseCommitmentCLP!==rows[0].originalPurchaseCommitmentCLP)
  fail('resultado y comparaciones no conciliados');
 const delta={
  lever:marginalKey??'none',
  extraDispatchedOrders:selected.dispatchedOrders-marginal.dispatchedOrders,
  extraExpenseCLP:selected.incrementalExpenseCLP-marginal.incrementalExpenseCLP
 };
 const warnings=[
  ...(a.urgentPurchase.enabled&&a.urgentPurchase.arrivalDay>12
   ?['Compra del día '+a.urgentPurchase.arrivalDay+
    ': llega después del corte día 12; no adelanta expediciones.']:[]),
  ...(selected.idleExtraSlots>0
   ?['El refuerzo reservó '+selected.idleExtraSlots+
    ' cupos adicionales ociosos acumulados; su costo no desaparece.']:[]),
  ...(selected.recoveredOrders<=0&&selected.incrementalExpenseCLP>0
   ?['El conjunto tiene gasto incremental sin recuperar pedidos frente a no intervenir.']:[]),
  ...(!selected.expenseWithinTarget
   ?['Sobrepasa tu límite gerencial por '+selected.excessCLP.toLocaleString('es-CL')+
    ' CLP; es una alerta, no un bloqueo ni gasto contable acreditado.']:[]),
  ...(a.reserveTransfer.enabled
   ?['La reserva debe existir desde el inicio y el traslado no crea SKU nuevos.']:[])
 ];
 return deepFreeze({
  scope:'sku-cohort',horizonDays:12,kind:'read-only-comparison',
  selectedCount:active.length,baselineKey,
  targetPercent:I2_GOALS[obj.goal].serviceTargetPercent,
  budgetCLP:obj.incrementalBudgetCLP,rows,selected,marginal:delta,
  warnings,source:multi.source,
  note:'Comparación informativa no confirmada ni guardada. No sumamos resultados individuales: la combinación se ejecutó conjuntamente, una vez, con el mismo stock, órdenes y demanda. Las compras y tarifas son CLP parciales; expedido no significa entregado. Confirmación y persistencia del conjunto: I2-30.'
 });
}
