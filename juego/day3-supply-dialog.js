/**
 * I2-35.8b · Confirmación de compras/traslado con efecto futuro.
 * El diálogo es una transacción de dos pasos: explorar/cancelar no escribe
 * en el save, solo la confirmación emite el comando de negocio.
 */
export function openI2Day3SupplyDialog({kind,quote,source,onCommit}={}){
 if(!['buy','reserve'].includes(kind)||!quote||quote.kind!==kind
  ||!(source instanceof HTMLElement)||typeof onCommit!=='function')
  throw new Error('I2-35.8b: diálogo de abastecimiento inválido');
 const el=(tag,cls='',copy='')=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  x.textContent=copy;
  return x;
 };
 const modal=el('dialog','i2-supply-dialog');
 const buy=kind==='buy';
 modal.setAttribute('aria-labelledby','i2-supply-dialog-title');
 const title=el('h2','',buy
  ?'¿Autorizar compra urgente para el día 4?'
  :'¿Mover la reserva existente para el día 4?');
 title.id='i2-supply-dialog-title';
 const summary=el('p','',buy
  ?'Día 3: tienes el faltante SKU estimado del lote real. La orden llegará al muelle el día 4; su recepción y liberación aún dependen de la capacidad.'
  :'Día 3: puedes trasladar al área de preparación SKU que ya están separados en RESERVA-CD. El movimiento será el día 4 y no crea inventario.');
 const facts=el('div','i2-supply-quote');
 const fmt=new Intl.NumberFormat('es-CL');
 if(buy){
  facts.append(
   el('strong','',fmt.format(quote.committedSkuUnits)+' unidades SKU por comprar'),
   el('p','','Valor modelado de compra: $'+fmt.format(quote.principalCLP)),
   el('p','','Recargo didáctico: $'+fmt.format(quote.surchargeCLP)),
   el('p','i2-supply-cost','Compromiso adicional: $'+fmt.format(quote.incrementalPurchaseCLP))
  );
 }else{
  facts.append(
   el('strong','',fmt.format(quote.existingReserveSkuUnits)+' SKU ya reservadas'),
   el('p','','Nueva compra: ninguna'),
   el('p','i2-supply-cost','Costo de traslado: no calibrado en este modelo')
  );
 }
 const caution=el('p','footnote',quote.note);
 const controls=el('div','i2-supply-dialog-actions');
 const cancel=el('button','i2-supply-cancel','Cancelar · conservar el plan');
 const confirm=el('button','i2-supply-confirm',
  buy?'Autorizar compra día 3 → día 4':'Autorizar traslado día 3 → día 4');
 cancel.type=confirm.type='button';
 cancel.addEventListener('click',()=>modal.close());
 confirm.addEventListener('click',()=>{
  try{onCommit(kind);modal.close()}
  catch(error){
   let alert=modal.querySelector('[role="alert"]');
   if(!alert){
    alert=el('p','i2-supply-alert');alert.setAttribute('role','alert');
    controls.before(alert);
   }
   alert.textContent=error.message;
  }
 });
 controls.append(cancel,confirm);
 modal.append(title,summary,facts,caution,controls);
 modal.addEventListener('close',()=>{
  modal.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 },{once:true});
 document.body.append(modal);
 try{modal.showModal();cancel.focus({preventScroll:true})}
 catch(error){modal.remove();throw error}
 return modal;
}
