import {I2_RECEIVING_FOLLOWUP_SHIFT} from '../src/i2-receiving-shift.js';

/**
 * I2-35.8a · Confirmación real de una decisión después del día 2.
 * Ningún estado cambia por abrir, cerrar o cancelar este diálogo.
 */
export function openI2Day3ReceivingDialog({source,onCommit}={}){
 if(!(source instanceof HTMLElement)||typeof onCommit!=='function')
  throw new Error('I2-35.8a: diálogo de turno requiere control y confirmación');
 const el=(tag,klass='',copy='')=>{
  const x=document.createElement(tag);x.className=klass;x.textContent=copy;return x;
 };
 const modal=el('dialog','i2-day3-command-dialog');
 modal.setAttribute('aria-labelledby','i2-day3-command-title');
 const title=el('h2','','Autorizar turno de Recepción para mañana');
 title.id='i2-day3-command-title';
 const message=el('p','',
  'Hoy es el día 3. El muelle estuvo detenido en el día 2. Puedes contratar 80 cupos adicionales de Recepción para el día 4, sin reabrir ni cambiar lo que ocurrió antes.');
 const cost=el('p','i2-day3-command-cost',
  'Costo extraordinario modelado: $'+
   new Intl.NumberFormat('es-CL').format(I2_RECEIVING_FOLLOWUP_SHIFT.shiftCostCLP)+
   '. Se cobra aunque no utilices todos los cupos.');
 const warning=el('p','footnote',
  'No compra productos ni acelera Calidad, Picking o Transporte. Si la cola ya se vació, podrías gastar sin mejorar el servicio.');
 const controls=el('div','i2-day3-command-actions');
 const confirm=el('button','i2-day3-command-confirm','Confirmar orden para el día 4');
 const cancel=el('button','i2-day3-command-cancel','Cancelar · no contratar');
 confirm.type=cancel.type='button';
 cancel.addEventListener('click',()=>modal.close());
 confirm.addEventListener('click',()=>{
  try{
   onCommit();modal.close();
  }catch(error){
   const alert=modal.querySelector('[role="alert"]')||el('p','i2-day3-command-error');
   alert.setAttribute('role','alert');alert.textContent=error.message;
   if(!alert.isConnected)controls.before(alert);
  }
 });
 controls.append(cancel,confirm);
 modal.append(title,message,cost,warning,controls);
 modal.addEventListener('close',()=>{
  modal.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 },{once:true});
 document.body.append(modal);
 try{modal.showModal();cancel.focus({preventScroll:true})}
 catch(error){modal.remove();throw error}
 return modal;
}
