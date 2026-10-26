/**
 * M4-17: charge the EXTRA modeled dispatch/picking capacity only on dates
 * when that resource was actually activated for an operational shift.
 *
 * One recovery option selects a conditional, daily, on-demand reinforcement.
 * Do not pretend that a hypothetical maximum capacity is a payroll entry or
 * person-hours. A deployed shift is charged even when the added slots are
 * under-utilized. No activity means no deployed/charged shift.
 *
 * This reads the already simulated, date-stamped events. It never generates
 * additional movements or changes baseline/urgent purchase commitments.
 */
const fail=reason=>{throw new Error('Costo operacional SKU: '+reason)};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const frozen=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))frozen(child);
  Object.freeze(value);
 }
 return value;
};

/**
 * "Used slots" are an operational utilization indicator, not causal proof
 * that an additional worker created an extra order.
 */
export function operationalCapacityCostReadModel({
 recovered,baseline,extraCapacity=0,dailyCapacity,
 extraCapacityDailyCost,option
}={}){
 if(!recovered||!baseline||!['wait','reserve','overtime','emergency','combined','multi'].includes(option)
  ||!integer(extraCapacity)||!integer(dailyCapacity)
  ||!amount(extraCapacityDailyCost)
  ||!integer(recovered.days)||recovered.days>365
  ||!Array.isArray(recovered.ledger)||!Array.isArray(baseline.ledger)
  ||recovered.days!==baseline.days
  ||recovered.ledger.length!==recovered.days+1
  ||baseline.ledger.length!==recovered.days+1
  ||(option!=='multi'&&((option==='overtime'||option==='combined')!==(extraCapacity>0)))){
  fail('opción, recursos o calendario incompatibles');
 }
 const rows=[];
 for(let i=0;i<recovered.ledger.length;i++){
  const r=recovered.ledger[i],b=baseline.ledger[i];
  if(r?.day!==i||b?.day!==i
   ||![r.pickedOrders,r.shipped,b.pickedOrders,b.shipped].every(integer)
   ||r.pickedOrders>dailyCapacity+extraCapacity
   ||r.shipped>dailyCapacity+extraCapacity
   ||b.pickedOrders>dailyCapacity||b.shipped>dailyCapacity){
   fail('actividad física diaria incompatible con capacidades');
  }
  // An additional team is commissioned for a date only if actual Picking
  // or dispatch work exists. It remains payable when it handled fewer than
  // the reserved additional slots, so overinvestment is not hidden.
  const activated=extraCapacity>0&&(r.pickedOrders>0||r.shipped>0);
  const assignedExtraSlots=activated?extraCapacity:0;
  const utilizedExtraSlots=activated?Math.max(0,
   Math.max(r.pickedOrders,r.shipped)-dailyCapacity):0;
  if(utilizedExtraSlots>assignedExtraSlots)fail('capacidad adicional utilizada sin refuerzo');
  const idleExtraSlots=assignedExtraSlots-utilizedExtraSlots;
  const costCLP=activated?extraCapacityDailyCost:0;
  rows.push({
   day:i,activated,assignedExtraSlots,utilizedExtraSlots,idleExtraSlots,
   baselinePickedOrders:b.pickedOrders,baselineShippedOrders:b.shipped,
   pickedOrders:r.pickedOrders,shippedOrders:r.shipped,
   chargeableShiftCount:activated?1:0,costCLP
  });
 }
 const totalCostCLP=rows.reduce((n,x)=>n+x.costCLP,0);
 const chargeableShifts=rows.reduce((n,x)=>n+x.chargeableShiftCount,0);
 const assignedExtraSlots=rows.reduce((n,x)=>n+x.assignedExtraSlots,0);
 const utilizedExtraSlots=rows.reduce((n,x)=>n+x.utilizedExtraSlots,0);
 const idleExtraSlots=rows.reduce((n,x)=>n+x.idleExtraSlots,0);
 if(!amount(totalCostCLP)||!integer(assignedExtraSlots)
  ||!integer(utilizedExtraSlots)||!integer(idleExtraSlots)
  ||assignedExtraSlots!==utilizedExtraSlots+idleExtraSlots
  ||Math.abs(totalCostCLP-chargeableShifts*extraCapacityDailyCost)>0.000001){
  fail('conciliación de turnos y CLP inválida');
 }
 return frozen({
  passed:true,scope:'sku-cohort',currency:'CLP',
  horizonDays:recovered.days,option,
  chargePolicy:'on-demand-deployed-shift',
  rateCLPPerActivatedShift:extraCapacityDailyCost,
  extraCapacityOrdersPerDay:extraCapacity,
  baselineCapacityOrdersPerDay:dailyCapacity,
  daily:rows,
  totals:{
   chargeableShifts,unactivatedDays:rows.length-chargeableShifts,
   assignedExtraSlots,utilizedExtraSlots,idleExtraSlots,totalCostCLP
  },
  checks:{sameCampaignDays:true,noChargeWithoutDeployment:true,
   chargesReconcile:true,idleCapacityVisible:true},
  accountingStatus:'illustrative-incremental-resource-cost-not-payroll',
  actualHoursWorked:null,actualEmployeesHired:null,actualPayrollPaidCLP:null,
  note:'Se cobra una jornada completa de refuerzo solo cuando hay tareas de Picking o expedición en ese día. Al activarse, se cobra incluso si parte de la capacidad contratada queda ociosa. Las posiciones son cupos máximos de pedidos por jornada, no horas ni personas verificadas. Costos de dotación base, Recepción, Calidad, inventario, empaque y transporte permanecen sin calibración SKU. No constituye nómina ni pago bancario.'
 });
}
