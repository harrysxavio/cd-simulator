/**
 * I2-35.8b · Confirmación económica de Compras en el día 3 observado.
 * Abrir y cancelar nunca escriben en el guardado ni ejecutan el motor.
 */
export function openI2Day3PurchasingDialog({source,quote,onCommit}={}){
 if(!(source instanceof HTMLElement)||typeof onCommit!=='function'||
  !quote||quote.issuedDay!==3||quote.effectiveDay!==4)
  throw new Error('I2-35.8b: cotización o control de Compras inválido');
 const el=(tag,klass='',text='')=>{
  const node=document.createElement(tag);
  node.className=klass;node.textContent=text;return node;
 };
 const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const dialog=el('dialog','i2-day3-command-dialog i2-day3-purchase-dialog');
 dialog.setAttribute('aria-labelledby','i2-day3-purchase-title');
 const title=el('h2','','Autorizar compra urgente para el día 4');
 title.id='i2-day3-purchase-title';
 const explanation=el('p','',
  'En el día 3 puedes comprar '+quote.skuUnits+
  ' unidades SKU faltantes. El proveedor tiene llegada prevista al muelle el día 4, no entrega directa al cliente.');
 const cost=el('p','i2-day3-command-cost',
  'Costo de compra: '+money.format(quote.purchaseCLP)+
  '. Recargo urgente: '+money.format(quote.surchargeCLP)+
  '. Total adicional comprometido: '+money.format(quote.totalCLP)+'.');
 const warning=el('p','footnote',
  'La compra se paga según el supuesto didáctico aunque Recepción, Calidad o Picking no puedan procesar toda la carga. No modifica el día 3 ni compras originales.');
 const actions=el('div','i2-day3-command-actions');
 const cancel=el('button','i2-day3-command-cancel','Cancelar · no comprar');
 const confirm=el('button','i2-day3-command-confirm','Confirmar compra para día 4');
 cancel.type=confirm.type='button';
 cancel.addEventListener('click',()=>dialog.close());
 confirm.addEventListener('click',()=>{
  try{onCommit();dialog.close()}
  catch(error){
   const warningNode=dialog.querySelector('[role="alert"]')||
    el('p','i2-day3-command-error');
   warningNode.setAttribute('role','alert');
   warningNode.textContent=error.message;
   if(!warningNode.isConnected)actions.before(warningNode);
  }
 });
 actions.append(cancel,confirm);
 dialog.append(title,explanation,cost,warning,actions);
 dialog.addEventListener('close',()=>{
  dialog.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 },{once:true});
 document.body.append(dialog);
 try{dialog.showModal();cancel.focus({preventScroll:true})}
 catch(error){dialog.remove();throw error}
 return dialog;
}
