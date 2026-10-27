/**
 * I2-34 · Nico’s evidence-based learning is disclosed on demand.
 * Text is safe as textContent; no freeform HTML or game state writes.
 */
export function renderI2NicoEvidenceLearning(model){
 if(model?.kind!=='i2-evidence-based-manager-learning')
  throw new Error('I2-34: faltan evidencias pedagógicas');
 const el=(tag,klass='',value='')=>{
  const x=document.createElement(tag);if(klass)x.className=klass;
  x.textContent=value;return x;
 };
 const p=(s,klass='note')=>el('p',klass,s);
 const outer=el('details','nico-learning-result');
 outer.append(el('summary','','Nico evalúa tu gestión · aprendizajes e insignias'),
  p('La mirada de Nico: no basta con cumplir pedidos si gastaste demasiado. Aquí importa la evidencia, no los botones pulsados.'),
  p('Estrategia evaluada: '+model.plan.label+'.'+
   (model.plan.actions.length?' '+model.plan.actions.join('; ')+'.':
    ' Se eligió no intervenir.'),'note'));
 const award=el('section','nico-earned-award');
 award.setAttribute('aria-label','Resultado de insignia');
 if(model.award){
  award.append(el('strong','nico-award-title','Insignia conseguida: '+model.award.name),
   p(model.award.description),
   p('Evidencia: servicio '+model.award.proof.actualServicePercent.toFixed(1)+
    ' % (meta '+model.award.proof.targetServicePercent+' %), gasto extra '+
    new Intl.NumberFormat('es-CL',{maximumFractionDigits:0}).format(model.award.proof.modeledExtraExpenseCLP)+
    ' CLP (límite '+model.award.proof.budgetCLP+
    ' CLP) y '+model.award.proof.pendingOrders+' pedidos pendientes al cierre.','footnote'));
 }else{
  award.append(el('strong','','Sin insignia esta ronda'),
   p(model.learning.verdict),
   p('Puedes intentarlo otra vez con otra estrategia, pero la demanda y el stock del reto siguen sus reglas originales.','footnote'));
 }
 outer.append(award);
 const sections=[
  ['Hechos del escenario',model.evidence.facts,'nico-learning-facts'],
  ['Qué funcionó',model.learning.good,'nico-learning-good'],
  ['Qué salió mal o necesita atención',model.learning.bad,'nico-learning-risks'],
  ['Sacrificios y efecto de la decisión',model.learning.tradeoffs,'nico-learning-tradeoffs'],
  ['Posibles causas que debes comprobar (hipótesis)',model.learning.hypotheses,'nico-learning-hypotheses'],
  ['Cómo mejorar como gerente',model.learning.recommendations,'nico-learning-next']
 ];
 for(const [title,lines,cls] of sections){
  const detail=el('details','nico-learning-subsection '+cls);
  detail.append(el('summary','',title));
  for(const line of lines)detail.append(p(line));
  outer.append(detail);
 }
 outer.append(p(model.awardRules,'footnote'),p(model.boundary,'footnote'));
 return outer;
}
