/** Original Nico art, 21 image blobs verified byte-for-byte against the backup.
 * Fall back to nico.svg only if a browser cannot load a particular PNG.
 * Illustrations are decorative: textual tips remain accessible on their own.
 */
export const I2_NICO_ASSETS_READY=true;

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

/** Full-body approved character for the welcome card (not the 12-expression sheet). */
export function i2NicoPortraitAsset(){
 return Object.freeze({ready:I2_NICO_ASSETS_READY,
  src:I2_NICO_ASSETS_READY
   ?'./assets/nico/personaje/nico_chibi_cuerpo_completo.png'
   :'./nico.svg',alt:'Nico, coordinador del centro de distribución'});
}
