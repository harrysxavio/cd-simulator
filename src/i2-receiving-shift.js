/**
 * I2-35.5c3d · Bounded, dated Receiving overtime after the day-2 dock stop.
 * All capacities and CLP amounts are explicit educational assumptions.
 * The stopped dock does not reopen retroactively; the shift starts day 3.
 */
export const I2_RECEIVING_SHIFT=Object.freeze({
 kind:'receiving-recovery-shift',day:3,
 extraCapacitySkuUnits:80,shiftCostCLP:55000
});
export function i2ValidateReceivingShift(raw,events=[]){
 if(raw===null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)
  ||Object.keys(raw).sort().join(',')!=='day,extraCapacitySkuUnits,kind,shiftCostCLP'
  ||Object.keys(I2_RECEIVING_SHIFT).some(k=>raw[k]!==I2_RECEIVING_SHIFT[k])
  ||!events.some(e=>e.kind==='receiving-stop'&&e.startDay===2
   &&e.startDay+e.durationDays<=I2_RECEIVING_SHIFT.day))
  throw Error('I2-35.5c3d: refuerzo de Recepción inválido o sin incidente del muelle');
 return I2_RECEIVING_SHIFT;
}
