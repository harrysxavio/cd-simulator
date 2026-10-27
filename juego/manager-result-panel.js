/**
 * I2-31: four-axis dashboard remains optional beneath the two hero KPIs.
 * Native details disclosures support keyboard and smartphone users.
 */
export function renderI2ManagerResultBoard(model){
 if(model?.kind!=='i2-manager-result-board'||!Array.isArray(model.axes)
  ||model.axes.length!==4)throw new Error('I2-31: tablero gerencial no verificado');
 const make=(tag,cls,text='')=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=text;
  return el;
 };
 const p=(text,cls='note')=>make('p',cls,text);
 const fmt=new Intl.NumberFormat('es-CL',{maximumFractionDigits:1});
 const money=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
 const outer=make('details','manager-result-board');
 outer.append(make('summary','','Ver tablero gerencial · cuatro ejes'));
 outer.append(p('Nico: el resumen no sustituye el análisis. Abre cada indicador para conocer fórmula, umbral, límites y fuente.','footnote'));
 const axes=make('section','manager-axis-grid');
 axes.setAttribute('aria-label','Indicadores de gestión del centro de distribución');
 for(const axis of model.axes){
  const card=make('section','manager-axis status-'+axis.status);
  card.dataset.axis=axis.id;
  const title=make('div','manager-axis-heading');
  title.append(make('strong','',axis.title));
  const state=make('span','manager-axis-status status-'+axis.status,axis.statusLabel);
  state.setAttribute('aria-label','Estado '+axis.statusLabel);
  title.append(state);card.append(title);
  const value=axis.unit==='CLP'?money.format(axis.value):fmt.format(axis.value);
  card.append(make('div','manager-axis-value',value),
   p(axis.unit,'manager-axis-unit'));
  const explanation=make('details','manager-axis-detail');
  explanation.append(make('summary','','Qué significa y cómo se calcula'),
   p(axis.explanation),p('Fórmula: '+axis.formula,'footnote'),
   p('Umbral: '+axis.threshold,'footnote'),
   p('Fuente: '+axis.source,'footnote'));
  card.append(explanation);
  axes.append(card);
 }
 outer.append(axes);
 const original=make('details','manager-original-context');
 original.append(make('summary','','Consultar señales físicas del plan original'),
  p('Recepción: '+fmt.format(model.originalContext.waitingReceivingSkuUnits)+
    ' SKU pendientes de registro al día 12.'),
  p('Calidad: '+fmt.format(model.originalContext.heldQualitySkuUnits)+
    ' SKU retenidos al día 12.'),
  p('Compras originales comprometidas: '+
    money.format(model.originalContext.originalPurchaseCommitmentCLP)+'.','note'),
  p(model.originalContext.label,'footnote'));
 outer.append(original);
 const coach=make('details','manager-nico-view');
 coach.append(make('summary','','La mirada de Nico como gerente'),
  p(model.coach.verdict,'manager-nico-verdict'));
 const collection=(title,entries,cls)=>{
  const section=make('section',cls);
  section.append(make('strong','',title));
  for(const line of entries)section.append(p(line,'note'));
  return section;
 };
 coach.append(collection('Qué salió bien',model.coach.wins,'manager-nico-wins'),
  collection('Riesgos y sacrificios',model.coach.risks,'manager-nico-risks'),
  p(model.coach.comparison,'note'),
  p(model.coach.tradeoff,'note'),
  collection('Tres preguntas para decidir mejor',model.coach.questions,'manager-nico-questions'),
  p(model.coach.nextStep,'note'),
  p('Impacto en el consumidor: expedido desde CD no acredita entrega final.','footnote'));
 outer.append(coach,p(model.limits,'footnote'));
 return outer;
}
