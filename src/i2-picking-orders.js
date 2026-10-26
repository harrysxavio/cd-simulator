import {NODES,DEFAULTS} from './engine.js';
import {normalizeI2GameState} from './i2-game-state.js';

/** I2-24: only the chosen capacity, never the future orders. */
export function i2PickingPreview(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.index!==6||state.reveal)
  throw new Error('I2-24: Picking solo antes de revelar');
 const selected=NODES[6].choices.find(x=>x.id===state.choices.picking);
 const base=NODES[6].choices.find(x=>x.id===DEFAULTS.picking);
 if(!selected||!base)throw new Error('I2-24: opción desconocida');
 return Object.freeze({phase:'pre-reveal',capacity:selected.capacity,reference:base.capacity,
  delta:selected.capacity-base.capacity,
  explanation:'Picking arma pedidos completos con las cantidades de cada SKU requeridas. No basta con tener una sola unidad del pedido.',
  boundary:'La capacidad nominal de V1 no representa productividad persona-hora ni anticipa cuántos pedidos se prepararán. Preparado no equivale a expedido.'});
}

/** Audits the original baseline ledger; recovery purchases must not rewrite it. */
export function i2PickingOutcome(comparison){
 const r=comparison?.base;
 if(!r||!Array.isArray(r.ledger)||!Array.isArray(r.ordersDetail))throw new Error('I2-24: ledger ausente');
 const byOrder=new Map(r.ordersDetail.map(o=>[o.id,o]));
 const seen=new Set();let totalOrders=0,totalUnits=0;
 const days=r.ledger.map(d=>{
  let units=0;
  for(const p of d.pickEvents){
   if(seen.has(p.orderId)||!byOrder.has(p.orderId))throw new Error('I2-24: pedido duplicado o inexistente');
   seen.add(p.orderId);
   const o=byOrder.get(p.orderId);
   if(o.pickedDay!==d.day||o.templateId!==p.templateId||JSON.stringify(o.lines)!==JSON.stringify(p.lines))
    throw new Error('I2-24: BOM o día inconsistente');
   const n=Object.values(p.lines).reduce((a,b)=>a+b,0);
   if(n!==p.units||n<=0)throw new Error('I2-24: unidades inconsistentes');
   units+=n;
  }
  if(units!==d.pickedUnits||d.pickEvents.length!==d.pickedOrders)throw new Error('I2-24: totales diarios inconsistentes');
  totalOrders+=d.pickedOrders;totalUnits+=units;
  return Object.freeze({day:d.day,orders:d.pickedOrders,units});
 });
 if(totalOrders!==seen.size)throw new Error('I2-24: pedidos inconsistentes');
 const staged=r.ordersDetail.filter(o=>o.pickedDay!==null&&o.fulfilledDay===null).length;
 const shipped=r.ordersDetail.filter(o=>o.fulfilledDay!==null).length;
 if(totalOrders!==staged+shipped)throw new Error('I2-24: conservación pedidos');
 return Object.freeze({phase:'post-reveal',orders:totalOrders,units:totalUnits,
  staged,shipped,days:Object.freeze(days),
  boundary:r.separateTransport?'Preparado puede quedar en staging hasta que Transporte lo expida. No significa entregado al cliente.':
   'En esta campaña Picking y expedición suceden en la misma jornada: no es posible medir una cola de staging separada.'});
}
