/**
 * M7-34 · Microguía de primera campaña. Solo lectura del estado de navegación:
 * no revela demanda, no modifica decisiones y no invoca el motor físico.
 */
const safe=x=>typeof x==='string'&&x.trim()&&x.length<=80;
const freeze=x=>Object.freeze(x);
export function firstCampaignGuideReadModel({
 section='operations',areaIndex=0,areaTitle='Comercial',
 areaCount=8,revealed=false
}={}){
 if(!['setup','operations','preliminary','recovery','dashboard'].includes(section)
  ||!Number.isSafeInteger(areaIndex)||areaIndex<0
  ||!Number.isSafeInteger(areaCount)||areaCount<1||areaCount>32
  ||areaIndex>=areaCount||!safe(areaTitle)||typeof revealed!=='boolean')
  throw new Error('Guía inicial: navegación o área inválida');
 const role=section==='setup'?'operations':section;
 const step={operations:1,preliminary:2,recovery:3,dashboard:4}[role];
 const base={passed:true,type:'first-campaign-guidance',step,totalSteps:4,
  source:'navigation-only',revealsDemand:false,editsDecisions:false,
  canSkip:true};
 if(role==='operations')return freeze({...base,section:role,
  title:revealed?'Revisar el plan original':'Planificar las ocho áreas',
  instruction:revealed
   ?'Tu plan original quedó congelado al conocer la demanda. Revísalo sin cambiar compras ni decisiones.'
   :'Área '+(areaIndex+1)+' de '+areaCount+': '+areaTitle+
     '. Elige una alternativa (o deja la sugerida), observa «Llegan → siguen» y pulsa «Siguiente área».',
  why:'Cada área recibe lo que llega de la anterior. Un recurso extra en un área no garantiza más pedidos despachados desde el CD.',
  next:areaIndex===areaCount-1?'Ver diagnóstico preliminar':'Siguiente área',
  areaIndex,areaCount});
 if(role==='preliminary')return freeze({...base,section:role,
  title:'Entender la demanda sorpresa',
  instruction:'Revisa los pedidos que faltan y la principal señal de alerta. Después pulsa «Explorar decisiones de recuperación».',
  why:'La demanda real se revela al cerrar el plan y no recalcula las compras originales. La alerta señala qué investigar, no prueba una causa exclusiva.',
  next:'Explorar decisiones de recuperación'});
 if(role==='recovery')return freeze({...base,section:role,
  title:'Probar una recuperación opcional',
  instruction:'Compara mantener, usar reserva, reforzar capacidad o comprar. No necesitas gastar: puedes continuar sin intervenir.',
  why:'Una compra requiere tiempo de llegada y capacidad para recibir, liberar, preparar y expedir. Una mejora física puede no recuperar pedidos.',
  next:'Confirmar opción o continuar sin intervenir'});
 return freeze({...base,section:role,
  title:'Leer el resultado del CD',
  instruction:'Empieza por «Resumen»: compara despachados y pendientes. Después consulta «Áreas» y «Inventario» solo si quieres entender por qué.',
  why:'Los pedidos completos expedidos desde el CD no son entregas confirmadas al cliente. El modelo agregado de una jornada se consulta separado.',
  next:'Explorar las áreas o iniciar otra campaña'});
}
