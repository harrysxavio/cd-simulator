import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_AREAS,I2_PRODUCT_SCOPE} from '../src/i2-product-contract.js';
import {newI2GameState} from '../src/i2-game-state.js';
import {i2FirstMissionBriefing} from '../src/i2-first-mission-briefing.js';
import {navigateI2GameState,i2FooterLabels} from '../src/i2-game-navigation.js';
import {I2_MVP_CASE} from '../src/i2-mvp-adapter.js';

test('I2-13: briefing is accurate, concise and never displays unrevealed demand',()=>{
 const briefing=i2FirstMissionBriefing(newI2GameState());
 assert.match(briefing.title,/Hoy tú diriges/);
 assert.match(briefing.meaning,/centro de distribución \(CD\)/);
 assert.equal(briefing.quickFacts.length,3);
 assert.deepEqual(briefing.quickFacts.map(x=>x.value),
  [String(I2_AREAS.length),String(I2_PRODUCT_SCOPE.skuIds.length),String(I2_PRODUCT_SCOPE.horizonDays)]);
 assert.equal(briefing.plannedOrders,I2_MVP_CASE.plannedOrders);
 assert.equal(briefing.steps.length,3);
 assert.equal(briefing.action,'Comenzar misión →');
 assert.equal(briefing.continuing,false);
 assert.equal(briefing.confirmed,0);
 assert.equal(briefing.resumeLabel,null);
 assert.ok(Object.isFrozen(briefing)&&Object.isFrozen(briefing.quickFacts));
 const text=JSON.stringify(briefing);
 for(const prohibited of ['actualDemand','actualOrders','280 pedidos','40 %','purchaseOrders','shipments','incrementalExpense'])
  assert.ok(!text.includes(prohibited),'Briefing unexpectedly reveals '+prohibited);
 assert.match(briefing.warning,/no genera compras/);
});

test('I2-13: return to briefing and continue at earliest unfinished area without changing confirmed choices',()=>{
 let state=navigateI2GameState(newI2GameState(),'start');
 state=navigateI2GameState(state,'forward'); // Comercial closed, Planning current
 assert.equal(state.index,1);
 const closed=structuredClone(state.choices);
 state=navigateI2GameState(state,'back'); // closed Comercial
 state=navigateI2GameState(state,'back'); // intro with one confirmed
 assert.equal(state.phase,'intro');
 assert.deepEqual(state.confirmedAreas,[I2_AREAS[0].id]);
 const intro=i2FirstMissionBriefing(state);
 assert.equal(intro.continuing,true);
 assert.equal(intro.confirmed,1);
 assert.equal(intro.action,'Continuar mi plan →');
 assert.equal(i2FooterLabels(state).primary,intro.action);
 state=navigateI2GameState(state,'start');
 assert.equal(state.phase,'area');
 assert.equal(state.index,1,'Returning to the mission must not repeat a sealed decision');
 assert.deepEqual(state.choices,closed);
 assert.equal(state.confirmedAreas.length,1);
});

test('I2-13: briefing accepts only intro and can continue all-confirmed plans safely',()=>{
 assert.throws(()=>i2FirstMissionBriefing({phase:'intro'}),/I2-13/);
 assert.throws(()=>i2FirstMissionBriefing(navigateI2GameState(newI2GameState(),'start')),/I2-13/);
 let state=navigateI2GameState(newI2GameState(),'start');
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'forward');
 assert.equal(state.phase,'reveal');
 state=navigateI2GameState(state,'back'); // last confirmed area
 for(let i=0;i<8;i++)state=navigateI2GameState(state,'back');
 assert.equal(state.phase,'intro');
 assert.equal(i2FirstMissionBriefing(state).confirmed,8);
 state=navigateI2GameState(state,'start');
 assert.equal(state.index,7);
 assert.equal(navigateI2GameState(state,'forward').phase,'reveal');
});
