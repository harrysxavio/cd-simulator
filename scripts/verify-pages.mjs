import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const release=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'));
const base=process.env.PAGES_URL||'https://harrysxavio.github.io/cd-simulator/';
const max=Number(process.env.VERIFY_ATTEMPTS||36),delay=Number(process.env.VERIFY_INTERVAL_MS||10000);
if(!/^https:\/\//.test(base)||!Number.isInteger(max)||max<1||max>90||!Number.isInteger(delay)||delay<0||delay>60000)throw new Error('Invalid verification configuration');
const expected='V'+release.version;
const req=async(name,attempt)=>{
 const url=new URL(name,base);
 url.searchParams.set('pages_check',release.assetRevision+'-'+attempt+'-'+Date.now());
 const response=await fetch(url,{cache:'no-store',redirect:'follow',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},signal:AbortSignal.timeout(18000)});
 const body=await response.text();
 console.log('Check',name||'index.html','HTTP',response.status,'Age',response.headers.get('age')||'none','ETag',response.headers.get('etag')||'none','bytes',body.length);
 if(!response.ok)throw new Error(name+' HTTP '+response.status);
 return body;
};
async function verify(attempt){
 const html=await req('',attempt);
 const errors=[];
 if(!html.includes('id="releaseCurrentVersion">'+expected+'</span>'))errors.push('HTML release header is not '+expected);
 if(!html.includes('src="./src/app.js?v='+release.assetRevision+'"'))errors.push('HTML references a different app asset revision');
 if(!html.includes('src="./src/release-status.js?v='+release.assetRevision+'"'))errors.push('HTML does not load release freshness verifier');
 if(!html.includes('id="primarySkuSummary"'))errors.push('HTML missing canonical SKU summary');
 // I2-03: the public V1 link must point at an actually published child route.
 if(!html.includes('id="gameEntry" href="./juego/"'))errors.push('HTML missing real game route link');
 if(!html.includes('Jugar Misión CD'))errors.push('HTML missing playable alpha entry label');
 if(errors.length)throw new Error(errors.join('; '));
 const [remoteManifest,app,check,gameHtml,gameCss,gameJs,mvpJs,sharedJs,stateJs,boundaryJs,progressJs,helpJs,guideJs,briefJs,nicoTutorialJs,nicoSprite,incidentModuleJs]=await Promise.all([
  req('release.json',attempt),
  req('src/app.js?v='+release.assetRevision,attempt),
  req('src/release-status.js?v='+release.assetRevision,attempt),
  req('juego/',attempt),
  req('juego/styles.css',attempt),
  req('juego/app.js',attempt),
  req('src/i2-mvp-adapter.js',attempt),
  req('src/i2-game-campaign-adapter.js',attempt),
  req('src/i2-game-state.js',attempt),
  req('src/i2-result-boundary.js',attempt),
  req('src/i2-game-progress.js',attempt),
  req('juego/help-dialog.js',attempt),
  req('src/i2-game-guide.js',attempt),
  req('src/i2-first-mission-briefing.js',attempt),
  req('src/i2-nico-tutorial.js',attempt),
  req('juego/nico.svg',attempt),
  req('src/i2-incident-response.js',attempt)
 ]);
 const dailyJs=await req('src/i2-daily-operations.js',attempt);
 if(!dailyJs.includes('function i2DailyOperationsSnapshot'))throw new Error('Published daily operational read model absent');
 // I2-35.5c3c: don't accept green Pages unless the real dated Quality
 // intervention and its physical cost engine are actually served.
 const [bridgeJs,eventsJs,recoveryJs,multiJs]=await Promise.all([
  req('src/i2-quality-bridge.js',attempt),
  req('src/events.js',attempt),
  req('src/recovery.js',attempt),
  req('src/i2-multi-recovery.js',attempt)
 ]);
 if(!bridgeJs.includes('I2_QUALITY_BRIDGE')
  ||!eventsJs.includes('qualityBridgeReleasedSkuUnits')
  ||!recoveryJs.includes('qualityBridgeCostCLP')
  ||!multiJs.includes('qualityBridgeReleasedSkuUnits')
  ||!dailyJs.includes('qualityBridgeCostCLP')
  ||!gameJs.includes("['quality-bridge','Activar línea alternativa de Calidad")
  ||!gameJs.includes('i2-quality-bridge-reading')
  ||!gameCss.includes('.i2-quality-bridge-reading'))
  throw new Error('Published Quality alternate line or its dated economics is missing');
 // I2-35.5c3d: verify the day-3 Receiving shift is actually deployed,
 // rather than a PR that merged without serving the new physical module.
 const [dockJs,receivingJs]=await Promise.all([
  req('src/i2-receiving-shift.js',attempt),
  req('src/receiving-ledger.js',attempt)
 ]);
 if(!dockJs.includes('I2_RECEIVING_SHIFT')
  ||!receivingJs.includes('receivingShiftUsedSkuUnits')
  ||!eventsJs.includes('receivingShiftUsedSkuUnits')
  ||!recoveryJs.includes('receivingShiftCostCLP')
  ||!multiJs.includes('receivingShiftUsedSkuUnits')
  ||!gameJs.includes("'dock-shift','Contratar turno extra de Recepción")
  ||!gameJs.includes('Turno extraordinario de Recepción'))
  throw Error('Published Receiving day-3 physical shift is absent');
 // Preserve the previous Quality publication assertion.
 // Nico visual expansion is an art library of 24 individually cropped PNGs,
 // not an on-demand external image service. Verify that Pages publishes EACH
 // unmodified file, so rendered cards never silently fall back to older art.
 const imageBase='juego/assets/nico/expansion-2026-10-31/';
 const imageManifest=JSON.parse(readFileSync(
  new URL('../juego/assets/nico/expansion-2026-10-31/manifest.json',import.meta.url),'utf8'));
 if(imageManifest.assets?.length!==24||new Set(imageManifest.assets.map(a=>a.path)).size!==24)
  throw Error('Unexpected Nico expansion manifest');
 const remoteImageManifest=JSON.parse(await req(imageBase+'manifest.json',attempt));
 if(JSON.stringify(remoteImageManifest)!==JSON.stringify(imageManifest))
  throw Error('Published Nico manifest differs from local verified manifest');
 const expandedNico=await req('src/i2-nico-expansion.js',attempt);
 if(!expandedNico.includes('I2_NICO_EXPANSION_READY=true')
  ||!expandedNico.includes('daily-quality-bridge')
  ||!gameJs.includes('nicoMomentPortrait')
  ||!gameJs.includes("model.qualityBridgeCostCLP?'daily-quality-bridge'"))
  throw Error('Published game does not use the contextual Nico expansion');
 for(let i=0;i<imageManifest.assets.length;i+=4){
  await Promise.all(imageManifest.assets.slice(i,i+4).map(async image=>{
   if(!/^(escenas|gestion|resultados|gestos)\/[0-9]{2}_[a-z_]+\.png$/.test(image.path))
    throw Error('Unexpected Nico image path '+image.path);
   const url=new URL(imageBase+image.path,base);
   url.searchParams.set('nico_sha_check',release.assetRevision+'-'+attempt);
   const resp=await fetch(url,{cache:'no-store',
    signal:AbortSignal.timeout(18000),headers:{'Cache-Control':'no-cache'}});
   if(!resp.ok)throw Error('Nico image missing '+image.path+' HTTP '+resp.status);
   const bytes=Buffer.from(await resp.arrayBuffer());
   if(bytes.length<2000||bytes.length>300000||
    !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||
    createHash('sha256').update(bytes).digest('hex')!==image.sha256)
    throw Error('Nico published PNG differs from original SHA-256 '+image.path);
   console.log('Nico image verified:',image.path,bytes.length,'bytes');
  }));
 }
 // Lab12 · I2-36: verify the ten original isometric CD files by binary SHA.
 // A build may succeed even when /juego/ references a wrong or stale image.
 const [artCatalog,sceneUi,tourUi]=await Promise.all([
  req('src/i2-cd-isometric-art.js',attempt),
  req('juego/cd-isometric-scenes.js',attempt),
  req('juego/nico-journey-dialog.js',attempt)
 ]);
 if(!artCatalog.includes('I2_CD_ART')||
    !sceneUi.includes('renderI2CdScene')||
    !gameJs.includes("renderI2CdScene(area.id")||
    !tourUi.includes("renderI2CdScene(artKey")||
    !gameCss.includes('.cd-iso-card'))
  throw Error('Published isometric CD tutorial/area UI is absent or stale');
 const sceneImages=[
  '01_centro_logistico_completo.png',
  'areas/02_comercial.png','areas/03_planificacion.png',
  'areas/04_compras.png','areas/05_recepcion.png',
  'areas/06_calidad.png','areas/07_inventario_almacen.png',
  'areas/08_picking.png','areas/09_transporte_despacho.png',
  'areas/10_monitoreo_gerencia.png'
 ];
 for(let i=0;i<sceneImages.length;i+=2){
  await Promise.all(sceneImages.slice(i,i+2).map(async file=>{
   const local=readFileSync(new URL('../juego/assets/cd-isometrico/'+file,import.meta.url));
   const url=new URL('juego/assets/cd-isometrico/'+file,base);
   url.searchParams.set('cd_art_sha_check',release.assetRevision+'-'+attempt);
   const response=await fetch(url,{cache:'no-store',
    signal:AbortSignal.timeout(18000),headers:{'Cache-Control':'no-cache'}});
   if(!response.ok)throw Error('CD isometric image missing '+file+' HTTP '+response.status);
   const remote=Buffer.from(await response.arrayBuffer());
   const expectedHash=createHash('sha256').update(local).digest('hex');
   const remoteHash=createHash('sha256').update(remote).digest('hex');
   if(remote.length!==local.length||remoteHash!==expectedHash)
    throw Error('CD isometric art differs from original bytes '+file);
   console.log('CD isometric image verified:',file,remote.length,'bytes');
  }));
 }
 let manifest;
 try{manifest=JSON.parse(remoteManifest)}catch{throw Error('Published release.json not valid JSON')}
 if(manifest.version!==release.version||manifest.assetRevision!==release.assetRevision)throw new Error('Published release manifest differs from repository HEAD');
 if(!app.includes("function renderPrimarySkuSummary(model)"))throw new Error('Published app script is missing canonical overview');
 if(!check.includes("wireReleaseStatus"))throw new Error('Published updater is missing');
 // Confirm that GitHub Pages publishes both routes and the orange stylesheet,
 // rather than accepting a green build with a broken navigation destination.
 if(!gameHtml.includes('<title>Misión CD')||!gameHtml.includes('href="../"')
  ||!gameHtml.includes('id="gameScene"')||!gameHtml.includes('src="./app.js"'))
  throw new Error('Published game route is stale or malformed');
 if(!gameCss.includes('--primary:#f97316'))throw new Error('Published game stylesheet is missing');
 // I2-36: the incident/day components must use the same dark-orange palette
 // as the rest of Misión CD, not white fallbacks from a light CSS template.
 const operationsCss=gameCss.slice(gameCss.indexOf('/* I2-35.5c · Sorpresa'));
 if(!operationsCss.includes('.i2-daily-incidents')
  ||!operationsCss.includes('background:var(--panel);color:var(--text)')
  ||!operationsCss.includes('.i2-operational-drill-button')
  ||!operationsCss.includes('border-inline-start:4px solid var(--primary)')
  ||operationsCss.includes('var(--surface')
  ||operationsCss.includes('var(--line')
  ||operationsCss.includes('var(--muted-surface')
  ||operationsCss.includes('#2563eb'))
  throw new Error('Published game incident panels are missing the dark-orange theme fix');
 // I2-35.5c2: enforce that the visible incident decision is live, not merely
 // merged on GitHub. An older cached game cannot pass the current release.
 if(!gameJs.includes('function incidentResponseScene')
  ||!gameJs.includes('function operationalIncidentCard')
  ||!gameCss.includes('.i2-incident-choice')
  ||!incidentModuleJs.includes('i2IncidentDecisionCheckpoint')
  ||!gameJs.includes('function incidentSecondResponseScene')
  ||!incidentModuleJs.includes('i2ConfirmNextIncidentResponse')
  ||!gameJs.includes('function incidentDailyScene')
  ||!gameJs.includes('i2DailyOperationsSnapshot')
  ||!gameCss.includes('.i2-daily-metrics')
  ||!stateJs.includes('incidentViewDay')
  ||!stateJs.includes('incidentFirstActions')
  ||!gameCss.includes('.i2-two-decision-summary')
  ||!stateJs.includes('eventSeed'))
  throw new Error('Published operational incident decision is missing or stale');
 if(!gameHtml.includes('id="gameChapter"')||!gameHtml.includes('id="gameMapOpen"')
  ||!gameHtml.includes('role="progressbar"'))throw new Error('Published I2-11 roadmap or progressbar missing');
 // Verify the module dependency chain that is actually served after I2-04/05/06.
 // The old literal "campaignSkuContract" in i2-mvp-adapter.js disappeared
 // when orchestration moved to i2-game-campaign-adapter.js. Requiring it
 // there produced a false red build despite HTTP 200 and a working game.
 if(!gameJs.includes('function recoveryScene')
  ||!gameJs.includes("from '../src/i2-result-boundary.js'")
  ||!mvpJs.includes("from './i2-game-campaign-adapter.js'")
  ||!sharedJs.includes("from './campaign-contract.js'")
  ||!sharedJs.includes('createI2GameCampaignAdapter')
  ||!stateJs.includes('loadI2GameState')
  ||!boundaryJs.includes('i2SafeScorecard')
  ||!progressJs.includes('i2ProgressView')
  ||!helpJs.includes('openI2HelpDialog')
  ||!gameJs.includes("from '../src/i2-game-progress.js'")
  ||!gameJs.includes("from '../src/i2-game-guide.js'")
  ||!guideJs.includes('i2GuideHint')
  ||!briefJs.includes('i2FirstMissionBriefing')
  ||!gameJs.includes("from '../src/i2-first-mission-briefing.js'")
  ||!gameJs.includes("from '../src/i2-nico-tutorial.js'")
  ||!nicoTutorialJs.includes('i2NicoCoachTip')
  ||!nicoSprite.includes('<svg')||!nicoSprite.includes('viewBox="0 0 32 32"'))
  throw new Error('Published game module dependency chain is missing or stale');
 console.log('PAGES LIVE VERIFIED: version',release.version,'asset revision',release.assetRevision,'URL',base);
}
let last;
for(let i=1;i<=max;i++){
 try{await verify(i);process.exit(0)}catch(e){
  last=e;
  console.warn('Pages not yet confirmed, attempt',i+'/'+max,':',e.message);
  if(i<max)await new Promise(resolve=>setTimeout(resolve,delay));
 }
}
console.error('PUBLIC PAGES DOES NOT MATCH MAIN RELEASE:',last?.message);
process.exit(1);
