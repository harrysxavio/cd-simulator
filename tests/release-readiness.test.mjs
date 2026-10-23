import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessReleaseReadiness} from '../scripts/release-readiness-core.mjs';

const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const input=()=>({
 manifest:JSON.parse(load('release.json')),
 html:load('index.html'),
 app:load('src/app.js'),
 verifier:load('src/release-status.js'),
 checklist:load('docs/M7-38-ANDROID-A11Y-CHECKLIST.md'),
 acceptance:JSON.parse(load('docs/RELEASE-ACCEPTANCE.json'))
});

test('M8-42: valid technical candidate remains BLOCKED on physical and comprehension',()=>{
 const check=assessReleaseReadiness(input());
 assert.equal(check.technicalContract,'passed',check.errors.join('; '));
 assert.equal(check.decision,'blocked-manual');
 assert.deepEqual(check.manualPending,['androidPhysical','talkback','beginnerComprehension']);
 assert.equal(check.mayCreateStableTag,false);
 assert.deepEqual(check.errors,[]);
});

test('M8-42: mismatch in assets, release/status, or physical target fails closed',()=>{
 const b=input();
 assert.equal(assessReleaseReadiness({...b,html:b.html.replace(
  'src="./src/app.js?v='+b.manifest.assetRevision+'"','src="./src/app.js?v=1"'
 )}).decision,'needs-repair');
 assert.equal(assessReleaseReadiness({...b,app:b.app.replace(
  '?v='+b.manifest.assetRevision,'?v=1'
 )}).decision,'needs-repair');
 assert.equal(assessReleaseReadiness({...b,acceptance:{
  ...b.acceptance,release:{version:'11.20',assetRevision:2}
 }}).decision,'needs-repair');
 assert.equal(assessReleaseReadiness({...b,checklist:b.checklist.replace(
  'v'+b.manifest.version+' r'+b.manifest.assetRevision,'v0.0 r0'
 )}).decision,'needs-repair');
});

test('M8-42: missing human evidence never silently approves stable release',()=>{
 const b=input();
 const status={...b.acceptance,manualGates:{
  ...b.acceptance.manualGates,
  androidPhysical:{status:'passed',evidence:null}
 }};
 const bad=assessReleaseReadiness({...b,acceptance:status});
 assert.equal(bad.decision,'needs-repair');
 assert.ok(bad.manualPending.includes('androidPhysical'));
 assert.equal(bad.mayCreateStableTag,false);
 const label=assessReleaseReadiness({...b,acceptance:{...b.acceptance,stableTag:'v11.68'}});
 assert.equal(label.decision,'needs-repair','A premature stable tag must fail the gate');
});

test('M8-42: even valid manual evidence cannot auto-authorize final stable tagging',()=>{
 const b=input();
 const evidence={date:'2026-10-23',environment:'Android real, Chrome y TalkBack',
  summary:'Resultado manual sujeto a revisión y retest',reference:'ISSUE-67'};
 const all={...b.acceptance,manualGates:Object.fromEntries(
  Object.keys(b.acceptance.manualGates).map(k=>[k,{status:'passed',evidence}])
 )};
 const r=assessReleaseReadiness({...b,acceptance:all});
 assert.equal(r.technicalContract,'passed');
 assert.equal(r.decision,'requires-final-human-and-ci-review');
 assert.equal(r.mayCreateStableTag,false);
});
