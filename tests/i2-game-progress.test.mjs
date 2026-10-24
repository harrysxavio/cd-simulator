import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState as next} from '../src/i2-game-navigation.js';
import {I2_CHAPTERS,i2ProgressView} from '../src/i2-game-progress.js';

test('I2-11: four chapters and eight canonical areas without result leakage',()=>{
 const initial=newI2GameState();
 assert.equal(I2_CHAPTERS.length,4);
 let s=initial,view=i2ProgressView(s);
 assert.equal(view.chapter,1);
 assert.equal(view.percent,0);
 assert.equal(view.confirmed,0);
 assert.equal(view.areas.length,I2_AREAS.length);
 assert.ok(Object.isFrozen(view.areas));
 const text=JSON.stringify(view);
 for(const hidden of ['1400','280 pedidos','40 %','recoveredOrders','actualDemand','incrementalExpense'])
  assert.equal(text.includes(hidden),false,'Map leaks unrevealed demand/results: '+hidden);
 s=next(s,'start');
 view=i2ProgressView(s);
 assert.equal(view.chapter,2);
 assert.equal(view.current,'Área 1 de 8 · '+I2_AREAS[0].title);
 assert.equal(view.percent,10);
 for(let i=0;i<8;i++){
  assert.equal(view.areas[i].status,'actual');
  s=next(s,'forward');
  view=i2ProgressView(s);
  assert.equal(view.confirmed,i+1);
 }
 assert.equal(s.phase,'reveal');
 assert.equal(view.chapter,3);
 assert.equal(view.percent,78);
 assert.ok(view.areas.every(a=>a.status==='confirmada'));
 const before=JSON.stringify(view.mapParagraphs);
 s=next(s,'reveal');
 view=i2ProgressView(s);
 assert.equal(view.chapter,3);
 assert.equal(view.percent,92);
 assert.equal(view.current,'Elegir intervención');
 s=next(s,'back');
 view=i2ProgressView(s);
 assert.equal(view.percent,92);
 assert.equal(view.current,'Revisión del plan cerrado');
 assert.deepEqual(s.confirmedAreas,I2_AREAS.map(a=>a.id));
 s=next(s,'return-to-recovery');
 s=next(s,'finish');
 view=i2ProgressView(s);
 assert.equal(view.chapter,4);
 assert.equal(view.percent,100);
 assert.equal(view.current,'Conclusiones de campaña');
 assert.ok(view.mapParagraphs.some(p=>p.includes('Tu posición:')));
 assert.doesNotMatch(before,/40 %|280 pedidos/);
});

test('I2-11: backing up a confirmed plan reports completed decisions, not fake new progress',()=>{
 let s=next(newI2GameState(),'start');
 s=next(s,'forward');
 assert.equal(i2ProgressView(s).confirmed,1);
 assert.equal(i2ProgressView(s).percent,18);
 s=next(s,'back');
 assert.equal(i2ProgressView(s).current,'Área 1 de 8 · '+I2_AREAS[0].title);
 assert.equal(i2ProgressView(s).areas[0].status,'confirmada');
 assert.equal(i2ProgressView(s).percent,18);
 assert.equal(s.confirmedAreas.length,1);
 assert.throws(()=>i2ProgressView({...newI2GameState(),phase:'result'}),/I2-11/);
});
