/**
 * M2-04c: trace a managerial decision hypothesis to its simulated SKU evidence.
 *
 * A flow() setting is NOT a physical event. This read-only projection examines
 * the existing audited area read model and never reruns a simulation, creates
 * a receipt, or converts an aggregate shift unit into a SKU unit.
 */
const AREA_RULES=Object.freeze([
 {id:'commercial',scope:'plan',kind:'managerial-plan',source:'plan.commercialPlanning.forecastOrders',what:'Pronóstico de pedidos; no representa movimientos de inventario'},
 {id:'planning',scope:'plan',kind:'managerial-plan',source:'plan.originalPurchaseOrders',what:'Compra original comprometida antes de la sorpresa; no significa recepción'},
 {id:'purchasing',scope:'purchase-orders',kind:'dated-simulation',source:'supplierLedger.rows',what:'Órdenes y llegadas modeladas por SKU; la llegada no acredita recepción'},
 {id:'receiving',scope:'receipts',kind:'dated-simulation',source:'receipts',what:'Ingresos por SKU y día, sujetos a cola y capacidad del CD'},
 {id:'quality',scope:'quality-release',kind:'dated-simulation',source:'qualityLedger.daily',what:'Retenciones y liberaciones de lotes por día'},
 {id:'inventory',scope:'stock-zones',kind:'dated-simulation',source:'inventoryLedger.daily',what:'Ubicaciones y saldos físicos SKU reconciliados'},
 {id:'picking',scope:'picking',kind:'dated-simulation',source:'pickingLedger.daily',what:'Pedidos completos preparados por día, no despachados automáticamente en staging'},
 {id:'transport',scope:'transport',kind:'dated-simulation',source:'shipments',what:'Pedidos expedidos del CD; no demuestra entrega al cliente'}
]);
const freeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freeze(part);
  Object.freeze(value);
 }
 return value;
};
const fail=reason=>{throw new Error('Cobertura física de decisiones: '+reason)};
const PHYSICAL_IDS=new Set(['purchasing','receiving','quality','inventory','picking','transport']);

/**
 * Evidence classes refer to SIMULATED physical SKU events, never to real-world
 * measurements. Decision settings remain hypothetical until calibrated.
 */
export function decisionPhysicalCoverage({boundaryAudit,areaModel}={}){
 if(boundaryAudit?.passed!==true||boundaryAudit?.scope!=='sample-not-accounting'
  ||areaModel?.passed!==true||areaModel?.scope!=='sku-cohort'
  ||areaModel?.checks?.chainAudit!==true||areaModel?.chainAudit?.passed!==true
  ||!Array.isArray(areaModel.stages)||areaModel.stages.length!==8
  ||!Array.isArray(boundaryAudit.mappings)||boundaryAudit.mappings.length!==8
  ||areaModel.metrics?.actualOrders!==boundaryAudit.sampleOrders?.actual
  ||areaModel.metrics?.customerDeliveries!==null){
  fail('proyección SKU, contrato o demanda no concilian');
 }
 const rules=AREA_RULES.map((rule,index)=>{
  const row=areaModel.stages[index],mapping=boundaryAudit.mappings[index];
  if(!row||row.id!==rule.id||mapping.area!==rule.id
   ||!Array.isArray(row.evidence)||!row.evidence.includes(rule.source)
   ||!Number.isSafeInteger(row.input)||row.input<0
   ||!Number.isSafeInteger(row.output)||row.output<0){
   fail('fuente o secuencia incompatible en '+rule.id);
  }
  // Scope names differ for staging/coupled dispatch, but events never do.
  if(rule.id==='picking'||rule.id==='transport'){
   if(!['independent-staging','coupled-shipment'].includes(row.scope)){
    fail('modo de picking/transporte no acreditado');
   }
  }else if(row.scope!==rule.scope){
   fail('alcance incompatible en '+rule.id);
  }
  return {
   area:rule.id,decisionTarget:mapping.target,
   inputClass:'hypothesis-from-aggregate-shift',
   evidenceClass:rule.kind,
   evidenceSource:rule.source,
   explanation:rule.what,
   dailyCapacityCalibrated:false
  };
 });
 if(rules.filter(r=>r.evidenceClass==='managerial-plan').length!==2
  ||rules.filter(r=>r.evidenceClass==='dated-simulation').length!==PHYSICAL_IDS.size
  ||rules.some(r=>PHYSICAL_IDS.has(r.area)!==(r.evidenceClass==='dated-simulation'))){
  fail('clasificación de compromisos y eventos incorrecta');
 }
 return freeze({
  passed:true,scope:'sku-cohort',managementScope:'aggregate-shift',
  campaignId:areaModel.campaignId,horizonDays:areaModel.horizonDays,
  areas:rules,assumptionsAreCalibrated:false,
  eventEvidenceIsSimulated:true,
  noCustomerDeliveryProof:true,
  note:'Los valores de decisión vienen de una jornada agregada y se aplican como hipótesis a una muestra SKU; las consecuencias se leen del libro físico simulado, sin afirmar equivalencia de capacidades, costos ni entregas reales.'
 });
}
