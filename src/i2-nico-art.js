/**
 * The original artwork was supplied as a ZIP of 21 PNGs.
 * The repo currently contains the inventory manifest, NOT their binary bytes.
 * Do not point <img> at missing paths: GitHub Pages 404s are regression failures.
 * The verified installer flips this bit only after copying/checking all files.
 */
export const I2_NICO_ASSETS_READY=false;

const POSES=Object.freeze({
 welcome:'01_saludo',
 explanation:'02_explicacion',
 hint:'03_pista',
 doubt:'04_duda',
 alert:'05_alerta',
 reveal:'06_demanda_creciente',
 analysis:'07_analisis_kpi',
 good:'08_decision_correcta',
 improvement:'09_mejora',
 deviation:'10_desviacion',
 recovery:'11_recuperacion',
 result:'12_meta_cumplida'
});
const CATEGORIES=Object.freeze({
 commercial:'areas_y_flujo',
 planning:'areas_y_flujo',
 purchasing:'areas_y_flujo',
 receiving:'operacion_y_equipos',
 quality:'operacion_y_equipos',
 inventory:'operacion_y_equipos',
 picking:'operacion_y_equipos',
 transport:'operacion_y_equipos',
 alerts:'alertas_y_riesgos',
 kpi:'kpis_y_semaforos',
 progress:'logros_y_avances'
});
export function i2NicoPoseAsset(kind='welcome'){
 if(!Object.hasOwn(POSES,kind))throw new Error('Nico: pose no registrada');
 return Object.freeze({
  kind,ready:I2_NICO_ASSETS_READY,
  src:I2_NICO_ASSETS_READY
   ?'./assets/nico/expresiones/individual/'+POSES[kind]+'.png'
   :'./nico.svg',
  alt:'Nico · '+kind
 });
}
export function i2NicoSheet(kind='kpi'){
 if(!Object.hasOwn(CATEGORIES,kind))throw new Error('Nico: categoría no registrada');
 return Object.freeze({
  kind,ready:I2_NICO_ASSETS_READY,
  src:I2_NICO_ASSETS_READY
   ?'./assets/nico/iconos/'+CATEGORIES[kind]+'.png'
   :null
 });
}
