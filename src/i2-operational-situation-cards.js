/**
 * I2-35.5 / I2-36 · Read-only operational dispatch for a completed
 * no-intervention physical baseline. These are observed MODELLED bottleneck
 * signals over 12 simulated days, NOT independent random events or forecasts.
 *
 * Never call before the game explicitly reveals the demand.
 * Do not calculate new results here: one canonical result is the evidence.
 */
export function i2OperationalSituationCards(baseline){
 if(!baseline||!Number.isSafeInteger(baseline.actualOrders)||
    !baseline.receiving?.totals||!baseline.quality?.totals||
    !baseline.picking?.totals||!baseline.transport?.totals)
  throw new Error('I2-36: physical baseline required');
 const incidents=[];
 const signal=(id,title,quantity,unit,meaning,question)=>{
  if(!Number.isSafeInteger(quantity)||quantity<0)
   throw new Error('I2-36: invalid operational signal');
  if(quantity>0)incidents.push(Object.freeze({id,title,quantity,unit,meaning,question}));
 };
 signal('dock','Recepción · cola en el muelle',
  baseline.receiving.totals.peakDockQueueSkuUnits,'unidades SKU',
  'Mercancía que llegó pero todavía no pudo registrarse. No equivale a stock utilizable.',
  '¿Serviría reforzar Recepción o la restricción real está después?');
 signal('quality','Calidad · productos retenidos',
  baseline.quality.totals.peakHeldSkuUnits,'unidades SKU',
  'Stock a la espera de liberación, no necesariamente dañado ni perdido.',
  '¿Liberarlo bastaría para expedir o hay otro cuello?');
 signal('staging','Transporte · pedidos listos esperando salida',
  baseline.transport.totals.peakStagingOrders,'pedidos',
  'Preparados en el CD que todavía no se han expedido.',
  '¿La capacidad de salida limita lo que ya está listo?');
 signal('picking','Picking · pedidos que no se prepararon',
  baseline.picking.totals.neverPreparedOrders,'pedidos',
  'Pedidos que no llegaron a preparación completa durante el horizonte simulado.',
  '¿Faltaron productos completos o fue insuficiente la capacidad de preparación?');
 return Object.freeze({
  title:'Lo que informa la operación',
  horizonDays:baseline.horizonDays,
  incidents:Object.freeze(incidents.slice(0,2)),
  note:'Lectura del plan original sin intervenir y sus 12 jornadas simuladas. No son nuevos eventos aleatorios ni datos en tiempo real; los cuellos requieren diagnóstico antes de actuar.'
 });
}
