import {DEFAULTS} from './engine.js';
import {I2_AREAS,I2_RECOVERIES} from './i2-product-contract.js';
import {I2_MVP_CASE} from './i2-mvp-adapter.js';
import {I2_DEFAULT_SEED,i2ChallengeForSeed} from './i2-challenge-config.js';
import {I2_DEFAULT_ADVANCED,i2ValidateAdvanced} from './i2-advanced-settings.js';

/** I2-05: only educational choices and navigation are saved.
 * Never persist a physical SKU ledger, a recovery preview or V1's session. */
export const I2_GAME_STORAGE_KEY='supply-lab-i2-v1';
export const I2_GAME_SCHEMA=2;
const SEED=I2_DEFAULT_SEED; // el caso por defecto respeta todas las partidas anteriores
const PHASES=Object.freeze(['intro','area','reveal','recover','review','result']);
const ARRIVALS=Object.freeze([1,2,5,10,13]);
const COVERAGES=Object.freeze([0,25,50,75,100]);

export function newI2GameState({seed=SEED,advanced=I2_DEFAULT_ADVANCED}={}){
 // No se acepta una semilla libre ni un resultado dictado por el jugador.
 i2ChallengeForSeed(seed);
 const config=i2ValidateAdvanced(advanced);
 return {
  schema:I2_GAME_SCHEMA,campaignId:I2_MVP_CASE.campaignId,seed,
  phase:'intro',substep:'briefing',index:0,
  choices:Object.fromEntries(I2_AREAS.map(a=>[a.id,DEFAULTS[a.id]])),
  recovery:'wait',arrivalDay:2,coverage:100,advanced:config,
  confirmedAreas:[],reveal:false
 };
}
function stepFor(phase){
 return {intro:'briefing',area:'decision',reveal:'shock',
  recover:'intervention',review:'plan-review',result:'learning'}[phase];
}

/**
 * Migrates historical v1 saves, verifies every option and removes all unknown
 * or sensitive/physical fields. Null means irrecoverably malformed.
 * No DOM, network or browser globals; safe to run in isolated Node tests.
 */
export function normalizeI2GameState(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||![1,2].includes(raw.schema)
  ||!PHASES.includes(raw.phase)||!Number.isSafeInteger(raw.index)
  ||raw.index<0||raw.index>=I2_AREAS.length||typeof raw.reveal!=='boolean'
  ||!ARRIVALS.includes(raw.arrivalDay)||!COVERAGES.includes(raw.coverage)
  ||!I2_RECOVERIES.some(r=>r.optionId===raw.recovery)
  ||!raw.choices||typeof raw.choices!=='object'||Array.isArray(raw.choices)
  ||Object.keys(raw.choices).some(k=>!I2_AREAS.some(a=>a.id===k))
  ||!Array.isArray(raw.confirmedAreas)){
  return null;
 }
 const isV2=raw.schema===I2_GAME_SCHEMA;
 if(isV2){
  if(raw.campaignId!==I2_MVP_CASE.campaignId)return null;
  try{i2ChallengeForSeed(raw.seed)}catch{return null}
 }
 // Migración aditiva de esquemas históricos: al faltar configuración,
 // los valores anteriores siguen produciendo la misma simulación.
 let advanced;
 try{advanced=i2ValidateAdvanced(raw.advanced??I2_DEFAULT_ADVANCED)}catch{return null}
 const choices={};
 for(const area of I2_AREAS){
  const optionId=raw.choices[area.id];
  if(!area.choices.some(c=>c.optionId===optionId))return null;
  choices[area.id]=optionId;
 }
 const confirmed=new Set();
 for(const id of raw.confirmedAreas){
  if(!I2_AREAS.some(a=>a.id===id)||confirmed.has(id))return null;
  confirmed.add(id);
 }
 // Commit order is exactly the sequence of the eight operational areas.
 // Returning to a past step or intro is allowed, but never changing the plan
 // after the reveal or skipping a planning area.
 const expectedPrefix=I2_AREAS.slice(0,confirmed.size).map(a=>a.id);
 if([...confirmed].some((id,i)=>id!==expectedPrefix[i]))return null;
 if((['reveal','recover','review','result'].includes(raw.phase)&&confirmed.size!==I2_AREAS.length)
  ||(raw.phase==='reveal'&&raw.reveal)
  ||(['recover','review','result'].includes(raw.phase)&&!raw.reveal)
  ||(['intro','area'].includes(raw.phase)&&raw.reveal)
  ||(raw.phase==='intro'&&raw.index!==0)){
  return null;
 }
 return {
  schema:I2_GAME_SCHEMA,campaignId:I2_MVP_CASE.campaignId,seed:isV2?raw.seed:SEED,
  phase:raw.phase,substep:stepFor(raw.phase),index:raw.index,
  choices,recovery:raw.recovery,arrivalDay:raw.arrivalDay,coverage:raw.coverage,
  advanced,
  confirmedAreas:[...confirmed],reveal:raw.reveal
 };
}
export function saveI2GameState(storage,state){
 const safe=normalizeI2GameState(state);
 if(!safe)throw new Error('I2-05: estado de juego inválido');
 // Only the game key, never 'supply-lab-v90'.
 storage.setItem(I2_GAME_STORAGE_KEY,JSON.stringify(safe));
 return safe;
}
export function loadI2GameState(storage){
 try{
  const json=storage.getItem(I2_GAME_STORAGE_KEY);
  if(json===null)return newI2GameState();
  const raw=JSON.parse(json);
  const result=normalizeI2GameState(raw);
  if(!result)return newI2GameState();
  if(raw.schema!==I2_GAME_SCHEMA){
   // Best-effort upgrade; valid old progress still works in a storage-limited browser.
   try{saveI2GameState(storage,result)}catch{}
  }
  return result;
 }catch{return newI2GameState()}
}
