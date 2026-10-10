import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aggregateFlowCsv} from '../src/aggregate-export.js';
import {SCOPE_DEFINITIONS} from '../src/measurements.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('M2-04a: CSV explicitly identifies the aggregate, single-shift unit',()=>{
 const csv=aggregateFlowCsv({
  stages:[{id:'receiving',input:100,output:80,capacity:90},{id:'transport',input:80,output:75,capacity:75}],
  areaNames:['Recepción','Transporte'],
  actions:{receiving:10}
 });
 assert.ok(csv.startsWith('\ufeff'), 'Excel CSV starts with a BOM');
 assert.match(csv,/Modelo";"Jornada agregada"/);
 assert.ok(csv.includes('Unidad";"'+SCOPE_DEFINITIONS.aggregate.displayUnit+'"'));
 assert.match(csv,/Período";"Una jornada didáctica"/);
 assert.match(csv,/No son pedidos SKU ni entregas al cliente/);
 assert.match(csv,/Área";"Entrada";"Salida";"Capacidad";"Recuperación"/);
 assert.match(csv,/Recepción";"100";"80";"90";"10"/);
 assert.match(csv,/Transporte";"80";"75";"75";"0"/);
 for(const row of csv.slice(1).split('\r\n').filter(Boolean)){
  assert.equal(row.split(';').length,5,'all CSV data rows have five columns');
 }
});

test('M2-04a: aggregate exporter rejects conflicting dimensions and safely quotes text',()=>{
 assert.throws(()=>aggregateFlowCsv({stages:[{id:'x',input:1,output:1,capacity:1}],areaNames:[]}),/no coinciden/);
 assert.throws(()=>aggregateFlowCsv({stages:[{id:'x',input:NaN,output:1,capacity:1}],areaNames:['X']}),/inválido/);
 const csv=aggregateFlowCsv({stages:[{id:'x',input:1,output:1,capacity:1}],areaNames:['=HYPERLINK("evil")']});
 assert.match(csv,/"'=HYPERLINK\(""evil""\)"/);
});

test('M2-04a: all important data views have an explicit matching scope marker',()=>{
 const required={
  'primarySkuSummary':'sku-cohort',
  'canonicalAreaView':'sku-cohort',
  'legacyAggregateDetails':'aggregate-shift',
  'diagnosisTechnical':'aggregate-shift',
  'traceDetails':'aggregate-shift',
  'sku':'aggregate-shift',
  'economicDetails':'aggregate-shift',
  'report':'aggregate-shift'
 };
 for(const [id,scope] of Object.entries(required)){
  assert.match(html,new RegExp('<[^>]+id="'+id+'"[^>]*data-model-scope="'+scope+'"'),id);
 }
 assert.match(html,/data-result-page="economics" data-model-scope="aggregate-shift"/);
 assert.ok(html.includes('CSV · jornada agregada'));
 assert.ok(html.includes('Flujo agregado por área'));
 assert.ok(html.includes('Costos estimados de una jornada agregada'));
 assert.ok(!html.includes('Flujo real por área'),'legacy flow cannot imply real SKU shipments');
 assert.ok(app.includes('aggregateFlowCsv({stages:flowResult.stages'));
 assert.ok(app.includes("supply-chain-jornada-agregada.csv"));
 assert.ok(!app.includes("supply-chain-cadena.csv"));
});

test('M2-04a: legacy economic and diagnostic numbers remain explicitly separate from physical SKU evidence',()=>{
 assert.ok(html.indexOf('id="primarySkuSummary"')<html.indexOf('id="legacyAggregateDetails"'));
 assert.match(html,/id="legacyAggregateDetails"[^>]*data-model-scope="aggregate-shift"/);
 assert.match(html,/id="primarySkuSummary"[^>]*data-model-scope="sku-cohort"/);
 assert.match(html,/data-result-page="improvement"/);
 assert.ok(html.includes('no representan la economía de la campaña SKU'));
 assert.ok(html.includes('No son pedidos completos SKU ni su resultado económico.'));
});
