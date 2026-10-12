import {SKU_CATALOG} from './sku.js';
import {skuCostCatalogReadModel} from './sku-cost-catalog.js';

/**
 * M4-15. Value the already reconciled physical SKU inventory, day by day.
 *
 * This is NOT a second stock simulation. Every number comes from
 * inventoryLedger.daily, where movements have already been matched to
 * warehouse receipts, Quality releases, reserve transfers, picks and dispatch.
 * Values are cost-standard CLP, not payments, P&L, or customer revenue.
 */
const fail=reason=>{throw new Error('Valorización SKU: '+reason)};
const safe=value=>Number.isSafeInteger(value)&&value>=0;
const multiply=(qty,rate)=>{
 const value=qty*rate;
 if(!safe(value))fail('importe CLP fuera de rango');
 return value;
};
const sum=(items,key)=>{
 const total=items.reduce((n,item)=>n+item[key],0);
 if(!safe(total))fail('total CLP fuera de rango');
 return total;
};
const frozen=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const sub of Object.values(value))frozen(sub);
  Object.freeze(value);
 }
 return value;
};
const CURRENCIES=['openingCLP','receivedTodayCLP','shippedTodayCLP','receivedToDateCLP','shippedToDateCLP',
 'pickFaceCLP','qualityHeldCLP','reserveCLP','stagingCLP','verifiedCLP',
 'unverifiedCLP','closingPhysicalCLP','transferredTodayCLP','releasedTodayCLP','pickedTodayCLP'];
const ZONES=['pickFaceCLP','qualityHeldCLP','reserveCLP','stagingCLP'];

/** No replays, rounding, or aggregate-day values are accepted. */
export function skuInventoryValuationReadModel({inventoryLedger,catalog=SKU_CATALOG}={}){
 if(inventoryLedger?.scope!=='sku-cohort'||inventoryLedger.passed!==true
  ||!safe(inventoryLedger.horizonDays)
  ||!Array.isArray(inventoryLedger.daily)
  ||inventoryLedger.daily.length!==inventoryLedger.horizonDays+1
  ||!inventoryLedger.totals)fail('libro físico SKU inválido');
 const rates=skuCostCatalogReadModel({catalog});
 if(rates.passed!==true||rates.scope!=='sku-cohort'||rates.currency!=='CLP')fail('catálogo CLP incompatible');
 const priceById=new Map(rates.productCosts.map(p=>[p.id,p]));
 const ids=rates.productCosts.map(p=>p.id);
 const openingBySku=new Map(),running=new Map(),daily=[];
 for(let day=0;day<=inventoryLedger.horizonDays;day++){
  const eventDay=inventoryLedger.daily[day];
  if(eventDay?.day!==day||!Array.isArray(eventDay.bySku)
   ||eventDay.bySku.length!==ids.length
   ||new Set(eventDay.bySku.map(x=>x.skuId)).size!==ids.length
   ||eventDay.bySku.some(x=>!priceById.has(x.skuId)))fail('día o SKU incompatible');
  const rows=eventDay.bySku.map(row=>{
   const rate=priceById.get(row.skuId);
   const fields=['openingSkuUnits','receivedTodaySkuUnits','shippedTodaySkuUnits',
    'releasedTodaySkuUnits','transferredTodaySkuUnits','pickedTodaySkuUnits',
    'pickFaceSkuUnits','qualityHeldSkuUnits','reserveSkuUnits','stagingSkuUnits',
    'verifiedSkuUnits','unverifiedSkuUnits','physicalSkuUnits'];
   if(!fields.every(field=>safe(row[field]))
    ||row.physicalSkuUnits!==row.pickFaceSkuUnits+row.qualityHeldSkuUnits+row.reserveSkuUnits+row.stagingSkuUnits
    ||row.pickFaceSkuUnits!==row.verifiedSkuUnits+row.unverifiedSkuUnits)fail('zona física SKU sin conciliación');
   const initial=openingBySku.get(row.skuId);
   if(day===0)openingBySku.set(row.skuId,row.openingSkuUnits);
   else if(initial!==row.openingSkuUnits)fail('apertura modificada durante la campaña');
   const previous=running.get(row.skuId)||{received:0,shipped:0,closing:row.openingSkuUnits};
   const received=previous.received+row.receivedTodaySkuUnits;
   const shipped=previous.shipped+row.shippedTodaySkuUnits;
   if(!safe(received)||!safe(shipped)
    ||previous.closing+row.receivedTodaySkuUnits-row.shippedTodaySkuUnits!==row.physicalSkuUnits
    ||row.openingSkuUnits+received-shipped!==row.physicalSkuUnits)fail('valor y saldo diario de SKU no concilian');
   running.set(row.skuId,{received,shipped,closing:row.physicalSkuUnits});
   const rowValue={
    skuId:row.skuId,unitCostCLP:rate.rateCLPPerPhysicalUnit,
    source:rate.source,
    openingCLP:multiply(row.openingSkuUnits,rate.rateCLPPerPhysicalUnit),
    receivedTodayCLP:multiply(row.receivedTodaySkuUnits,rate.rateCLPPerPhysicalUnit),
    shippedTodayCLP:multiply(row.shippedTodaySkuUnits,rate.rateCLPPerPhysicalUnit),
    receivedToDateCLP:multiply(received,rate.rateCLPPerPhysicalUnit),
    shippedToDateCLP:multiply(shipped,rate.rateCLPPerPhysicalUnit),
    pickFaceCLP:multiply(row.pickFaceSkuUnits,rate.rateCLPPerPhysicalUnit),
    qualityHeldCLP:multiply(row.qualityHeldSkuUnits,rate.rateCLPPerPhysicalUnit),
    reserveCLP:multiply(row.reserveSkuUnits,rate.rateCLPPerPhysicalUnit),
    stagingCLP:multiply(row.stagingSkuUnits,rate.rateCLPPerPhysicalUnit),
    verifiedCLP:multiply(row.verifiedSkuUnits,rate.rateCLPPerPhysicalUnit),
    unverifiedCLP:multiply(row.unverifiedSkuUnits,rate.rateCLPPerPhysicalUnit),
    closingPhysicalCLP:multiply(row.physicalSkuUnits,rate.rateCLPPerPhysicalUnit),
    transferredTodayCLP:multiply(row.transferredTodaySkuUnits,rate.rateCLPPerPhysicalUnit),
    releasedTodayCLP:multiply(row.releasedTodaySkuUnits,rate.rateCLPPerPhysicalUnit),
    pickedTodayCLP:multiply(row.pickedTodaySkuUnits,rate.rateCLPPerPhysicalUnit)
   };
   if(sum(ZONES.map(key=>({value:rowValue[key]})),'value')!==rowValue.closingPhysicalCLP
    ||rowValue.pickFaceCLP!==rowValue.verifiedCLP+rowValue.unverifiedCLP
    ||rowValue.openingCLP+rowValue.receivedToDateCLP!==rowValue.shippedToDateCLP+rowValue.closingPhysicalCLP){
    fail('valor por ubicación sin conciliación');
   }
   return rowValue;
  });
  const totals=Object.fromEntries(CURRENCIES.map(key=>[key,sum(rows,key)]));
  if(totals.openingCLP+totals.receivedToDateCLP!==totals.shippedToDateCLP+totals.closingPhysicalCLP
   ||sum(ZONES.map(key=>({value:totals[key]})),'value')!==totals.closingPhysicalCLP
   ||totals.pickFaceCLP!==totals.verifiedCLP+totals.unverifiedCLP){
   fail('valor total diario sin conciliación');
  }
  daily.push({day,bySku:rows,totals,
   checks:{physicalValuationBalanced:true,zonePartitionBalanced:true},
   // Reserve moves and Quality release reclassify stock, not new purchases.
   nonPurchaseTransfersCLP:totals.transferredTodayCLP+totals.releasedTodayCLP});
 }
 const last=daily.at(-1),totals={
  ...last.totals,
  currency:'CLP',
  // These values are the cost of stocks, never operating expense or cash.
  closingAvailableCLP:last.totals.pickFaceCLP,
  closingHeldCLP:last.totals.qualityHeldCLP,
  closingReserveCLP:last.totals.reserveCLP,
  closingStagingCLP:last.totals.stagingCLP
 };
 const physical=inventoryLedger.totals;
 if(sum(inventoryLedger.daily[0].bySku.map(row=>({qty:row.openingSkuUnits})),'qty')!==physical.openingSkuUnits
  ||sum(inventoryLedger.daily.map(row=>({qty:row.receivedSkuUnits})),'qty')!==physical.receivedSkuUnits
  ||sum(inventoryLedger.daily.map(row=>({qty:row.shippedSkuUnits})),'qty')!==physical.shippedSkuUnits
  ||sum(last.bySku.map(row=>({qty:running.get(row.skuId).closing})),'qty')!==physical.physicalSkuUnits
  ||last.bySku.some(row=>
   row.receivedToDateCLP!==multiply(running.get(row.skuId).received,row.unitCostCLP)
   ||row.shippedToDateCLP!==multiply(running.get(row.skuId).shipped,row.unitCostCLP))){
  fail('los totales económicos no coinciden con el libro físico');
 }
 return frozen({
  passed:true,scope:'sku-cohort',currency:'CLP',campaignHorizonDays:inventoryLedger.horizonDays,
  valuationMethod:'standard-cost-per-physical-SKU',ratesSource:rates.source,
  accountingStatus:'inventory-valued-not-cash',daily,totals,
  exclusions:['aggregate-shift-finance','realized-payments','unverified-sales','double-count-verified-stock'],
  note:'Valor inicial + recepción física = costo estándar de unidades expedidas + inventario al cierre (PICK-FACE, Calidad, RESERVA-CD y STAGING-CD). Verificable/no verificable son una partición de PICK-FACE: no sumar de nuevo. Traslados y liberaciones son reclasificaciones, no compras ni pagos.'
 });
}
