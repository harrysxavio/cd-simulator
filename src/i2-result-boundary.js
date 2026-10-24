import {measuredCount,addMeasuredCounts} from './measurements.js';

/**
 * I2-06 · Public, read-only scorecard over the canonical 12-day SKU cohort.
 *
 * This is a boundary / presentation projection, not another calculation
 * engine. In particular, CLP proxy, PO commitment and incremental cash
 * expense are DIFFERENT concepts; none is a total P&L or actual paid amount.
 *
 * NO network, localStorage, user identifiers, address, customer/order IDs,
 * SKU shipment ledger or full raw campaign objects in this projection.
 */
const FREEZE=Object.freeze;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const money=n=>typeof n==='number'&&Number.isFinite(n)&&Number.isSafeInteger(n)&&n>=0;
const signed=n=>typeof n==='number'&&Number.isFinite(n)&&Number.isSafeInteger(n);
const fail=reason=>{throw new Error('I2-06: '+reason)};
const orderUnit=Object.freeze({scope:'sku-cohort',unit:'orders',horizonDays:12});

function currencyAmount(value,{kind,description,allowNegative=false}){
 if((allowNegative?!signed(value):!money(value)))fail('importe CLP inválido');
 return FREEZE({
  value,currency:'CLP',scope:'sku-cohort',horizonDays:12,
  kind,description,measured:true,modeled:true,partial:true
 });
}
function qty(value){
 return measuredCount(value,orderUnit);
}
/**
 * Only invoke on a canonical, revealed i2MvpPhysicalResult().
 *
 * Reject incompatible dimensions and totals BEFORE they reach the DOM.
 * The payload is an explicit allow-list: extra information is not forwarded.
 */
export function i2SafeScorecard(result){
 if(!result||typeof result!=='object'||Array.isArray(result)
  ||result.scope!=='sku-cohort'||result.horizonDays!==12
  ||result.unknownTotalCost!==true)fail('origen, alcance o costo integral no verificable');
 const {
  plannedOrders,actualOrders,baselineShipped,baselinePending,
  shippedOrders,pendingOrders,recoveredOrders,
  incrementalExpenseCLP,committedPurchaseCLP,economicProxyDeltaCLP
 }=result;
 if(![plannedOrders,actualOrders,baselineShipped,baselinePending,
  shippedOrders,pendingOrders].every(count)
  ||!signed(recoveredOrders)
  ||baselineShipped+baselinePending!==actualOrders
  ||shippedOrders+pendingOrders!==actualOrders
  ||shippedOrders-baselineShipped!==recoveredOrders
  ||!money(incrementalExpenseCLP)||!money(committedPurchaseCLP)
  ||!signed(economicProxyDeltaCLP))fail('pedidos o importes no concilian');
 const actual=qty(actualOrders),shipped=qty(shippedOrders),pending=qty(pendingOrders);
 const baseShipped=qty(baselineShipped),basePending=qty(baselinePending);
 if(addMeasuredCounts(shipped,pending).value!==actual.value
  ||addMeasuredCounts(baseShipped,basePending).value!==actual.value)
  fail('pedidos de base/recuperación no concilian');
 return FREEZE({
  scope:'sku-cohort',
  horizonDays:12,
  status:'revealed-canonical',
  plannedOrders:qty(plannedOrders),
  actualOrders:actual,
  shippedOrders:shipped,
  pendingOrders:pending,
  baselineShipped:baseShipped,
  recoveredOrders:FREEZE({
   value:recoveredOrders,scope:'sku-cohort',unit:'orders',
   horizonDays:12,comparison:'recovery-minus-baseline'
  }),
  currency:'CLP',
  incrementalExpense:currencyAmount(incrementalExpenseCLP,{
   kind:'incremental-expense',
   description:'Gasto incremental modelado de la intervención; no costo total'
  }),
  committedOriginalPurchases:currencyAmount(committedPurchaseCLP,{
   kind:'purchase-commitment',
   description:'Compromiso original de compras; no pago confirmado ni costo a sumar de nuevo'
  }),
  economicProxyDelta:currencyAmount(economicProxyDeltaCLP,{
   kind:'economic-proxy-delta',
   description:'Variación de proxy económico didáctico; no utilidad contable',
   allowNegative:true
  }),
  // These values are NOT calculated by the complete economic audit here.
  // Explicit null preserves "unknown" without silently substituting CLP $0.
  totalCostCLP:null,
  netProfitCLP:null,
  ebitdaCLP:null,
  customerDeliveredOrders:null,
  limits:FREEZE({
   totalCost:'desconocido (no es cero)',
   physical:'Pedido expedido desde CD, no entrega final al cliente',
   financial:'CLP parciales y modelados, sin flujo de caja confirmado',
   privateData:'No almacena nombres, tracking ni datos personales'
  })
 });
}
