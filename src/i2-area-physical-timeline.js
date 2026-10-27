import {i2ManagementDiagnosis} from './i2-management-diagnosis.js';
import {i2WhySkuAndDays} from './i2-picking-bom.js';
import {I2_AREAS} from './i2-product-contract.js';

const fail=message=>{throw new Error('I2-32: '+message)};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  Object.values(x).forEach(freeze);Object.freeze(x);
 }
 return x;
};
const daily=(area,id)=>area?.rows?.[id];
const distinct=n=>[...new Set(n)];
const areaStep=(id,title,role,observed,managerQuestion,consumerRisk,source,unit,value)=>({
 id,title,role,observed,managerQuestion,consumerRisk,source,unit,value,
 type:'original-physical-observation'
});
/**
 * Eight-area original event narrative with real order/lot exemplars and
 * day 0–12 physical snapshots, reusing the strict audited readers only.
 * A confirmed recovery is represented ONLY as an aggregate comparison:
 * never label original Receiving/Picking/Transport as its outcomes.
 */
export function i2AreaPhysicalTimeline({state,baseline,scorecard}={}){
 if(state?.phase!=='result'||state.reveal!==true)
  fail('la cronología se consulta solo en resultado después del reveal');
 const diagnostic=i2ManagementDiagnosis(state,baseline);
 const n=baseline.actualOrders;
 if(!scorecard||scorecard.scope!=='sku-cohort'||scorecard.horizonDays!==12
  ||scorecard.actualOrders?.value!==n
  ||scorecard.baselineShipped?.value!==baseline.baselineShipped
  ||scorecard.shippedOrders?.value+scorecard.pendingOrders?.value!==n)
  fail('resultado seleccionado no concilia con plan original');
 const {commercial,planning,purchasing,receiving,quality,inventory,picking,transport}=baseline;
 const bySku=['A','B','C'];
 if(I2_AREAS.map(a=>a.id).join(',')!=='commercial,planning,purchasing,receiving,quality,inventory,picking,transport'
  ||!baseline.physicalExamples
  ||![receiving,quality,inventory,picking,transport].every(v=>
    Array.isArray(v?.rows)&&v.rows.length===13&&
    v.rows.every((d,i)=>d.day===i))
  ||planning.totalCommittedSkuUnits!==purchasing.totals.orderedSkuUnits
  ||purchasing.totals.warehouseReceivedSkuUnits!==receiving.totals.receivedSkuUnits
  ||receiving.totals.receivedSkuUnits!==quality.totals.receivedSkuUnits
  ||inventory.totals.dispatchedSkuUnits!==picking.totals.dispatchedSkuUnits
  ||picking.totals.dispatchedSkuUnits!==transport.totals.dispatchedSkuUnits
  ||transport.totals.dispatchedOrders!==baseline.baselineShipped
  ||picking.totals.requestedOrders!==n
  ||picking.totals.dispatchedOrders+transport.totals.pendingOrders!==n)
  fail('ocho áreas no conservan el mismo plan físico');
 const days=Array.from({length:13},(_,day)=>{
  const r=daily(receiving,day),q=daily(quality,day),i=daily(inventory,day),
   p=daily(picking,day),t=daily(transport,day);
  const counts=[r.arrivedSkuUnits,r.receivedSkuUnits,r.endDockQueueSkuUnits,
   q.releasedSkuUnits,q.heldEndOfDaySkuUnits,i.pickFaceSkuUnits,
   i.reserveSkuUnits,i.heldQualitySkuUnits,i.stagingSkuUnits,
   p.preparedOrders,p.dispatchedOrders,p.preparedNotDispatchedOrders,
   t.dispatchedOrders,t.pendingOrders,t.cumulativeDispatchedOrders];
  if(counts.some(v=>!count(v))
   ||r.receivedSkuUnits!==q.receivedSkuUnits
   ||p.dispatchedOrders!==t.dispatchedOrders
   ||p.preparedNotDispatchedOrders!==t.preparedAwaitingDispatchOrders
   ||i.stagingSkuUnits!==t.preparedAwaitingDispatchSkuUnits
   ||i.heldQualitySkuUnits!==q.heldEndOfDaySkuUnits)
   fail('movimientos de la jornada '+day+' no concilian');
  return {
   day,arrivedDockSkuUnits:r.arrivedSkuUnits,
   receivedSkuUnits:r.receivedSkuUnits,
   waitingDockSkuUnits:r.endDockQueueSkuUnits,
   releasedQualitySkuUnits:q.releasedSkuUnits,
   heldQualitySkuUnits:q.heldEndOfDaySkuUnits,
   pickFaceSkuUnits:i.pickFaceSkuUnits,reserveSkuUnits:i.reserveSkuUnits,
   unverifiedSkuUnits:i.notVerifiableSkuUnits,
   stagingSkuUnits:i.stagingSkuUnits,
   preparedOrders:p.preparedOrders,
   dispatchedOrders:t.dispatchedOrders,
   completedOrders:t.cumulativeDispatchedOrders,
   pendingOrders:t.pendingOrders,
   stagingOrders:t.preparedAwaitingDispatchOrders
  };
 });
 const totalShipped=days.reduce((sum,d)=>sum+d.dispatchedOrders,0);
 const totalReceived=days.reduce((sum,d)=>sum+d.receivedSkuUnits,0);
 if(totalShipped!==baseline.baselineShipped
  ||totalReceived!==receiving.totals.receivedSkuUnits
  ||days.at(-1).pendingOrders!==baseline.baselinePending
  ||days.at(-1).completedOrders!==baseline.baselineShipped
  ||days.at(-1).reserveSkuUnits!==inventory.totals.reserveSkuUnits)
  fail('acumulados diarios no concilian con cierre');
 const lot=baseline.physicalExamples.lot;
 let sampleLot=null;
 if(lot){
  const l=quality.lots.find(x=>x.lotId===lot.lotId);
  if(!l||l.skuId!==lot.skuId||l.receivedDay!==lot.receivedDay
   ||l.receivedSkuUnits!==lot.receivedSkuUnits
   ||!bySku.includes(l.skuId)||!count(l.releasedSkuUnits)
   ||!count(l.heldSkuUnits)||l.releasedSkuUnits+l.heldSkuUnits!==l.receivedSkuUnits
   ||typeof lot.purchaseOrderId!=='string')fail('lote de ejemplo sin eventos originales');
  sampleLot={
   ...lot,lotId:l.lotId,releasedSkuUnits:l.releasedSkuUnits,
   heldSkuUnits:l.heldSkuUnits,firstReleaseDay:l.firstReleaseDay,
   label:'Lote físico modelado del plan original, NO ejemplo hipotético'
  };
 }
 const example=baseline.physicalExamples.order;
 let sampleOrder=null;
 const catalog=i2WhySkuAndDays();
 if(example){
  const type=catalog.templates.find(x=>x.id===example.templateId);
  if(!type||!example.id||typeof example.id!=='string'
   ||bySku.some(id=>(example.lines[id]??0)!==(type.lines[id]??0))
   ||Object.keys(example.lines).some(id=>!bySku.includes(id))
   ||(example.shippedDay!==null&&(example.pickedDay===null
    ||example.shippedDay<example.pickedDay))
   ||[example.pickedDay,example.shippedDay].some(d=>d!==null&&(!count(d)||d>12)))
   fail('pedido de ejemplo no corresponde a BOM y días físicos');
  sampleOrder={...example,unitsPerOrder:type.unitsPerOrder,
   title:type.title,label:'Pedido del plan original, NO pedido inventado ni de recuperación'};
 }
 const originalBySku=bySku.map(skuId=>{
  const plan=planning.rows.find(row=>row.skuId===skuId);
  const physical=inventory.bySku.find(row=>row.skuId===skuId);
  const supplier=purchasing.rows.find(row=>row.skuId===skuId);
  if(!plan||!physical||!supplier
   ||plan.originalCommittedSkuUnits!==supplier.orderedSkuUnits
   ||physical.openingSkuUnits+physical.cumulativeReceivedSkuUnits
     !==physical.physicallyOnSiteSkuUnits+physical.cumulativeShippedSkuUnits)
   fail('movimiento acumulado SKU '+skuId+' no concilia');
  return {skuId,openingSkuUnits:plan.openingSkuUnits,
   committedSkuUnits:plan.originalCommittedSkuUnits,
   warehouseReceivedSkuUnits:supplier.warehouseReceivedSkuUnits,
   physicallyOnSiteSkuUnits:physical.physicallyOnSiteSkuUnits,
   shippedSkuUnits:physical.cumulativeShippedSkuUnits,
   heldQualitySkuUnits:physical.heldQualitySkuUnits,
   reserveSkuUnits:physical.reserveSkuUnits,
   notVerifiableSkuUnits:physical.notVerifiableSkuUnits,
   stagingSkuUnits:physical.stagingSkuUnits};
 });
 const steps=[
  areaStep('commercial','Comercial','Estimar qué pedirán los clientes',
   'Pronóstico comercial: '+commercial.forecastOrders+' pedidos; se observaron '+n+
   '. Diferencia: '+commercial.varianceVsForecastOrders+' pedidos.',
   '¿El pronóstico y su margen de error fueron coherentes con el stock planeado?',
   'Prever menos demanda puede dejar pedidos esperando; no contamos entregas finales.',
   commercial.source,'pedidos',n),
  areaStep('planning','Planificación','Decidir cobertura y comprometer compras antes de la sorpresa',
   'Cobertura fijada '+planning.coveragePercent+
   ' %. Las tres PO originales comprometen '+planning.totalCommittedSkuUnits+' SKU.',
   '¿Se previeron faltantes según los tres productos y sus plazos, sin suponer demanda perfecta?',
   'Una cantidad comprometida no está disponible para preparar un pedido hasta recibirse y liberarse.',
   planning.source,'SKU comprometidos',planning.totalCommittedSkuUnits),
  areaStep('purchasing','Compras','Cumplimiento del proveedor y tránsito hasta muelle',
   'Proveedor cumplió '+purchasing.totals.fulfilledSkuUnits+
   ' SKU; faltante proveedor '+purchasing.totals.supplierShortfallSkuUnits+
   ' SKU y en tránsito al cierre '+purchasing.totals.inTransitSkuUnits+'.',
   '¿Qué SKU y fecha explican la diferencia entre orden, cumplimiento y llegada?',
   'Un lote no llegado puede retrasar pedidos, pero no se puede atribuir una causa única.',
   purchasing.source,'SKU pendientes de proveedor/transporte',
   purchasing.totals.supplierShortfallSkuUnits+purchasing.totals.inTransitSkuUnits),
  areaStep('receiving','Recepción','Registrar lotes que llegaron físicamente al muelle',
   'Al muelle arribaron '+receiving.totals.arrivedSkuUnits+
   ' SKU; se recibieron '+receiving.totals.receivedSkuUnits+
   '; quedaron '+receiving.totals.waitingAtCutoffSkuUnits+' en cola.',
   '¿La capacidad de recepción y FIFO permiten ingresar lotes antes del corte?',
   'Llegar al muelle no vuelve utilizable un producto: faltan recepción y Calidad.',
   receiving.source,'SKU esperando muelle',receiving.totals.waitingAtCutoffSkuUnits),
  areaStep('quality','Calidad','Liberar unidades realmente recibidas, sin inventar descartes',
   'Liberadas '+quality.totals.releasedSkuUnits+
   ' SKU y retenidas '+quality.totals.heldAtCutoffSkuUnits+' al día 12.',
   '¿Hay lotes pendientes o días de revisión que impiden disponer de un SKU?',
   'Retenido no es rechazado, perdido ni entregado: sigue siendo stock físico en proceso.',
   quality.source,'SKU retenidas',quality.totals.heldAtCutoffSkuUnits),
  areaStep('inventory','Inventario','Ubicar, verificar y proteger unidades A/B/C',
   'PICK-FACE '+inventory.totals.pickFaceSkuUnits+
   ' SKU; reserva '+inventory.totals.reserveSkuUnits+
   '; por verificar '+inventory.totals.notVerifiableSkuUnits+'.',
   '¿Hay stock físicamente presente pero no verificable o en una ubicación aún inaccesible?',
   'Mover o verificar mercadería puede habilitar preparación, pero no crea unidades nuevas.',
   inventory.source,'SKU por verificar',inventory.totals.notVerifiableSkuUnits),
  areaStep('picking','Picking','Preparar la BOM completa de cada pedido',
   'Preparados '+picking.totals.preparedOrders+' de '+n+
   ' pedidos; nunca preparados '+picking.totals.neverPreparedOrders+
   ' y preparados sin salir '+picking.totals.preparedNotDispatchedOrders+'.',
   '¿Cada pedido disponía de toda su lista A/B/C, stock liberado y cupo de preparación?',
   'Un pedido incompleto no puede cumplir la promesa; 1 SKU no equivale a 1 pedido.',
   picking.source,'pedidos nunca preparados',picking.totals.neverPreparedOrders),
  areaStep('transport','Transporte','Expedir pedidos completos desde el CD',
   'Expedidos '+transport.totals.dispatchedOrders+
   ' y pendientes '+transport.totals.pendingOrders+
   ' pedidos; esperando en staging '+transport.totals.preparedAwaitingDispatchOrders+'.',
   '¿Aumentar capacidad de salida ayuda si todavía faltan pedidos preparados completos?',
   'Expedido desde CD NO certifica entrega final a domicilio.',
   transport.source,'pedidos pendientes día 12',transport.totals.pendingOrders)
 ];
 const titles=steps.map(x=>x.id);
 if(titles.join(',')!==I2_AREAS.map(x=>x.id).join(',')
  ||steps.some(x=>!count(x.value)||!x.role||!x.observed||!x.managerQuestion))
  fail('alguna área carece de evidencia gerencial');
 return freeze({
  kind:'i2-original-eight-area-trace',scope:'sku-cohort',phase:'post-reveal-result',
  mode:'original-baseline-only',horizonDays:12,steps,days,bySku:originalBySku,
  templates:picking.byTemplate.map(t=>({...t})),sampleLot,sampleOrder,
  comparison:{
   originalDispatchedOrders:baseline.baselineShipped,
   chosenDispatchedOrders:scorecard.shippedOrders.value,
   changeOrders:scorecard.shippedOrders.value-baseline.baselineShipped,
   originalPendingOrders:baseline.baselinePending,
   chosenPendingOrders:scorecard.pendingOrders.value,
   label:'Comparación agregada con intervención elegida: NO reasignar movimientos originales a recuperación'
  },
  intro:'Nico: sigue el flujo desde pronóstico hasta expedición. Los eventos, días, lotes y pedidos mostrados pertenecen AL PLAN ORIGINAL antes de recuperar.',
  conceptualExample:catalog.story,
  source:'i2MvpPhysicalResult(option=wait): commercial,planning,purchasing,receiving,quality,inventory,picking,transport,physicalExamples; i2ManagementDiagnosis; i2SafeScorecard',
  boundary:'Lo observado en el baseline no demuestra que una decisión aislada causara el atraso. Es un caso didáctico con eventos físicos modelados, NO tracking del mundo real, entrega cliente, costo integral ni horas trabajadas.'
 });
}
