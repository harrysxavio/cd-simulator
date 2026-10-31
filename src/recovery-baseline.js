import {integratedDemand} from './integrated.js';
import {skuOpeningState} from './opening-state.js';
import {SKU_CATALOG} from './sku.js';
import {assertFrozenOriginalPurchases} from './original-purchase.js';
import {normalizeOperationalEvents} from './operational-event-schedule.js';

/**
 * M5-20 · One pre-intervention physical baseline for ALL recovery alternatives.
 *
 * Planning and the revealed-demand, no-intervention replay are calculated once
 * from fixed inputs. Neither an urgent purchase, staffing choice, intervention
 * day, recovery coverage nor financial proxy may rewrite the baseline.
 *
 * Reserve is a genuine opening location. Changing reservePercent changes the
 * physical opening LOCATION, and deliberately produces a different baseline.
 * It cannot be quietly compared with scenarios using another reservation.
 *
 * The 12-day SKU cohort is never aggregated with the legacy one-shift engine.
 */
const fail=message=>{throw new Error('Baseline SKU: '+message)};
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freezeDeep(part);
  Object.freeze(value);
 }
 return value;
};
const sortedRecord=obj=>{
 if(!obj||typeof obj!=='object'||Array.isArray(obj))fail('supuesto SKU inválido');
 return Object.fromEntries(Object.keys(obj).sort().map(key=>[key,obj[key]]));
};
export function recoveryBaselineSeed({
 policy='service',plannedOrders=200,actualOrders=260,
 delayDays={},supplierFill={},dailyCapacity=200,days=12,
 receivingUnitCapacity=null,pickingUnitCapacity=null,transportUnitCapacity=null,
 qualityReleasePercent=100,inventoryAccuracyPercent=100,separateTransport=false,
 plannedForecastPercent=100,planningCoveragePercent=100,
 stock=null,reservePercent=0,operationalEvents=[]
}={}){
 if(typeof separateTransport!=='boolean')fail('modalidad Picking/Transporte inválida');
 const openingState=skuOpeningState({stock,reservePercent});
 const eventSchedule=normalizeOperationalEvents(operationalEvents,days);
 // Canonical field order: equality means the *same assumptions*, independent
 // of JS object key insertion order and unrelated recovery-only settings.
 const seed={
  policy,plannedOrders,actualOrders,
  delayDays:sortedRecord(delayDays),supplierFill:sortedRecord(supplierFill),
  dailyCapacity,days,receivingUnitCapacity,pickingUnitCapacity,
  transportUnitCapacity,qualityReleasePercent,inventoryAccuracyPercent,separateTransport,
  plannedForecastPercent,planningCoveragePercent,
  stock:openingState.openingBySku,reservePercent:openingState.reservePercent,
  // Keep old V1 signatures byte-for-byte stable in the no-event case.
  ...(eventSchedule.length?{operationalEvents:eventSchedule}:{})
 };
 return {seed,openingState};
}
export function recoveryBaselineKey(options={}){
 return JSON.stringify(recoveryBaselineSeed(options).seed);
}
export function createRecoveryBaseline(options={}){
 const {seed,openingState}=recoveryBaselineSeed(options);
 const integrated=integratedDemand({
  ...seed,stock:openingState.openingBySku,reserveStock:openingState.reserveBySku
 });
 if(integrated.actual.orders!==seed.actualOrders
  ||integrated.planned.orders!==seed.plannedOrders
  ||integrated.actual.days!==seed.days||integrated.planned.days!==seed.days
  ||integrated.actual.separateTransport!==seed.separateTransport
  ||integrated.planned.separateTransport!==seed.separateTransport
  ||integrated.actual.ledger.length!==seed.days+1
  ||integrated.planned.ledger.length!==seed.days+1
  ||JSON.stringify(integrated.actual.operationalEvents)!==JSON.stringify(seed.operationalEvents??[])
  ||integrated.planned.operationalEvents.length!==0
  ||integrated.actual.deliveries.length!==SKU_CATALOG.length
  ||integrated.planned.deliveries.length!==SKU_CATALOG.length){
  fail('el calendario y la demanda base no son compatibles');
 }
 for(const replay of [integrated.planned,integrated.actual]){
  assertFrozenOriginalPurchases(integrated.originalPurchaseOrders,replay);
  for(const {id} of SKU_CATALOG){
   if(replay.initial[id]!==openingState.openingBySku[id]
    ||replay.openingReserve?.[id]!==openingState.reserveBySku[id]){
    fail('el stock y su reserva física fueron modificados');
   }
  }
 }
 const snapshot={
  scope:'sku-cohort',stage:'before-recovery',version:1,
  scenarioKey:JSON.stringify(seed),
  seed,
  openingState,integrated,
  plannedOrders:seed.plannedOrders,actualOrders:seed.actualOrders,
  days:seed.days,
  checks:{
   commonOpening:true,originalPurchasesFrozen:true,
   plannedAndActualSeededOnce:true,
   noRecoveryInputsInBaseline:true
  },
  note:'Escenario original congelado antes de intervenir. El pronóstico y las compras originales no se recalculan para cada alternativa; la misma demanda real, capacidades base, stock físico, RESERVA-CD y calendario sustentan toda la comparación. Cambiar estos supuestos crea otra base y no una mejora comparable.'
 };
 return freezeDeep(snapshot);
}
export function assertRecoveryBaseline(snapshot,options={}){
 const expected=recoveryBaselineKey(options),opening=skuOpeningState({
  stock:recoveryBaselineSeed(options).seed.stock,
  reservePercent:recoveryBaselineSeed(options).seed.reservePercent
 });
 if(snapshot?.scope!=='sku-cohort'||snapshot.stage!=='before-recovery'||snapshot.version!==1
  ||snapshot.scenarioKey!==expected
  ||JSON.stringify(snapshot.seed)!==expected
  ||!Object.isFrozen(snapshot)||!Object.isFrozen(snapshot.integrated)
  ||!Object.isFrozen(snapshot.integrated.planned)||!Object.isFrozen(snapshot.integrated.actual)
  ||snapshot.plannedOrders!==snapshot.seed.plannedOrders
  ||snapshot.actualOrders!==snapshot.seed.actualOrders
  ||snapshot.days!==snapshot.seed.days
  ||snapshot.openingState?.reservePercent!==opening.reservePercent
  ||snapshot.integrated.actual.orders!==snapshot.actualOrders
  ||snapshot.integrated.planned.orders!==snapshot.plannedOrders
  ||snapshot.integrated.actual.days!==snapshot.days
  ||snapshot.integrated.planned.days!==snapshot.days
  ||JSON.stringify(snapshot.integrated.actual.operationalEvents)!==JSON.stringify(snapshot.seed.operationalEvents??[])
  ||snapshot.integrated.planned.operationalEvents.length!==0
  ||snapshot.integrated.actual.separateTransport!==snapshot.seed.separateTransport
  ||snapshot.integrated.planned.separateTransport!==snapshot.seed.separateTransport
  ||snapshot.integrated.originalPurchaseOrders?.commitmentStage!=='before-demand-reveal'
  ||SKU_CATALOG.some(({id})=>
   snapshot.openingState.openingBySku[id]!==opening.openingBySku[id]
   ||snapshot.openingState.reserveBySku[id]!==opening.reserveBySku[id]
   ||snapshot.integrated.actual.initial[id]!==opening.openingBySku[id]
   ||snapshot.integrated.planned.initial[id]!==opening.openingBySku[id]
   ||snapshot.integrated.actual.openingReserve[id]!==opening.reserveBySku[id]
   ||snapshot.integrated.planned.openingReserve[id]!==opening.reserveBySku[id])){
  fail('escenario de comparación incompatible o no congelado');
 }
 assertFrozenOriginalPurchases(snapshot.integrated.originalPurchaseOrders,snapshot.integrated.planned);
 assertFrozenOriginalPurchases(snapshot.integrated.originalPurchaseOrders,snapshot.integrated.actual);
 return snapshot;
}
