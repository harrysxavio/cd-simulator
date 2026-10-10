import {SCOPE_DEFINITIONS} from './measurements.js';

/**
 * M2-04a: An explicit CSV boundary for the historical one-shift simulator.
 * The CSV is not a physical SKU ledger. Exporting a "diagnóstico" without
 * indicating its scope could be mistaken for complete customer orders.
 *
 * Each row has five columns so Excel imports metadata and data consistently.
 */
export function aggregateFlowCsv({stages,areaNames,actions={}}={}){
 if(!Array.isArray(stages)||!Array.isArray(areaNames)||stages.length!==areaNames.length){
  throw new Error('Exportación agregada: áreas y etapas no coinciden');
 }
 if(stages.some((stage,i)=>!stage||typeof areaNames[i]!=='string'
  ||!['input','output','capacity'].every(key=>Number.isFinite(stage[key])))){
  throw new Error('Exportación agregada: registro de área inválido');
 }
 const rows=[
  ['Modelo','Jornada agregada','', '', ''],
  ['Unidad',SCOPE_DEFINITIONS.aggregate.displayUnit,'','',''],
  ['Período','Una jornada didáctica','','',''],
  ['Límite','No son pedidos SKU ni entregas al cliente','','',''],
  [],
  ['Área','Entrada','Salida','Capacidad','Recuperación'],
  ...stages.map((stage,i)=>[areaNames[i],stage.input,stage.output,stage.capacity,actions[stage.id]??0])
 ];
 // Quote all cells; treat leading formula characters in text as literal data.
 const cell=value=>{
  const str=String(value??'');
  const protectedValue=typeof value==='string'&&/^[=+@\t\r]/.test(str)?"'"+str:str;
  return '"'+protectedValue.replaceAll('"','""')+'"';
 };
 return '\ufeff'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
}
