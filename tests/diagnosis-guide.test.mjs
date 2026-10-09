import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../src/engine.js';
import {DEFAULT_SCENARIO} from '../src/scenario.js';
import {managerDiagnosis} from '../src/diagnosis-guide.js';

const scenario=(options={})=>({...DEFAULT_SCENARIO,demand:1000,actualDemand:1400,lockUpstream:true,...options});
const state=(decisions={},settings={})=>managerDiagnosis({decisions:{...DEFAULTS,...decisions},scenario:scenario(settings),revealed:true});

test('U1 manager: underforecast, 70% purchase and +40% surprise put sourcing before extra staff',()=>{
 const brief=state({commercial:'under',planning:'partial',purchasing:'reliable'});
 assert.equal(brief.actualDemand,1400);
 assert.equal(brief.estimated,800);
 assert.equal(brief.dispatched,566);
 assert.equal(brief.pending,834);
 assert.equal(brief.category,'supply');
 assert.equal(brief.area,'inventory');
 assert.match(brief.why,/800/);
 assert.match(brief.why,/1.400/);
 assert.match(brief.next,/Reforzar Picking por sí solo no crea stock/);
 assert.deepEqual(brief.options.map(x=>x.type),['review','pilot','future']);
 assert.match(brief.note,/todavía no actualiza/);
 assert.equal(brief.operationalModel,'aggregate-day');
 assert.ok(Object.isFrozen(brief)&&Object.isFrozen(brief.options));
});

test('U1 manager: transport cap is a bottleneck only when picking has actual flow',()=>{
 const brief=state({transport:'low'},{initialStock:1200});
 assert.equal(brief.category,'transport');
 assert.equal(brief.area,'transport');
 assert.match(brief.why,/Transporte/);
 assert.notEqual(brief.category,'supply');
});

test('U1 manager: low picking capacity recommends checking picking rather than buying',()=>{
 const brief=state({picking:'low',values:{picking:500}},{initialStock:1200});
 assert.equal(brief.category,'picking');
 assert.match(brief.why,/Picking/);
});

test('U1 manager: receiving throughput bottleneck is not presented as missing supplier stock',()=>{
 const brief=state({receiving:'low',values:{receiving:100}},{initialStock:0});
 assert.equal(brief.category,'receiving');
 assert.equal(brief.area,'receiving');
 assert.match(brief.why,/Recepción/);
 assert.match(brief.next,/aún no recepcionado/);
});

test('U1 manager: Quality release delay remains separate from Purchasing',()=>{
 const brief=state({quality:'slow',values:{quality:50}},{initialStock:0});
 assert.equal(brief.category,'quality');
 assert.match(brief.next,/sin saltar controles/);
});

test('U1 manager: inventory throughput is diagnosed when stock exists',()=>{
 const brief=state({inventory:'normal'},{initialStock:1200,inventoryOperators:1,inventoryUnitsPerHour:5});
 assert.equal(brief.category,'inventory');
 assert.equal(brief.area,'inventory');
});

test('U1 manager: downside demand requires stock and commitment review, not an emergency PO',()=>{
 const brief=state({}, {demand:1000,actualDemand:500,initialStock:1200});
 assert.equal(brief.category,'surplus');
 assert.equal(brief.pending,0);
 assert.match(brief.context,/disminuyó/);
 assert.ok(brief.options.every(x=>x.type!=='pilot'));
});

test('U1 manager: sufficient throughput is a stable situation with economic review',()=>{
 const brief=state({}, {demand:500,actualDemand:500,initialStock:800});
 assert.equal(brief.category,'balanced');
 assert.equal(brief.severity,'stable');
 assert.equal(brief.pending,0);
 assert.ok(brief.options.every(x=>x.type!=='pilot'));
});

test('U1 manager: unrevealed scenario never represents estimated demand as a known surprise',()=>{
 const brief=managerDiagnosis({decisions:{...DEFAULTS},scenario:{...DEFAULT_SCENARIO,demand:1000,actualDemand:1000},revealed:false});
 assert.match(brief.context,/Aún no conoces la demanda real/);
 assert.match(brief.scenarioLabel,/preparar/);
});
