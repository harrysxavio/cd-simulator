import test from 'node:test';
import assert from 'node:assert/strict';
import {firstCampaignGuideReadModel} from '../src/first-campaign-guide.js';

test('M7-34: four-stage order has short actions, relevant reasons and no engine outputs',()=>{
 const cases=[
  ['operations',1,'Planificar','Comercial'],
  ['preliminary',2,'demanda sorpresa','demanda'],
  ['recovery',3,'opcional','comprar'],
  ['dashboard',4,'resultado','despachados']
 ];
 for(const [section,step,title,action] of cases){
  const guide=firstCampaignGuideReadModel({
   section,areaIndex:0,areaTitle:'Comercial',areaCount:8,revealed:section!=='operations'
  });
  assert.equal(guide.passed,true);
  assert.equal(guide.step,step);assert.equal(guide.totalSteps,4);
  assert.match(guide.title,new RegExp(title,'i'));
  assert.match(guide.instruction,new RegExp(action,'i'));
  assert.ok(guide.why.length>40);
  assert.equal(guide.source,'navigation-only');
  assert.equal(guide.revealsDemand,false);assert.equal(guide.editsDecisions,false);
  assert.equal(guide.canSkip,true);
  assert.ok(Object.isFrozen(guide));
  assert.throws(()=>{guide.step=99},TypeError);
 }
});

test('M7-34: eight operation areas update prompt and next action without forcing a choice',()=>{
 const first=firstCampaignGuideReadModel({areaIndex:0,areaCount:8,areaTitle:'Comercial'});
 const eighth=firstCampaignGuideReadModel({areaIndex:7,areaCount:8,areaTitle:'Transporte'});
 assert.match(first.instruction,/Área 1 de 8: Comercial/);
 assert.match(eighth.instruction,/Área 8 de 8: Transporte/);
 assert.equal(first.next,'Siguiente área');
 assert.equal(eighth.next,'Ver diagnóstico preliminar');
 assert.match(first.instruction,/deja la sugerida/);
});

test('M7-34: revisiting original plan never encourages retroactive purchase edits',()=>{
 const x=firstCampaignGuideReadModel({
  section:'operations',areaIndex:4,areaTitle:'Calidad',revealed:true
 });
 assert.match(x.instruction,/congelado/);
 assert.match(x.instruction,/sin cambiar compras/);
 assert.equal(x.editsDecisions,false);
});

test('M7-34: model cannot invent navigational states or accept untrusted area markup',()=>{
 for(const p of [
  {section:'hidden'},
  {areaIndex:-1},{areaIndex:8},{areaIndex:1.3},
  {areaCount:0},{areaTitle:'<script>alert(1)</script>'.repeat(4)},
  {revealed:1}
 ])assert.throws(()=>firstCampaignGuideReadModel(p),/Guía inicial/);
});
