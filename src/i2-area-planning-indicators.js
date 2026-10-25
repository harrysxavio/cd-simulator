import {NODES,DEFAULTS,PARAMETERS} from './engine.js';
import {I2_AREAS} from './i2-product-contract.js';
import {normalizeI2GameState} from './i2-game-state.js';

/**
 * I2-17 · Información disponible ANTES del reveal: solo parámetros de la
 * alternativa elegida versus alternativa base registrada en V1.
 * Es intencionalmente IMPOSIBLE extraer pedidos, costos o el evento futuro.
 */
export const I2_AREA_TABS=Object.freeze([
 Object.freeze({id:'decision',label:'Decisión'}),
 Object.freeze({id:'indicators',label:'Indicadores'}),
 Object.freeze({id:'nico',label:'Nico'})
]);

const METRIC_NAMES=Object.freeze({
 commercial:'Factor de forecast declarado',
 planning:'Cobertura de compra declarada',
 purchasing:'Cumplimiento supuesto del proveedor',
 receiving:'Capacidad nominal de Recepción',
 quality:'Liberación supuesta de Calidad',
 inventory:'Stock verificable supuesto',
 picking:'Capacidad nominal de Picking',
 transport:'Capacidad nominal de expedición'
});

const IMPACTS=Object.freeze({
 commercial:['Menor pronóstico puede dejar compras cortas.','La referencia no asegura precisión.','Mayor pronóstico puede aumentar compras y sobrantes.'],
 planning:['Menor cobertura arriesga faltantes.','La cobertura depende del pronóstico.','Un colchón puede inmovilizar más inventario.'],
 purchasing:['Menor cumplimiento supone más abastecimiento pendiente.','El cumplimiento no fija el día de llegada.','Mayor cumplimiento no equivale a material recibido.'],
 receiving:['Una capacidad menor puede acumular espera en muelle.','La llegada depende del proveedor.','Más capacidad no sirve si aún no llegó material.'],
 quality:['Menor liberación puede retener material.','La liberación sigue controles del proceso.','Más liberación no permite saltarse controles.'],
 inventory:['Menor confiabilidad restringe unidades prometibles.','La exactitud no crea ni elimina stock.','Más confiabilidad habilita preparación, no compra stock.'],
 picking:['Menor capacidad puede dejar pedidos en cola.','Picking necesita stock verificable.','Más preparación no sustituye Transporte.'],
 transport:['Menor capacidad puede dejar pedidos listos sin salir.','Despachar no significa entregar al cliente.','Más capacidad no repara faltantes de inventario.']
});

const deepFreeze=x=>{
 if(x&&typeof x==='object'&&!Object.isFrozen(x)){
  for(const nested of Object.values(x))deepFreeze(nested);
  Object.freeze(x);
 }
 return x;
};

export function i2AreaPlanningIndicators(raw){
 const state=normalizeI2GameState(raw);
 if(!state||state.phase!=='area'||state.reveal)throw new Error('I2-17: solo planificación');
 const area=I2_AREAS[state.index],node=NODES[state.index],param=PARAMETERS[area.id];
 if(!area||!node||area.id!==node.id||!param)throw new Error('I2-17: área incompatible');
 const selected=node.choices.find(x=>x.id===state.choices[area.id]);
 const reference=node.choices.find(x=>x.id===DEFAULTS[area.id]);
 if(!selected||!reference)throw new Error('I2-17: opciones inválidas');
 const value=selected[param.key],baseline=reference[param.key];
 if(!Number.isSafeInteger(value)||!Number.isSafeInteger(baseline))
  throw new Error('I2-17: indicador no verificable');
 const delta=value-baseline;
 const scope=param.unit==='%'?'percentage-points':'aggregate-shift-units-per-day';
 const suffix=scope==='percentage-points'?' %':' u./jornada';
 const diffSuffix=scope==='percentage-points'?' pp':' u./jornada';
 const kind=delta<0?'under':delta>0?'over':'reference';
 const choices=IMPACTS[area.id];
 return deepFreeze({
  area:area.id,phase:'pre-reveal',type:'configured-assumptions-not-performance',
  selectedOption:selected.id,referenceOption:reference.id,
  metrics:[
   {id:'declared',label:METRIC_NAMES[area.id],value,
    formatted:value+suffix,scope,kind:'selected-plan-input'},
   {id:'delta',label:'Cambio frente a opción base',value:delta,
    formatted:(delta>0?'+':'')+delta+diffSuffix,scope,kind:'difference-from-v1-default'}
  ],
  threshold:{value:baseline,formatted:baseline+suffix,
   source:'NODES y DEFAULTS de V1; parámetro '+param.key,
   definition:'Por debajo / igual / por encima de la opción base; no es meta ni resultado.'},
  traffic:{kind,label:kind==='under'?'Bajo referencia':
    kind==='over'?'Sobre referencia':'En referencia',
   meaning:'Comparación de supuestos, NO calificación de servicio, costo o eficiencia.'},
  consequence:choices[delta<0?0:delta>0?2:1],
  boundaries:[
   'Estos números son entradas declaradas antes de la demanda real, no KPI observados.',
   scope==='aggregate-shift-units-per-day'
    ?'Las unidades agregadas/jornada de V1 no equivalen a SKU físicos ni pedidos completos del horizonte de 12 días.'
    :'Un porcentaje de supuesto no predice por sí solo cumplimiento físico.',
   'Los costos operativos integrales y la expedición real aún no están calculados.'
  ]
 });
}
