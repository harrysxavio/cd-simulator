import {SKU_CATALOG} from './sku.js';

/**
 * M2-02: ONE validated physical opening for all simulations of a SKU cohort.
 *
 * The source is the physical SKU catalog (or an explicit map of SKU quantities).
 * Aggregate-shift stock is a DIFFERENT unit; it must never be added here.
 * Reserve is a location within this opening, never newly purchased stock.
 */
export function skuOpeningState({stock=null,reservePercent=0}={}){
 if(!Number.isSafeInteger(reservePercent)||reservePercent<0||reservePercent>50){
  throw new Error('Porcentaje de reserva física inválido');
 }
 if(stock!==null&&(typeof stock!=='object'||Array.isArray(stock))){
  throw new Error('Apertura física SKU inválida');
 }
 const ids=new Set(SKU_CATALOG.map(p=>p.id));
 if(stock&&Object.keys(stock).some(id=>!ids.has(id))){
  throw new Error('Stock SKU desconocido en apertura');
 }
 const openingBySku={},reserveBySku={},pickFaceBySku={};
 for(const p of SKU_CATALOG){
  // No implicit coercion, rounding or negative adjustment of stock.
  const qty=stock?.[p.id]??p.initial;
  if(!Number.isSafeInteger(qty)||qty<0){
   throw new Error('Cantidad inicial inválida para SKU '+p.id);
  }
  openingBySku[p.id]=qty;
  reserveBySku[p.id]=Math.floor(qty*reservePercent/100);
  pickFaceBySku[p.id]=qty-reserveBySku[p.id];
 }
 const total=object=>Object.values(object).reduce((sum,n)=>sum+n,0);
 const initial=total(openingBySku),reserved=total(reserveBySku),pickFace=total(pickFaceBySku);
 if(![initial,reserved,pickFace].every(Number.isSafeInteger)||reserved+pickFace!==initial){
  throw new Error('La apertura física SKU no concilia');
 }
 return Object.freeze({
  scope:'sku-cohort',openingDay:-1,
  source:stock===null?'catalog':'explicit-sku-opening',
  reservePercent,
  openingBySku:Object.freeze(openingBySku),
  reserveBySku:Object.freeze(reserveBySku),
  pickFaceBySku:Object.freeze(pickFaceBySku),
  totals:Object.freeze({physicalSkuUnits:initial,reserveSkuUnits:reserved,pickFaceSkuUnits:pickFace}),
  boundary:'El stock inicial del modelo agregado de una jornada NO es stock físico SKU; la reserva está contenida dentro del stock SKU inicial.'
 });
}
