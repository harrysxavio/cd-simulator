import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRelease,checkPublishedRelease,RELEASE} from '../src/release-status.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'));

test('release protocol: HTML, manifest, JS module and styling all advertise same immutable revision',()=>{
 assert.deepEqual(RELEASE,{version:'11.37',assetRevision:146});
 assert.equal(manifest.version,RELEASE.version);
 assert.equal(manifest.assetRevision,RELEASE.assetRevision);
 assert.ok(html.includes('id="releaseCurrentVersion">V'+RELEASE.version+'</span>'));
 assert.ok(html.includes('src="./src/app.js?v='+RELEASE.assetRevision+'"'));
 assert.ok(html.includes('src="./src/release-status.js?v='+RELEASE.assetRevision+'"'));
 assert.ok(html.includes('href="./src/styles.css?v='+RELEASE.assetRevision+'"'));
 assert.ok(html.includes('id="forceCurrentRelease"'));
 assert.ok(html.includes('id="checkRelease"'));
 assert.ok(html.includes('id="releaseStatus"'));
 assert.ok(!html.includes('V11.20</div>'));
 assert.ok(html.includes('Versión visible <strong>'+RELEASE.version+'</strong>'),'Static release label must be current');
});
test('release check recognizes newer, older and invalid manifests rather than assuming deployment success',()=>{
 assert.equal(compareRelease(manifest),'current');
 assert.equal(compareRelease({version:'11.38',assetRevision:147}),'newer');
 assert.equal(compareRelease({version:'11.20',assetRevision:129}),'older-server');
 for(const v of [{},{version:'x.y',assetRevision:2},{version:'11.37',assetRevision:'146'},null])
  assert.equal(compareRelease(v),'invalid');
});
test('release status requests live server manifest with no-cache and query nonce',async()=>{
 let called=0;
 const fetcher=async(url,options)=>{
  called++;
  const u=new URL(url);
  assert.equal(u.pathname,'/cd-simulator/release.json');
  assert.ok(u.searchParams.has('nocache'));
  assert.equal(options.cache,'no-store');
  assert.equal(options.headers['Cache-Control'],'no-cache');
  return {ok:true,json:async()=>manifest};
 };
 assert.deepEqual(await checkPublishedRelease({baseUrl:'https://harrysxavio.github.io/cd-simulator/?release=11.37-r146',fetcher}),{status:'current',manifest});
 assert.equal(called,1);
 await assert.rejects(checkPublishedRelease({baseUrl:'https://harrysxavio.github.io/cd-simulator/',fetcher:async()=>({ok:false,status:503})}),/HTTP 503/);
});
test('canonical 12-day SKU result is first in overview, legacy aggregate is collapsed and explicitly separated',()=>{
 assert.ok(html.includes('id="primarySkuSummary"'));
 assert.ok(html.includes('id="legacyAggregateDetails"'));
 assert.ok(html.indexOf('id="primarySkuSummary"')<html.indexOf('id="legacyAggregateDetails"'));
 assert.ok(html.includes('modelo didáctico anterior')||html.includes('Modelo didáctico anterior'))
 assert.ok(app.includes('function renderPrimarySkuSummary(model)'));
 assert.ok(app.includes('const projection=skuSession.getProjection({contract,skuInputs:input'));
 assert.ok(app.includes('const physicalAreas=renderCanonicalAreasFromSku(projection.areaModel)'));
 assert.ok(app.includes('currentSkuProjection=projection'));
 assert.ok(app.includes('renderPrimarySkuSummary(physicalAreas)'));
 assert.ok(app.includes("$('primaryToAreas').onclick"));
 assert.ok(html.includes('class="mission-guide"'));
 assert.ok(html.includes('class="guided-flow-hint"'));
 assert.ok(app.includes('manager-preview-hint'));
 assert.ok(app.includes('manager-zero-days'));
});
