import {NODES} from './engine.js';
import {SKU_CATALOG} from './sku.js';
import {DECISION_OPTIONS} from './sku-decision.js';
import {RECOVERY_OPTIONS} from './recovery.js';
import {measuredCount} from './measurements.js';

/**
 * I2-01 · Product contract for Misión CD.
 *
 * This module describes an educational UI; it MUST NOT simulate orders,
 * invent KPI values, mutate V1's decisions or import the DOM app.
 * I2-04 will bind these validated choices to the canonical SKU adapter.
 */
const freezeDeep=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const part of Object.values(value))freezeDeep(part);
  Object.freeze(value);
 }
 return value;
};
const validCampaignId=id=>typeof id==='string'&&/^CD-[A-Za-z0-9_-]{1,60}$/.test(id);
const validIndex=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
const validScope=(scope,horizonDays)=>scope==='sku-cohort'&&horizonDays===12;

// The questions are presentation-only. All possible choice IDs and descriptions
// still come from NODES, never from a second copy of the physical rules.
const QUESTIONS=Object.freeze({
 commercial:'¿Qué demanda anticipas antes de conocer los pedidos reales?',
 planning:'¿Qué cobertura comprarás con el pronóstico disponible?',
 purchasing:'¿Con qué cumplimiento del proveedor vas a planificar?',
 receiving:'¿Qué capacidad destinarás a ingresar lo que llegó?',
 quality:'¿Cuándo estará liberada la mercadería recibida?',
 inventory:'¿Qué stock puedes verificar para preparar pedidos?',
 picking:'¿Qué capacidad destinarás a preparar pedidos completos?',
 transport:'¿Cuántos pedidos preparados podrían salir del CD?'
});

// The source label is a UI read-path hint, not a numeric evaluation.
// Picking prepared and Transport shipped are separately witnessed only when
// the active canonical replay actually models staging.
export const I2_AREAS=freezeDeep(NODES.map((node,index)=>({
 id:node.id,
 index,
 title:node.title,
 question:QUESTIONS[node.id],
 readModel:'campaignAreaReadModel.rows',
 primarySignal:'headline',
 secondarySignal:null,
 visibleKpiLimit:2,
 choices:node.choices.map(choice=>({
  optionId:choice.id,label:choice.label,description:choice.note
 }))
})));

export const I2_RECOVERIES=freezeDeep(DECISION_OPTIONS.map(optionId=>{
 const canonical=RECOVERY_OPTIONS[optionId];
 if(!canonical)throw new Error('Alternativa SKU incompatible con V1');
 return {optionId,label:canonical.label,kind:'sku-recovery'};
}));

export const I2_PRODUCT_SCOPE=freezeDeep({
 schemaVersion:1,
 scope:'sku-cohort',
 horizonDays:12,          // Día 0 a día 12; no son 12 turnos agregados.
 firstDay:0,
 orderUnit:'orders',
 physicalUnit:'sku-units',
 maxInitialKpis:2,
 skuIds:SKU_CATALOG.map(s=>s.id),
 areaIds:I2_AREAS.map(s=>s.id),
 recoveryIds:I2_RECOVERIES.map(r=>r.optionId),
 sources:{
  configuration:'campaignSkuContract',
  campaign:'createSkuSessionCache',
  areas:'campaignAreaReadModel',
  recovery:'recoveryComparison',
  confirmation:'createSkuRecoveryDecision',
  monetary:'skuEconomicAuditReadModel'
 },
 // This is an instructional simulation, not actual purchasing.
 costBoundary:'CLP modelado y parcial; costo desconocido no equivale a cero',
 serviceBoundary:'Expedido desde CD no significa entregado al cliente'
});

/**
 * Validate a game-side, immutable managerial choice. `logicalStep` is a
 * deterministic UI/event index, not a real-world timestamp or supplier day.
 * An explanation or preview can create a validated record without confirmation,
 * but it MUST NOT invoke the simulation or write a purchase order.
 */
export function createI2Decision({
 campaignId,area,optionId,logicalStep,
 source='game-user-action',scope='sku-cohort',horizonDays=12,
 confirmed=false
}={}){
 if(!validCampaignId(campaignId))throw new Error('I2: campaña inválida');
 if(!validScope(scope,horizonDays))throw new Error('I2: alcance SKU inválido');
 if(!validIndex(logicalStep))throw new Error('I2: paso lógico inválido');
 if(source!=='game-user-action'||typeof confirmed!=='boolean')
  throw new Error('I2: origen o confirmación inválida');
 const alternatives=area==='recovery'
  ?I2_RECOVERIES:I2_AREAS.find(x=>x.id===area)?.choices;
 if(!alternatives?.some(x=>x.optionId===optionId))
  throw new Error('I2: área u opción incompatible con V1');
 return freezeDeep({
  schemaVersion:1,campaignId,area,optionId,
  scope,horizonDays,source,logicalStep,
  confirmation:confirmed?'confirmed-in-simulator':'preview-only'
 });
}

/**
 * Give I2-04 a small safe projection of the exact choice IDs expected by V1.
 * This is NOT a replay. Do not use preview decisions to issue physical events.
 */
export function i2CanonicalChoice(decision){
 if(!decision||!validCampaignId(decision.campaignId)
  ||decision.scope!=='sku-cohort'||decision.horizonDays!==12
  ||decision.source!=='game-user-action'
  ||!validIndex(decision.logicalStep)
  ||!['preview-only','confirmed-in-simulator'].includes(decision.confirmation))
  throw new Error('I2: decisión incompatible con la cohorte');
 const canonical=createI2Decision({
  campaignId:decision.campaignId,area:decision.area,
  optionId:decision.optionId,logicalStep:decision.logicalStep,
  confirmed:decision.confirmation==='confirmed-in-simulator'
 });
 // The recovery has a different canonical selector from area decisions.
 return decision.area==='recovery'
  ?Object.freeze({option:canonical.optionId})
  :Object.freeze({[canonical.area]:canonical.optionId});
}

/**
 * I2 intentionally accepts ONLY measured counts from the SKU cohort.
 * Financial projections are handled by their own audited economic read model;
 * they are not integers or counters convertible from aggregate shift units.
 */
export function i2MeasuredKpi(value,{scope='sku-cohort',unit='orders',horizonDays=12}={}){
 if(!validScope(scope,horizonDays))throw new Error('I2: KPI fuera del horizonte SKU');
 return measuredCount(value,{scope,unit,horizonDays});
}
