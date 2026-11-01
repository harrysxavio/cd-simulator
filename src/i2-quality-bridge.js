/**
 * I2-35.5c3c · One optional and explicitly educational Quality recovery shift.
 * This does not cancel an external quality stop. A separate qualified line
 * may clear up to 80 physical SKU units on day 5 at a committed CLP shift cost.
 * These fixed values are scenario assumptions, NOT real Chilexpress tariffs.
 */
export const I2_QUALITY_BRIDGE=Object.freeze({
 kind:'quality-certified-alternate-line',day:5,
 capacitySkuUnits:80,shiftCostCLP:70000
});
export function i2ValidateQualityBridge(raw,events=[]){
 if(raw===null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)
  ||Object.keys(raw).sort().join(',')!=='capacitySkuUnits,day,kind,shiftCostCLP'
  ||Object.keys(I2_QUALITY_BRIDGE).some(k=>raw[k]!==I2_QUALITY_BRIDGE[k])
  ||!events.some(e=>e.kind==='quality-stop'
   &&e.startDay===4&&e.startDay+e.durationDays>I2_QUALITY_BRIDGE.day)){
  throw new Error('I2-35.5c3c: línea alternativa no autorizada o sin incidente activo');
 }
 return I2_QUALITY_BRIDGE;
}
