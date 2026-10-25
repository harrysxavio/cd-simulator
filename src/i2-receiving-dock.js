import {NODES} from './engine.js';
import {flow} from './flow.js';
import {DEFAULT_SCENARIO} from './scenario.js';
import {normalizeI2GameState} from './i2-game-state.js';
import {SKU_CATALOG} from './sku.js';

const AREA=NODES.find(x=>x.id==='receiving');
const freezeDeep=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const value of Object.values(x))freezeDeep(value);
  Object.freeze(x);
 }
 return x;
};
const sum=(rows,key)=>rows.reduce((n,row)=>n+row[key],0);
const fail=message=>{throw new Error('I2-21: '+message)};

/**
 * A read-only comparison of the selected Receiving capacity and V1 reference.
 * Before reveal: do not compute delivery timeline, SKU ledger, physical queues,
 * surprise magnitude, demand or served orders. Only current planned inputs.
 */
export function i2ReceivingCapacityPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==3||state.reveal
  ||state.confirmedAreas.slice(0,3).join(',')!=='commercial,planning,purchasing')
  fail('Recepción necesita las tres áreas previas confirmadas');
 const selected=AREA.choices.find(x=>x.id===state.choices.receiving);
 const reference=AREA.choices.find(x=>x.id==='normal');
 if(!selected||!reference)fail('elección de capacidad inválida');
 const model=flow(state.choices,{},{
  ...DEFAULT_SCENARIO,demand:1000,actualDemand:1000,lockUpstream:true
 });
 const referenceModel=flow({...state.choices,receiving:'normal'},{},{
  ...DEFAULT_SCENARIO,demand:1000,actualDemand:1000,lockUpstream:true
 });
 if(!Number.isSafeInteger(model.receivingCapacity)||model.receivingCapacity<0
  ||!Number.isSafeInteger(referenceModel.receivingCapacity)||referenceModel.receivingCapacity<0)
  fail('capacidad de Recepción no válida');
 return freezeDeep({
  phase:'pre-reveal',scope:'sku-cohort',status:'capacity-assumption-only',
  choice:selected.id,nominalChoiceCapacity:selected.capacity,
  nominalReferenceCapacity:reference.capacity,
  modeledDailySkuCapacity:model.receivingCapacity,
  modeledReferenceCapacity:referenceModel.receivingCapacity,
  dailyDelta:model.receivingCapacity-referenceModel.receivingCapacity,
  queueRule:'FIFO por llegada al muelle: lo que no se puede recepcionar queda pendiente para los días siguientes.',
  example:'Ejemplo didáctico: si llegan 100 unidades y puedes registrar 60, 40 esperan en el muelle. No son stock listo para usar.',
  boundary:'Capacidad planificada por jornada, NO volumen futuro, arribo real, cola observada, stock ni pedidos expedidos.',
  source:'NODES.receiving.capacity y flow de V1 con demanda exclusivamente planificada; mismo receivingUnitCapacity del contrato SKU.'
 });
}

/**
 * A strict read model over eventSimulation's ORIGINAL baseline ledger.
 * It is intentionally incapable of manufacturing receipts from arrivals:
 * per-day conservation is checked before a read-only projection is returned.
 * No urgent interventions, no transformation of aggregate-shift units.
 */
export function i2ReceivingOutcomeReading(comparison){
 const replay=comparison?.base,days=replay?.days,ledger=replay?.ledger;
 if(!replay||!Array.isArray(ledger)||days!==12||ledger.length!==days+1)
  fail('ledger de Recepción original no disponible');
 const cap=replay.receivingUnitCapacity;
 if(cap!==null&&(!Number.isSafeInteger(cap)||cap<0))fail('capacidad física inválida');
 let previous=0,cumulativeArrived=0,cumulativeReceived=0;
 const perSku=Object.fromEntries(SKU_CATALOG.map(s=>[s.id,{arrived:0,received:0,waiting:0}]));
 const rows=ledger.map((day,index)=>{
  if(day.day!==index||!Array.isArray(day.dockArrivals)
   ||!Array.isArray(day.receiptEvents)||!Array.isArray(day.receivingQueue)
   ||!Number.isSafeInteger(day.waitingReceiving)||day.waitingReceiving<0
   ||!Number.isSafeInteger(day.receivingUsedSkuUnits)||day.receivingUsedSkuUnits<0
   ||day.receivingCapacitySkuUnits!==cap)
   fail('día inválido o falta registro físico');
  if(day.dockArrivals.some(a=>a.urgent||!perSku[a.skuId]||!Number.isSafeInteger(a.qty)||a.qty<=0
    ||a.day!==day.day)
    ||day.receiptEvents.some(a=>a.urgent||!perSku[a.skuId]
     ||!Number.isSafeInteger(a.qty)||a.qty<=0||a.day!==day.day))
   fail('evento de muelle/recepción incompatible');
  const arrived=sum(day.dockArrivals,'qty');
  const received=sum(day.receiptEvents,'qty');
  const waiting=sum(day.receivingQueue,'remainingSkuUnits');
  if(day.receivingQueue.some(q=>q.urgent||!perSku[q.skuId]||!Number.isSafeInteger(q.remainingSkuUnits)
    ||q.remainingSkuUnits<=0||!Number.isSafeInteger(q.arrivalDay)
    ||q.arrivalDay>day.day||q.waitingDays!==day.day-q.arrivalDay))
   fail('cola FIFO corrupta');
  if(received!==day.receivingUsedSkuUnits||waiting!==day.waitingReceiving
   ||previous+arrived-received!==waiting||(cap!==null&&received>cap))
   fail('el balance de muelle/recepción no concilia');
  for(const e of day.dockArrivals)perSku[e.skuId].arrived+=e.qty;
  for(const e of day.receiptEvents)perSku[e.skuId].received+=e.qty;
  cumulativeArrived+=arrived;cumulativeReceived+=received;
  for(const s of SKU_CATALOG){
   perSku[s.id].waiting=perSku[s.id].arrived-perSku[s.id].received;
   if(perSku[s.id].waiting<0)fail('se recibió más de lo que llegó por SKU');
  }
  const queueBySku=Object.fromEntries(SKU_CATALOG.map(s=>[s.id,0]));
  for(const q of day.receivingQueue)queueBySku[q.skuId]+=q.remainingSkuUnits;
  if(SKU_CATALOG.some(s=>queueBySku[s.id]!==perSku[s.id].waiting))
   fail('la cola no coincide con SKU arribados y recibidos');
  const oldest=day.receivingQueue.reduce((n,q)=>Math.max(n,q.waitingDays),0);
  previous=waiting;
  return {
   day:day.day,arrivedSkuUnits:arrived,receivedSkuUnits:received,
   endDockQueueSkuUnits:waiting,
   nominalCapacitySkuUnits:cap,
   capacityUsedPercent:cap>0?100*received/cap:cap===0?0:null,
   oldestWaitingDays:oldest,
   waitingLots:day.receivingQueue.length
  };
 });
 if(cumulativeArrived!==cumulativeReceived+previous)fail('balance de cierre no conciliado');
 const peakQueueSkuUnits=Math.max(...rows.map(d=>d.endDockQueueSkuUnits));
 const queueSkuDays=rows.slice(0,-1).reduce((n,d)=>n+d.endDockQueueSkuUnits,0);
 const total=sum(rows,'receivedSkuUnits');
 return freezeDeep({
  phase:'post-reveal',scope:'sku-cohort',horizonDays:days,
  capacitySkuUnitsPerDay:cap,
  rows,
  totals:{
   arrivedSkuUnits:cumulativeArrived,
   receivedSkuUnits:cumulativeReceived,
   waitingAtCutoffSkuUnits:previous,
   peakDockQueueSkuUnits:peakQueueSkuUnits,
   queueSkuDays,
   daysEndingWithQueue:rows.filter(x=>x.endDockQueueSkuUnits>0).length,
   maxWaitingDays:Math.max(...rows.map(x=>x.oldestWaitingDays)),
   daysWithReceiving:rows.filter(x=>x.receivedSkuUnits>0).length
  },
  bySku:SKU_CATALOG.map(s=>({skuId:s.id,...perSku[s.id]})),
  boundary:'FIFO del escenario original (sin recuperación). Arribo a muelle no es recepción, y recepción no es stock liberado por Calidad. Ausencia de cola no garantiza ausencia de faltantes ni éxito en servicio.',
  source:'comparison.base.ledger: dockArrivals, receiptEvents, receivingQueue y receivingUsedSkuUnits de eventSimulation.'
 });
}
