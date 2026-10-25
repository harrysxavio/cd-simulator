import {readFileSync} from 'node:fs';
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
 const [remoteManifest,app,check,gameHtml,gameCss,gameJs,mvpJs,sharedJs,stateJs,boundaryJs,progressJs,helpJs,guideJs,briefJs,nicoTutorialJs,nicoSprite]=await Promise.all([
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
  req('juego/nico.svg',attempt)
 ]);
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
