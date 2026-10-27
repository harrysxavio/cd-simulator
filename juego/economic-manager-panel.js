/** I2-33 · Closed by default, audit-first V1 SKU finance for mobile. */
export function renderI2EconomicManagerPanel(model){
 if(model?.kind!=='i2-economic-manager-reading')
  throw new Error('I2-33: no existe auditoría financiera conciliada');
 const node=(tag,cls='',txt='')=>{
  const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=txt;return x;
 };
 const p=(txt,cls='note')=>node('p',cls,txt);
 const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const fmt=new Intl.NumberFormat('es-CL');
 const panel=node('details','economic-manager-panel');
 panel.append(node('summary','','Economía del CD · auditoría de Nico'),
  p('Solo valores didácticos de la cohorte SKU. No son ingresos cobrados, gastos totales ni rentabilidad contable.','footnote'));
 const selected=model.selected,original=model.original,delta=model.change;
 const cards=node('section','economic-manager-grid');
 for(const [title,value,unit] of [
  ['Valor ilustrativo expedido',selected.illustrativeDispatchValueCLP,'CLP'],
  ['Material SKU realmente expedido',selected.shippedMaterialStandardCostCLP,'CLP'],
  ['Jornadas de refuerzo activadas',selected.activatedExtraShiftsCLP,'CLP'],
  ['Contribución parcial didáctica',selected.partialContributionCLP,'CLP']
 ]){
  const card=node('section','economic-manager-card');
  card.append(node('span','',title),node('strong','',unit==='CLP'?money.format(value):fmt.format(value)));
  cards.append(card);
 }
 panel.append(cards,p(model.concepts.contribution,'footnote'));
 const baseline=node('section','economic-manager-compare');
 baseline.append(node('strong','','Original vs intervención elegida'),
  p('Contribución parcial del plan original: '+money.format(original.partialContributionCLP)+'.'),
  p('Contribución parcial elegida: '+money.format(selected.partialContributionCLP)+
   ' · variación '+(delta.partialContributionDeltaCLP>0?'+':'')+
   money.format(delta.partialContributionDeltaCLP)+'.'),
  p('Gasto incremental modelado: '+money.format(delta.incrementalExpenseCLP)+
   ' · pedidos recuperados: '+fmt.format(delta.recoveredOrders)+'.'),
  p(delta.costPerRecoveredOrderCLP===null
   ?'Gasto por pedido recuperado: no calculable (no hubo mejora positiva de pedidos).'
   :'Gasto extra por pedido recuperado: '+money.format(delta.costPerRecoveredOrderCLP)+
    ' por pedido adicional, no costo operativo unitario total.','note'),
  p(model.concepts.difference,'footnote'));
 panel.append(baseline);
 const purchases=node('details','economic-purchase-book');
 purchases.append(node('summary','','Compras comprometidas, recibidas y saldo'),
  p('Original comprometido: '+money.format(selected.originalPurchaseCommitmentCLP)+
   ' · compra urgente comprometida: '+money.format(selected.urgentPurchaseCommitmentCLP)+'.'),
  p('Valor material ingresado: '+money.format(selected.receivedStockValueCLP)+
   ' · stock físico restante: '+money.format(selected.closingStockValueCLP)+'.'),
  p('Apertura física: '+money.format(selected.openingStockValueCLP)+
   ' + recibido '+money.format(selected.receivedStockValueCLP)+
   ' = material expedido '+money.format(selected.shippedMaterialStandardCostCLP)+
   ' + stock final '+money.format(selected.closingStockValueCLP)+'.','note'),
  p('Recargo urgente adicional comprometido: '+money.format(selected.urgentSurchargeCommitmentCLP)+
   '. No se contabiliza otra vez como material despachado.','footnote'));
 for(const row of selected.purchaseRows){
  const item=node('section','economic-purchase-row');
  item.append(node('strong','','SKU '+row.skuId+' · '+(row.source==='original'?'PO original':'Compra urgente')),
   p('Comprometido '+money.format(row.committedCLP)+
    ' · recibido '+money.format(row.receivedCLP)+
    ' · pendiente en muelle '+money.format(row.waitingReceiptCLP)+'.'),
   p('En tránsito '+money.format(row.inTransitCLP)+
    ' · faltante proveedor '+money.format(row.shortfallCLP)+'.','footnote'));
  purchases.append(item);
 }
 purchases.append(p(model.concepts.purchase,'footnote'),
  p('No existe comprobante de pago, factura del proveedor ni salida bancaria acreditada para esas PO.','footnote'));
 panel.append(purchases);
 const byDay=node('details','economic-days');
 byDay.append(node('summary','','Auditoría día por día (0–12)'));
 const lbl=node('label','','Selecciona la jornada económica');
 const select=node('select');select.id='economicAuditDay';lbl.htmlFor=select.id;
 for(const day of selected.days){
  const opt=node('option','','Día '+day.day);opt.value=String(day.day);select.append(opt);
 }
 const dayView=node('section','economic-day-detail');dayView.setAttribute('aria-live','polite');
 const render=()=>{
  const day=selected.days[Number(select.value)];if(!day)return;
  dayView.replaceChildren(node('strong','','Día '+day.day+' · valores modelados'),
   p('Ingresó inventario: '+money.format(day.receivedStockValueCLP)+'.'),
   p('Expedidos: '+fmt.format(day.shippedOrders)+' pedidos completos · valor ilustrativo '+
    money.format(day.illustrativeDispatchValueCLP)+'.'),
   p('Material expedido: '+money.format(day.shippedMaterialStandardCostCLP)+
    ' · refuerzo activado: '+money.format(day.activatedExtraShiftsCLP)+'.'),
   p('Contribución parcial del día: '+money.format(day.partialContributionCLP)+'.'),
   p('No equivale a ingreso facturado ni ganancia por jornada.','footnote'));
 };
 select.addEventListener('change',render);byDay.append(lbl,select,dayView);render();
 panel.append(byDay);
 const guide=node('details','economic-nico-coach');
 guide.append(node('summary','','La mirada económica de Nico'));
 for(const text of model.coach)guide.append(p(text));
 guide.append(p(model.concepts.cash,'footnote'));
 panel.append(guide,
  p('Desconocidos: caja cobrada/pagada, entregas confirmadas, horas persona, fletes, costo operativo total, utilidad y EBITDA.','footnote'),
  p(model.note,'footnote'));
 return panel;
}
