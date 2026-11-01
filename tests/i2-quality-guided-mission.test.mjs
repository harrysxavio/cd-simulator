import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState,normalizeI2GameState} from '../src/i2-game-state.js';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {I2_QUALITY_GUIDED,i2IsQualityGuided,i2StartQualityGuided,
 i2LeaveQualityGuided,i2QualityGuidedReflection}
 from '../src/i2-quality-guided-mission.js';

/** No hay un segundo motor, ni un formato de guardado nuevo obligatorio. */
test('I2-35.2: Calidad activa un perfil físico reversible y persistente',()=>{
 const before=newI2GameState();
 const active=i2StartQualityGuided(before);
 assert.equal(active.seed,'alpha-case-01');
 assert.equal(active.advanced.stockProfile,'low');
 assert.equal(active.advanced.pickingLimitSkuPerDay,'base');
 assert.equal(active.guidedScenario,'quality-low-stock');
 assert.equal(i2IsQualityGuided(active),true);
 assert.deepEqual(normalizeI2GameState(JSON.parse(JSON.stringify(active))),active);
 assert.deepEqual(i2LeaveQualityGuided(active),before);
 assert.deepEqual(before,newI2GameState());
 assert.equal(I2_QUALITY_GUIDED.id,'ARC-05-GUIDED');
 assert.throws(()=>i2QualityGuidedReflection(active),/después del resultado/);
});

test('I2-35.2: no permite cambiar misión con decisiones confirmadas ni falsificar el guardado',()=>{
 const active=i2StartQualityGuided(newI2GameState());
 const committed={...active,phase:'area',index:1,
  confirmedAreas:[I2_AREAS[0].id]};
 assert.throws(()=>i2StartQualityGuided(committed),/antes de confirmar/);
 assert.throws(()=>i2LeaveQualityGuided(committed),/confirmado/);
 assert.equal(normalizeI2GameState({...active,guidedScenario:'falso'}),null);
 assert.equal(normalizeI2GameState({...active,guidedScenario:'quality-low-stock',
  eventSeed:'incident-receiving-stop'}),null);
 assert.equal(normalizeI2GameState({...active,extraPrivateData:'prohibido'}).extraPrivateData,undefined);
});

test('I2-35.2: evidencia real de Calidad no se confunde con mayor expedición',()=>{
 const active=i2StartQualityGuided(newI2GameState());
 const prepared={...active,
  choices:{...active.choices,planning:'buffer',purchasing:'express',
   receiving:'low',quality:'slow',inventory:'count',
   picking:'reinforce',transport:'low'},
  phase:'result',index:7,reveal:true,
  confirmedAreas:I2_AREAS.map(area=>area.id)
 };
 const evidence=i2QualityGuidedReflection(prepared);
 assert.equal(evidence.actualOrders,280);
 assert.equal(evidence.chosenHeldSku,12);
 assert.equal(evidence.alternativeHeldSku,0);
 assert.equal(evidence.chosenShipped,103);
 assert.equal(evidence.alternativeShipped,103);
 assert.equal(evidence.shippedDelta,0);
 assert.match(evidence.finding,/no modificó/);
 assert.match(evidence.boundary,/no es una acción retroactiva/);
 assert.deepEqual(evidence,i2QualityGuidedReflection(prepared));
 assert.equal(prepared.choices.quality,'slow');
 assert.throws(()=>i2QualityGuidedReflection({...prepared,reveal:false}),
  /después del resultado/);
});
