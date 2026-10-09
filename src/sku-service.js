/**
 * M2/M3 transitional service brief. Uses the SAME reconciled SKU read model
 * already used by the Results > Summary and Results > Areas screens.
 *
 * Important: this module does NOT infer a root cause from output volumes.
 * A pending order can have several simultaneous physical restrictions.
 */
export function skuServiceBrief(areaModel){
 if(!areaModel||areaModel.scope!=='sku-cohort'||areaModel.passed!==true
  ||!areaModel.checks||!Object.values(areaModel.checks).every(Boolean)){
  throw new Error('El resumen requiere una campaña SKU conciliada');
 }
 const {actualOrders,shippedOrders,pendingOrders}=areaModel.metrics;
 if(!Number.isSafeInteger(actualOrders)||actualOrders<0
  ||!Number.isSafeInteger(shippedOrders)||shippedOrders<0
  ||!Number.isSafeInteger(pendingOrders)||pendingOrders<0
  ||actualOrders!==shippedOrders+pendingOrders){
  throw new Error('Pedidos de campaña SKU no concilian');
 }
 const completionPercent=actualOrders?100*shippedOrders/actualOrders:100;
 return Object.freeze({
  campaignId:areaModel.campaignId,
  scope:'sku-cohort',
  horizonDays:areaModel.horizonDays,
  actualOrders,shippedOrders,pendingOrders,completionPercent,
  severity:pendingOrders===0?'stable':completionPercent<70?'critical':'warning',
  reading:pendingOrders
   ?'Aún quedan pedidos sin salir del centro. Revisa Compras, Recepción, Calidad, Inventario, Picking y Transporte antes de elegir una medida.'
   :'Todos los pedidos de esta cohorte salieron del CD dentro del período. Revisa los costos y la entrega posterior al cliente.',
  boundary:'Pedidos completos expedidos desde el CD en '+areaModel.horizonDays+' días; no son unidades de una jornada ni entregas confirmadas al cliente.'
 });
}
