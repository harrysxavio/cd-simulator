import {i2NicoPoseAsset} from './i2-nico-art.js';

/**
 * I2 · Nico's extra reaction artwork. The approved 24 PNG files live in a ZIP
 * and are now committed to main (all 24 PNGs plus manifest).
 *
 * CI validates the 24 hashes from the versioned manifest. The UI also has
 * a published-pose and SVG fallback to recover from failed image requests.
 * Never use image availability to determine the simulation result.
 */
export const I2_NICO_EXPANSION_READY=true;

export const I2_NICO_EXPANSION_CATALOG=Object.freeze({
  'hint-context':'escenas/13_pista_contextual.png',
  'present-data':'escenas/14_presentar_informacion.png',
  'demand-reveal':'escenas/15_revelacion_demanda.png',
  'unexpected-event':'escenas/16_evento_inesperado.png',
  'explain-impact':'escenas/17_explicar_impacto.png',
  'next-challenge':'escenas/18_siguiente_desafio.png',
  'planning':'gestion/19_planificacion.png',
  'resources':'gestion/20_asignar_recursos.png',
  'optimize':'gestion/21_optimizar.png',
  'cost-control':'gestion/22_control_costos.png',
  'productivity':'gestion/23_productividad.png',
  'balance':'gestion/24_equilibrar_decisiones.png',
  'success':'resultados/25_exito.png',
  'partial':'resultados/26_resultado_parcial.png',
  'attention':'resultados/27_atencion.png',
  'improve':'resultados/28_mejorar.png',
  'idea':'gestos/29_idea.png',
  'risk':'gestos/30_riesgo.png',
  'review-data':'gestos/31_revision_datos.png',
  'concern':'gestos/32_preocupacion.png',
  'crisis':'gestos/33_crisis.png',
  'surprise':'gestos/34_sorpresa.png',
  'motivation':'gestos/35_motivacion.png',
  'reflect':'gestos/36_cierre_reflexivo.png'
});

/** Known game moments mapped to an expanded card and a verified old pose. */
const MOMENTS=Object.freeze({
  'tour-gerencia':Object.freeze({asset:'hint-context',fallback:'welcome'}),
  'tour-recorrido':Object.freeze({asset:'present-data',fallback:'explanation'}),
  'tour-plan':Object.freeze({asset:'planning',fallback:'hint'}),
  'tour-sku':Object.freeze({asset:'review-data',fallback:'analysis'}),
  'tour-metricas':Object.freeze({asset:'balance',fallback:'analysis'}),
  'tour-sorpresa':Object.freeze({asset:'concern',fallback:'doubt'}),
  'tour-cierre':Object.freeze({asset:'reflect',fallback:'improvement'}),
  'pre-reveal':Object.freeze({asset:'concern',fallback:'alert'}),
  'observed-demand':Object.freeze({asset:'demand-reveal',fallback:'reveal'}),
  'incident-observed':Object.freeze({asset:'unexpected-event',fallback:'alert'}),
  'incident-decision':Object.freeze({asset:'risk',fallback:'doubt'}),
  // Only use these images after the corresponding physical day is observed.
  'incident-quality-decision':Object.freeze({asset:'idea',fallback:'hint'}),
  'daily-normal':Object.freeze({asset:'present-data',fallback:'analysis'}),
  'daily-interruption':Object.freeze({asset:'concern',fallback:'alert'}),
  'daily-quality-bridge':Object.freeze({asset:'explain-impact',fallback:'recovery'}),
  'recovery-options':Object.freeze({asset:'balance',fallback:'analysis'}),
  'results-success':Object.freeze({asset:'success',fallback:'result'}),
  'results-partial':Object.freeze({asset:'partial',fallback:'analysis'}),
  'results-risk':Object.freeze({asset:'attention',fallback:'deviation'}),
  'results-improvement':Object.freeze({asset:'improve',fallback:'improvement'}),
  'mentor-commercial':Object.freeze({asset:'review-data',fallback:'doubt'}),
  'mentor-planning':Object.freeze({asset:'planning',fallback:'hint'}),
  'mentor-purchasing':Object.freeze({asset:'cost-control',fallback:'explanation'}),
  'mentor-receiving':Object.freeze({asset:'resources',fallback:'analysis'}),
  'mentor-quality':Object.freeze({asset:'review-data',fallback:'hint'}),
  'mentor-inventory':Object.freeze({asset:'optimize',fallback:'analysis'}),
  'mentor-picking':Object.freeze({asset:'resources',fallback:'explanation'}),
  'mentor-transport':Object.freeze({asset:'next-challenge',fallback:'hint'}),
  'mentor-resources':Object.freeze({asset:'resources',fallback:'explanation'}),
  'mentor-costs':Object.freeze({asset:'cost-control',fallback:'analysis'}),
  'mentor-productivity':Object.freeze({asset:'productivity',fallback:'analysis'}),
  'next-mission':Object.freeze({asset:'next-challenge',fallback:'good'})
});

export const I2_NICO_MOMENTS=Object.freeze(Object.keys(MOMENTS));

/**
 * Pure resolver: never reads the scenario, seed, demand, economics or storage.
 * Callers must choose the moment after their normal authorization checks.
 * "published" is an explicit option for unit tests only: the application
 * always relies on I2_NICO_EXPANSION_READY.
 */
export function i2NicoMomentAsset(moment,{published=I2_NICO_EXPANSION_READY}={}){
 if(!Object.hasOwn(MOMENTS,moment))throw Error('Nico: momento visual no registrado');
 const {asset,fallback}=MOMENTS[moment];
 const legacy=i2NicoPoseAsset(fallback);
 const desiredSrc='./assets/nico/expansion-2026-10-31/'+I2_NICO_EXPANSION_CATALOG[asset];
 return Object.freeze({
  moment,
  ready:Boolean(published),
  src:published?desiredSrc:legacy.src,
  desiredSrc,
  fallbackSrc:legacy.src,
  alt:'Nico · '+moment
 });
}
