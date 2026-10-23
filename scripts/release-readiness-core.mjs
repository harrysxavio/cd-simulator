/**
 * M8-42 · Release-candidate preparation gate (pure, no network access).
 * Passing this automated check does NOT authorize a stable tag or release.
 * Physical Android/TalkBack and comprehension require independent human proof.
 */
const VALID_VERSION=/^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const REQUIRED_MANUAL=['androidPhysical','talkback','beginnerComprehension'];

export function assessReleaseReadiness({manifest,html,app,verifier,checklist,acceptance}={}){
 const errors=[];
 const fail=m=>errors.push(m);
 const validRelease=manifest&&typeof manifest==='object'
  &&typeof manifest.version==='string'&&VALID_VERSION.test(manifest.version)
  &&Number.isSafeInteger(manifest.assetRevision)&&manifest.assetRevision>=0;
 if(!validRelease)fail('release.json: versión o revisión inválidas');
 if(typeof html!=='string'||typeof app!=='string'||typeof verifier!=='string'){
  fail('Faltan HTML o módulos de aplicación'); 
 }
 const version=validRelease?manifest.version:null;
 const revision=validRelease?String(manifest.assetRevision):null;
 if(version&&typeof html==='string'){
  const required=[
   'id="releaseCurrentVersion">V'+version+'</span>',
   'Versión visible <strong>'+version+'</strong>',
   'href="./src/styles.css?v='+revision+'"',
   'src="./src/app.js?v='+revision+'"',
   'src="./src/release-status.js?v='+revision+'"',
   'id="primarySkuSummary"'
  ];
  for(const token of required)if(!html.includes(token))fail('HTML/activo no coincide: '+token);
 }
 if(revision&&typeof app==='string'){
  const imports=[...app.matchAll(/from\s+['"]([^'"]+)[?]v=(\d+)['"]/g)];
  if(!imports.length)fail('No se encontraron imports versionados en app.js');
  for(const found of imports){
   if(found[2]!==revision)fail('Import desactualizado: '+found[1]);
  }
 }
 if(version&&typeof verifier==='string'
  &&!verifier.includes("version:'"+version+"',assetRevision:"+revision)){
  fail('release-status.js no coincide con manifiesto');
 }
 if(!acceptance||typeof acceptance!=='object'
  ||acceptance.schemaVersion!==1
  ||acceptance.release?.version!==version
  ||acceptance.release?.assetRevision!==manifest?.assetRevision){
  fail('El registro de aceptación no corresponde a la versión candidata');
 }
 if(version&&typeof checklist==='string'){
  if(!checklist.includes('v'+version+' r'+revision)){
   fail('La pauta Android apunta a otra versión');
  }
  if(!checklist.includes('SIN EJECUTAR EN DISPOSITIVO REAL')){
   // Historical text may change once a physical test has actually happened:
   // existence of the checklist remains the invariant, not its pending text.
   if(!checklist.includes('Android físico'))fail('Falta protocolo de accesibilidad física');
  }
 }
 const gates=acceptance?.manualGates;
 if(!gates||typeof gates!=='object')fail('Faltan tres puertas de aceptación humana');
 const pending=[];
 for(const id of REQUIRED_MANUAL){
  const gate=gates?.[id];
  if(!gate||!['pending','passed'].includes(gate.status)){
   fail('Estado manual inválido: '+id);pending.push(id);continue;
  }
  if(gate.status==='pending'){pending.push(id);continue}
  // These fields make the record reviewable; never certify the truth of the
  // evidence or approve deployment without an independent human review.
  const evidence=gate.evidence;
  if(!evidence||typeof evidence!=='object'
   ||!/^\d{4}-\d{2}-\d{2}$/.test(evidence.date||'')
   ||typeof evidence.environment!=='string'||evidence.environment.length<6
   ||typeof evidence.summary!=='string'||evidence.summary.length<15
   ||typeof evidence.reference!=='string'||evidence.reference.length<8){
   fail('Falta evidencia revisable para '+id);
   pending.push(id);
  }
 }
 if(acceptance?.stableTag!==null)fail('Etiqueta estable prematura: requiere aprobación final fuera de CI');
 const technicalContract=errors.length===0?'passed':'failed';
 // The automated check can NEVER authorize a stable release: external
 // main/Pages/HTTP runs and human acceptance are evaluated separately.
 const decision=errors.length?'needs-repair':
  pending.length?'blocked-manual':'requires-final-human-and-ci-review';
 return Object.freeze({
  version,assetRevision:validRelease?manifest.assetRevision:null,
  technicalContract,decision,manualPending:Object.freeze(pending),
  mayCreateStableTag:false,errors:Object.freeze(errors)
 });
}
