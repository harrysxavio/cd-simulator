import {NODES} from './engine.js';
import {flow} from './flow.js';
import {finance} from './scenario.js';

// Contrafactual de una sola intervención: evita confundir pérdidas locales con causas globales.
export function causalAudit(decisions,actions,scenario){
 const current=flow(decisions,actions,scenario),baseCost=finance(current,scenario);
 const max={commercial:40,planning:40,purchasing:50,receiving:500,quality:30,inventory:150,picking:600,transport:600};
 const evidence=NODES.map((node,i)=>{
  const id=node.id,stage=current.stages[i];
  const trial=flow(decisions,{...actions,[id]:max[id]},scenario);
  const trialCost=finance(trial,scenario);
  const delta=trial.dispatched-current.dispatched;
  const cost=trialCost.total-baseCost.total;
  const revenue=trialCost.revenue-baseCost.revenue;
  const net=trialCost.margin-baseCost.margin;
  return {id,title:node.title,icon:node.icon,stage,delta,cost,revenue,net,
   localGap:Math.max(0,stage.input-stage.output),
   unused:Math.max(0,stage.capacity-stage.output),
   actionable:max[id]>(actions[id]||0),
   warning:delta===0?'La intervención aislada no incrementa las unidades expedibles con las demás decisiones actuales.':net<0?'La mejora de expedición reduce el resultado económico estimado.':'La mejora incrementa expedición y resultado económico estimado.'};
 });
 const actionable=evidence.filter(x=>x.actionable&&x.delta>0).sort((a,b)=>b.net-a.net||b.delta-a.delta);
 const focus=actionable[0]||null;
 const summary=focus?'La primera intervención individual a evaluar es '+focus.title+': +'+focus.delta+' unidades expedibles y variación de resultado '+Math.round(focus.net).toLocaleString('es-CL')+' CLP. No implica que sea la mejor combinación de medidas.':'Ninguna intervención individual adicional eleva la expedición con las decisiones actuales. Puede haber restricciones simultáneas; compara combinaciones antes de concluir que no existe oportunidad.';
 return {current,evidence,actionable,focus,summary};
}
