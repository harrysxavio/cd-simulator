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
 if(errors.length)throw new Error(errors.join('; '));
 const [remoteManifest,app,check]=await Promise.all([
  req('release.json',attempt),
  req('src/app.js?v='+release.assetRevision,attempt),
  req('src/release-status.js?v='+release.assetRevision,attempt)
 ]);
 let manifest;
 try{manifest=JSON.parse(remoteManifest)}catch{throw Error('Published release.json not valid JSON')}
 if(manifest.version!==release.version||manifest.assetRevision!==release.assetRevision)throw new Error('Published release manifest differs from repository HEAD');
 if(!app.includes("function renderPrimarySkuSummary(model)"))throw new Error('Published app script is missing canonical overview');
 if(!check.includes("wireReleaseStatus"))throw new Error('Published updater is missing');
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
