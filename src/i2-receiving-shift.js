/**
 * I2-35.5c3d · Bounded Receiving shift, with a second, explicitly dated
 * authorization on DAY 3 for DAY 4. This is an educational assumption.
 *
 * The day-2 dock never opens retroactively. A follow-up decision uses the
 * very same physical queue and cost engine, not a new fake KPI.
 */
export const I2_RECEIVING_SHIFT=Object.freeze({
 kind:'receiving-recovery-shift',day:3,
 extraCapacitySkuUnits:80,shiftCostCLP:55000
});
export const I2_RECEIVING_FOLLOWUP_SHIFT=Object.freeze({
 kind:'receiving-recovery-shift',day:4,
 extraCapacitySkuUnits:80,shiftCostCLP:55000
});
export function i2ValidateReceivingShift(raw,events=[]){
 if(raw===null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).sort().join(',')!=='day,extraCapacitySkuUnits,kind,shiftCostCLP')
  throw Error('I2-35.8a: refuerzo de Recepción inválido');
 const template=[I2_RECEIVING_SHIFT,I2_RECEIVING_FOLLOWUP_SHIFT].find(item=>
  Object.keys(item).every(k=>raw[k]===item[k]));
 if(!template||!events.some(e=>e.kind==='receiving-stop'
  &&e.startDay===2&&e.startDay+e.durationDays<=template.day))
  throw Error('I2-35.8a: refuerzo de Recepción no autorizado por incidente de muelle');
 return template;
}
