import test from 'node:test';
import assert from 'node:assert/strict';
import {explainOperationalAlert,explainAreaDecision} from '../src/decision-alert-literacy.js';
import {attentionSignals} from '../src/attention.js';
import {flow,ACTIONS} from '../src/flow.js';
import {START,DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';

const all=[
 ['warning','Demanda superior a lo previsto','unexpected-high'],
 ['warning','Demanda inferior a lo previsto','unexpected-low'],
 ['warning','Stock potencial sin demanda en la jornada','surplus'],
 ['danger','Refuerzo sin expedición adicional: Picking','reinforcement-no-gain'],
 ['warning','Revisar retorno del refuerzo: Recepción','reinforcement-tradeoff'],
 ['warning','Capacidad insuficiente: Transporte','capacity'],
 ['warning','Dotación por encima de la carga: Inventario','overstaffed'],
 ['warning','Carga superior a dotación: Picking','understaffed'],
 ['warning','Modo sin retorno demostrado: Calidad','mode-without-return'],
 ['warning','Sobrecosto en Picking','overcost'],
 ['danger','Meta de servicio no alcanzada','service-gap'],
 ['good','Sin alertas críticas del modelo','clear']
];
test('M7-35: every existing alert category has concise meaning, action, and explicit model boundary',()=>{
 for(const [level,title,id] of all){
  const m={level,title,description:'Original model evidence remains unchanged'};
  const explanation=explainOperationalAlert(m);
  assert.equal(explanation.id,id);
  assert.equal(explanation.level,level);
  assert.equal(explanation.originalTitle,title);
  assert.ok(explanation.meaning.length>36);
  assert.ok(explanation.check.length>35);
  assert.match(explanation.limit,/modelo agregado de una jornada/);
  assert.match(explanation.limit,/no identifica una causa raíz exclusiva/);
  assert.equal(explanation.source,'attention-signal');
  assert.equal(explanation.editsDecision,false);
  assert.ok(Object.isFrozen(explanation));
  assert.equal(m.description,'Original model evidence remains unchanged');
  assert.throws(()=>{explanation.check='invent action'},TypeError);
 }
});
test('M7-35: alerts from real scenarios are recognized without changing finance or service',()=>{
 for(const scenario of [
  DEFAULT_SCENARIO,
  {...DEFAULT_SCENARIO,actualDemand:DEFAULT_SCENARIO.demand*1.3},
  {...DEFAULT_SCENARIO,actualDemand:DEFAULT_SCENARIO.demand*.7},
  {...DEFAULT_SCENARIO,pickingOperators:1,receivingOperators:1},
  {...DEFAULT_SCENARIO,initialStock:2000}
 ]){
  const before=JSON.stringify(scenario);
  const report=attentionSignals({...START,...DEFAULTS}, {},scenario);
  const result=flow({...START,...DEFAULTS},{},scenario);
  const warnings=report.messages.map(m=>explainOperationalAlert(m));
  assert.equal(warnings.length,report.messages.length);
  assert.ok(warnings.every(x=>x.passed&&x.model==='aggregate-day'));
  assert.equal(JSON.stringify(scenario),before);
  assert.ok(result.dispatched>=0);
 }
});
test('M7-35: input/output decision teaching is scenario-specific but never equates local flow with SKU shipment',()=>{
 const cases=[
  {area:'Recepción',input:120,output:60,capacity:60,phase:'plan'},
  {area:'Calidad',input:0,output:0,capacity:200,phase:'recover'},
  {area:'Picking',input:75,output:75,capacity:250,phase:'plan'},
  {area:'Inventario',input:300,output:100,capacity:100,phase:'recover'}
 ];
 for(const c of cases){
  const lesson=explainAreaDecision(c);
  assert.equal(lesson.passed,true);
  assert.equal(lesson.area,c.area);
  assert.match(lesson.limit,/Flujo agregado de una jornada/);
  assert.equal(lesson.editsDecision,false);
  assert.ok(lesson.check.length>30);
  assert.ok(Object.isFrozen(lesson));
 }
 assert.match(explainAreaDecision(cases[0]).meaning,/60 quedan detenidas/);
 assert.match(explainAreaDecision(cases[1]).meaning,/No llegaron/);
});
test('M7-35: invalid or unknown signals and corrupt stage values fail closed',()=>{
 for(const m of [
  {level:'warning',title:'Unknown title',description:'any'},
  {level:'good',title:'Sobrecosto en Compras',description:'any'},
  {level:'warning',title:'Sin alertas críticas del modelo',description:'any'},
  {level:'panic',title:'Meta de servicio no alcanzada',description:'any'},
  {level:'warning',title:'Meta de servicio no alcanzada'},
  null
 ])assert.throws(()=>explainOperationalAlert(m),/Explicación de alerta/);
 for(const params of [
  {area:'Recepción',input:-1,output:0,capacity:5,phase:'plan'},
  {area:'Recepción',input:5,output:6,capacity:5,phase:'plan'},
  {area:'Picking',input:7,output:3,capacity:4,phase:'unknown'},
  {area:'',input:0,output:0,capacity:0,phase:'plan'}
 ])assert.throws(()=>explainAreaDecision(params),/Explicación de decisión/);
});
