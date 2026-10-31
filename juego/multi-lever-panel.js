import {i2NormalizeMultiRecovery} from '../src/i2-multi-recovery.js';
import {i2MultiLeverPreview} from '../src/i2-multilever-preview.js';
import {I2_GOALS} from '../src/i2-management-objectives.js';

/** I2-29 preview + I2-30 explicit confirmation after physical comparison. */
export function renderI2MultiLeverPanel({
 state,objectives,draft,opened=false,preview=null,
 onDraft=()=>{},onOpen=()=>{},onPreview=()=>{},onConfirm=()=>{},
 onCancel=()=>{},onError=()=>{}
}={}){
 const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const num=new Intl.NumberFormat('es-CL');
 const elem=(tag,cls='',text='')=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  x.textContent=text;return x;
 };
 const para=(text,cls='note')=>elem('p',cls,text);
 const panel=elem('details','multi-lever-panel');
 panel.open=opened;
 panel.addEventListener('toggle',()=>onOpen(panel.open));
 panel.append(elem('summary','',
  'Tu estrategia · combina hasta tres acciones'),
  para('Marca cero, una o varias acciones. Compara pedidos expedidos y costo extra del conjunto. Nada se ejecuta hasta confirmar.','note'));
 const nicoHint=elem('button','multi-nico-hint','¿Una pista de Nico?');
 nicoHint.type='button';nicoHint.id='multiNicoHint';
 nicoHint.setAttribute('aria-expanded','false');
 const hint=para('', 'multi-nico-hint-text');hint.id='multiHintText';hint.hidden=true;
 nicoHint.addEventListener('click',()=>{
  hint.hidden=!hint.hidden;
  nicoHint.setAttribute('aria-expanded',String(!hint.hidden));
  if(!hint.hidden){
   hint.textContent=state.advanced.pickingLimitSkuPerDay==='10'
    ?'Hipótesis: en este reto Picking tiene un tope físico de 10 SKU por jornada. Un refuerzo nominal no garantiza quitarlo. Revisa si la compra urgente llega dentro de los 12 días.'
    :'Pista: identifica si faltan SKU utilizables o capacidad antes de gastar. Una compra puede llegar tarde y un refuerzo puede no atacar el cuello. Compara también con no intervenir.';
  }
 });
 panel.append(nicoHint,hint);
 if(state.recoveryConfirmation){
  const review=elem('section','multi-confirmed-reminder');
  review.append(para('Hay una combinación ya confirmada. Puedes probar alternativas sin cambiarla.','note'));
  const cancel=elem('button','multi-cancel-confirmed','Descartar combinación confirmada');
  cancel.type='button';cancel.id='multiCancelSaved';cancel.addEventListener('click',onCancel);
  review.append(cancel);panel.append(review);
 }
 const controls=elem('section','multi-lever-controls');
 const output=elem('section','multi-lever-output');
 output.setAttribute('aria-live','polite');
 const check=(id,label,active,disabled=false)=>{
  const row=elem('div','multi-lever-switch');
  const box=elem('input');box.type='checkbox';box.id=id;box.checked=active;box.disabled=disabled;
  const text=elem('label','',label);text.htmlFor=id;row.append(box,text);
  controls.append(row);return box;
 };
 const choices=(id,label,values,value)=>{
  const group=elem('div','multi-lever-field');
  const title=elem('label','',label);title.htmlFor=id;
  const select=elem('select');select.id=id;
  for(const v of values){
   const option=elem('option','',String(v));option.value=String(v);
   option.selected=v===value;select.append(option);
  }
  group.append(title,select);
  return {group,select};
 };
 const buy=check('multiBuy','1 · Comprar productos faltantes (compra urgente)',draft.urgentPurchase.enabled);
 const buyFields=elem('div','multi-lever-params');
 const arrival=choices('multiBuyDay','Llegada de compra · día',[1,2,5,10,13],draft.urgentPurchase.arrivalDay);
 const coverage=choices('multiCoverage','Cobertura del faltante (%)',[0,25,50,75,100],draft.urgentPurchase.coveragePercent);
 buyFields.append(arrival.group,coverage.group,
  para('Los días son jornadas de esta simulación de 12 días, no fechas del calendario. Día 13 queda fuera del corte. Si pruebas una llegada anterior al momento de decisión, estás haciendo un experimento retrospectivo, no una compra ejecutable en tiempo real.','footnote'));
 controls.append(buyFields);
 const physicalReserve=state.advanced.reservePercent??0;
 const reserve=check('multiReserve','2 · Utilizar reserva física ya separada',draft.reserveTransfer.enabled,physicalReserve===0);
 const reserveFields=elem('div','multi-lever-params');
 const release=choices('multiRelease','Traslado de reserva · día',[1,2,5,10,13],draft.reserveTransfer.releaseDay);
 reserveFields.append(release.group);controls.append(reserveFields);
 controls.append(para(physicalReserve>0
  ?'Reserva '+physicalReserve+' % ubicada antes de la sorpresa. Trasladar cambia ubicación, no suma existencias.'
  :'Reserva no disponible. Para activarla, reinicia y ubica 25 % del stock inicial en Configuración avanzada ANTES de confirmar Comercial.','footnote'));
 const boost=check('multiBoost','3 · Reforzar capacidad de preparación (+80 cupos nominales/jornada)',draft.capacityBoost.enabled);
 controls.append(para('Este refuerzo cuesta dinero si se activa. No agrega inventario ni elimina cualquier límite físico de SKU; el beneficio debe comprobarse.','footnote'));
 controls.append(para('Meta servicio '+I2_GOALS[objectives.goal].serviceTargetPercent+
  ' % · límite de gasto adicional '+money.format(objectives.incrementalBudgetCLP)+
  '. El límite genera advertencia, no prohíbe explorar.','footnote'));
 const compare=elem('button','multi-calculate','Comparar mi plan: servicio y gasto');
 compare.type='button';compare.id='multiCompare';controls.append(compare);
 const status=para('Aquí puedes decidir no intervenir, actuar en una etapa o combinar varias. La comparación es un laboratorio con resultados conocidos del modelo, no una predicción perfecta del mundo real.','footnote');
 status.id='multiStatus';status.setAttribute('role','status');
 controls.append(status);
 function refresh(){
  buyFields.hidden=!buy.checked;reserveFields.hidden=!reserve.checked;
 }
 refresh();
 function renderResult(model){
  const selected=model.selected;
  const conclusion=elem('section','multi-compare-conclusion');
  conclusion.append(
   elem('strong','','Balance de la combinación elegida'),
   para('Servicio '+selected.dispatchPercent.toFixed(1).replace('.',',')+' % · '+
    num.format(selected.dispatchedOrders)+' pedidos expedidos / '+
    num.format(selected.actualOrders)+' observados.'),
   para('Pendientes '+num.format(selected.pendingOrders)+
    ' · mejora '+(selected.recoveredOrders>0?'+':'')+num.format(selected.recoveredOrders)+' pedidos.'),
   para('Gasto incremental '+money.format(selected.incrementalExpenseCLP)+
    ' · presupuesto '+money.format(model.budgetCLP)+
    (selected.expenseWithinTarget?' · dentro de meta.':' · sobre la meta.')),
   para('Compra '+money.format(selected.urgentPurchaseValueCLP)+
    ' + recargo '+money.format(selected.urgentSurchargeCLP)+
    ' + refuerzo '+money.format(selected.extraCapacityCostCLP)+'.','footnote'),
   para('Aporte marginal de la última palanca: '+
    (model.marginal.extraDispatchedOrders>0?'+':'')+
    num.format(model.marginal.extraDispatchedOrders)+' pedidos y '+
    money.format(model.marginal.extraExpenseCLP)+' de gasto.','footnote')
  );
  for(const w of model.warnings)conclusion.append(para('Atención: '+w,'multi-warning'));
  const details=elem('details','multi-scenario-details');
  details.append(elem('summary','','Comparar no intervenir, acciones individuales y conjunto'));
  for(const x of model.rows){
   const row=elem('section','multi-compare-row');
   row.append(elem('strong','',x.label),
    para(num.format(x.dispatchedOrders)+' expedidos · '+num.format(x.pendingOrders)+' pendientes'),
    para('Mejora '+(x.recoveredOrders>0?'+':'')+num.format(x.recoveredOrders)+
     ' pedidos · gasto '+money.format(x.incrementalExpenseCLP),'footnote'));
   details.append(row);
  }
  const decision=elem('details','multi-confirm-decision');
  decision.append(elem('summary','','Revisar antes de confirmar esta combinación'));
  const review=elem('section','multi-confirm-summary');
  review.append(
   para('Plan: '+model.selectedCount+' palancas activas · '+num.format(selected.dispatchedOrders)+
    ' expedidos · '+num.format(selected.pendingOrders)+' pendientes.'),
   para('Gasto extra '+money.format(selected.incrementalExpenseCLP)+
    ' · umbral '+money.format(model.budgetCLP)+
    (selected.expenseWithinTarget?' (dentro)':' (sobre el límite, decisión permitida).'),'note'),
   para('Una confirmación registra estas palancas y su baseline; no cambia compras originales. Puede revisarse desde resultados.','footnote')
  );
  const commit=elem('button','multi-confirm-button','Confirmar combinación y ver resultado');
  commit.type='button';commit.id='multiCommit';
  commit.addEventListener('click',()=>{try{onConfirm(model.selected.actions)}catch(error){onError(error)}});
  const cancel=elem('button','multi-review-cancel','Volver a editar sin confirmar');
  cancel.type='button';cancel.id='multiCancelReview';
  cancel.addEventListener('click',()=>{decision.open=false;
   status.textContent='Confirmación cancelada. Puedes seguir comparando; no se cambió la partida.'});
  review.append(commit,cancel);decision.append(review);
  output.replaceChildren(elem('strong','','Una sola base física y un replay por conjunto'),
   conclusion,details,decision,para(model.note,'footnote'));
 }
 const update=()=>{
  try{
   const next=i2NormalizeMultiRecovery({
    urgentPurchase:{enabled:buy.checked,arrivalDay:Number(arrival.select.value),
     coveragePercent:Number(coverage.select.value)},
    reserveTransfer:{enabled:reserve.checked,releaseDay:Number(release.select.value)},
    capacityBoost:{enabled:boost.checked}
   });
   onDraft(next);output.replaceChildren();
   status.textContent='Borrador actualizado. Calcula de nuevo para ver los impactos. Nada ha sido confirmado.';
   refresh();
  }catch(error){onError(error)}
 };
 for(const control of [buy,reserve,boost,arrival.select,coverage.select,release.select])
  control.addEventListener('change',update);
 compare.addEventListener('click',()=>{
  try{
   const model=i2MultiLeverPreview({state,
    actions:i2NormalizeMultiRecovery({
     urgentPurchase:{enabled:buy.checked,arrivalDay:Number(arrival.select.value),
      coveragePercent:Number(coverage.select.value)},
     reserveTransfer:{enabled:reserve.checked,releaseDay:Number(release.select.value)},
     capacityBoost:{enabled:boost.checked}
    }),objectives});
   onPreview(model);renderResult(model);
   status.textContent='Comparación lista. Abre «Revisar antes de confirmar» para aceptar o descartar este plan.';
  }catch(error){onError(error)}
 });
 panel.append(controls,output);
 if(preview)renderResult(preview);
 return panel;
}
