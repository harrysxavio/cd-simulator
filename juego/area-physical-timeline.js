/** I2-32 · Original physical storyline, disclosure-first on mobile. */
export function renderI2AreaPhysicalTimeline(model){
 if(model?.kind!=='i2-original-eight-area-trace'||model.steps?.length!==8||model.days?.length!==13)
  throw new Error('I2-32: faltan eventos del plan original');
 const el=(tag,klass='',value='')=>{
  const x=document.createElement(tag);if(klass)x.className=klass;x.textContent=value;return x;
 };
 const p=(s,klass='note')=>el('p',klass,s);
 const fmt=new Intl.NumberFormat('es-CL');
 const outer=el('details','area-physical-trace');
 outer.append(el('summary','','Las ocho áreas · sigue el pedido con Nico'),
  p(model.intro),p('Plan original '+fmt.format(model.comparison.originalDispatchedOrders)+
    ' expedidos; con intervención '+fmt.format(model.comparison.chosenDispatchedOrders)+
    ' (variación '+(model.comparison.changeOrders>0?'+':'')+
    fmt.format(model.comparison.changeOrders)+' pedidos).'),
  p(model.comparison.label,'footnote'));
 const areas=el('section','area-trace-steps');
 for(const s of model.steps){
  const card=el('details','area-trace-step');card.dataset.area=s.id;
  card.append(el('summary','',s.title+' · '+fmt.format(s.value)+' '+s.unit),
   p('Qué hace: '+s.role),p('Hecho observado: '+s.observed),
   p('Pregunta gerencial de Nico: '+s.managerQuestion),
   p('Impacto posible al cliente: '+s.consumerRisk,'footnote'),
   p('Fuente: '+s.source,'footnote'));
  areas.append(card);
 }
 outer.append(areas);
 const timeline=el('details','area-trace-days');
 timeline.append(el('summary','','Línea de tiempo · días 0 a 12'));
 const lbl=el('label','','Selecciona una jornada original');
 const select=el('select');select.id='physicalTraceDay';lbl.htmlFor=select.id;
 for(const d of model.days){
  const option=el('option','','Día '+d.day);option.value=String(d.day);select.append(option);
 }
 const daily=el('section','area-trace-day-reading');daily.setAttribute('aria-live','polite');
 const showDay=()=>{
  const d=model.days[Number(select.value)];if(!d)return;
  daily.replaceChildren(el('strong','','Día '+d.day+' · eventos registrados'),
   p('Recepción: '+fmt.format(d.arrivedDockSkuUnits)+' SKU al muelle, '+
     fmt.format(d.receivedSkuUnits)+' recibidos, '+fmt.format(d.waitingDockSkuUnits)+' en cola.'),
   p('Calidad: '+fmt.format(d.releasedQualitySkuUnits)+' SKU liberados; '+
     fmt.format(d.heldQualitySkuUnits)+' retenidos.'),
   p('Inventario: PICK-FACE '+fmt.format(d.pickFaceSkuUnits)+' SKU; reserva '+
     fmt.format(d.reserveSkuUnits)+' y '+fmt.format(d.unverifiedSkuUnits)+' por verificar.'),
   p('Picking: '+fmt.format(d.preparedOrders)+' pedidos preparados; staging '+
     fmt.format(d.stagingOrders)+' pedidos ('+fmt.format(d.stagingSkuUnits)+' SKU).'),
   p('Transporte: '+fmt.format(d.dispatchedOrders)+' pedidos expedidos ese día; '+
     fmt.format(d.completedOrders)+' acumulados, '+fmt.format(d.pendingOrders)+' pendientes.'),
   p('Datos conciliados de cinco áreas del plan ORIGINAL sin intervención.','footnote'));
 };
 select.addEventListener('change',showDay);
 timeline.append(lbl,select,daily);showDay();outer.append(timeline);
 const sku=el('details','area-trace-by-sku');
 sku.append(el('summary','','Conciliación de unidades por SKU A/B/C'));
 for(const row of model.bySku){
  const item=el('section','area-trace-sku-row');
  item.append(el('strong','','SKU '+row.skuId),
   p('Apertura '+fmt.format(row.openingSkuUnits)+' SKU · compra original '+fmt.format(row.committedSkuUnits)+'.'),
   p('Recibidas '+fmt.format(row.warehouseReceivedSkuUnits)+
    ' · expedidas '+fmt.format(row.shippedSkuUnits)+
    ' · físicas al cierre '+fmt.format(row.physicallyOnSiteSkuUnits)+' SKU.'),
   p('Calidad '+fmt.format(row.heldQualitySkuUnits)+
    ' · reserva '+fmt.format(row.reserveSkuUnits)+
    ' · no verificables '+fmt.format(row.notVerifiableSkuUnits)+
    ' · staging '+fmt.format(row.stagingSkuUnits)+' SKU.','footnote'));
  sku.append(item);
 }
 outer.append(sku);
 const bom=el('details','area-trace-bom');
 bom.append(el('summary','','BOM: tres SKU para preparar pedidos completos'),
  p(model.conceptualExample),
  p('Los tipos describen el catálogo; no son órdenes inventadas de clientes.','footnote'));
 for(const t of model.templates)
  bom.append(p(t.title+' · '+t.formula+
   ' · '+fmt.format(t.requested)+' pedidos observados, '+fmt.format(t.dispatched)+' expedidos.'));
 outer.append(bom);
 const examples=el('details','area-trace-examples');
 examples.append(el('summary','','Ejemplo real del motor · lote y pedido'),
  p('Referencias simuladas del diario del plan original; NO tracking de consumidores reales.','footnote'));
 const lot=model.sampleLot;
 if(lot){
  examples.append(el('strong','','Lote '+lot.lotId),
   p('PO '+lot.purchaseOrderId+' · SKU '+lot.skuId+' · recibido día '+
    lot.receivedDay+': '+fmt.format(lot.receivedSkuUnits)+' unidades.'),
   p('Liberadas '+fmt.format(lot.releasedSkuUnits)+
    ' · retenidas '+fmt.format(lot.heldSkuUnits)+
    (lot.firstReleaseDay===null?' · sin primera liberación.':
     ' · primera liberación día '+lot.firstReleaseDay+'.'),'note'));
 }else examples.append(p('No hubo un lote recibido en el escenario original.','note'));
 const order=model.sampleOrder;
 if(order){
  const bomText=Object.entries(order.lines).map(([id,q])=>q+'× SKU '+id).join(' + ');
  examples.append(el('strong','','Pedido '+order.id),
   p('BOM: '+bomText+' · '+order.unitsPerOrder+' unidades SKU.'),
   p('Preparado: '+(order.pickedDay===null?'no durante los 12 días':'día '+order.pickedDay)+
     '. Expedido: '+(order.shippedDay===null?'no durante los 12 días':'día '+order.shippedDay)+'.'));
 }else examples.append(p('No hubo pedido original verificable.','note'));
 outer.append(examples,p(model.boundary,'footnote'));
 return outer;
}
