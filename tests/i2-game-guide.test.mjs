import test from 'node:test';
import assert from 'node:assert/strict';
import {newI2GameState} from '../src/i2-game-state.js';
import {navigateI2GameState} from '../src/i2-game-navigation.js';
import {i2GuideHint,I2_GUIDE_KEY,readI2GuidePreference,saveI2GuidePreference} from '../src/i2-game-guide.js';

const move=(s,action)=>navigateI2GameState(s,action);
test('I2-12: optional guide hints are brief and never disclose actual demand or economic replay',()=>{
 let s=newI2GameState();
 const hints=[i2GuideHint(s).text];
 s=move(s,'start');
 for(let i=0;i<8;i++){hints.push(i2GuideHint(s).text);s=move(s,'forward')}
 hints.push(i2GuideHint(s).text);
 s=move(s,'reveal');
 hints.push(i2GuideHint(s).text);
 s=move(s,'back');
 hints.push(i2GuideHint(s).text);
 s=move(s,'return-to-recovery');
 s=move(s,'finish');
 hints.push(i2GuideHint(s).text);
 assert.equal(hints.length,13);
 for(const hint of hints){
  assert.ok(hint.length<=135,'Guide must be no more than one or two short lines');
  assert.doesNotMatch(hint,/\b40\s*%|280 pedidos|actualDemand|shippedOrders|CLP\s*\d/);
 }
 assert.throws(()=>i2GuideHint({...newI2GameState(),phase:'result'}),/I2-12/);
});

test('I2-12: opting in and out uses independent nonpersonal preference key',()=>{
 const data=new Map([['supply-lab-v90','legacy'],['supply-lab-i2-v1','campaign']]);
 const writes=[];
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);writes.push(k)}};
 assert.equal(readI2GuidePreference(storage),false);
 assert.equal(saveI2GuidePreference(storage,true),true);
 assert.equal(readI2GuidePreference(storage),true);
 assert.equal(saveI2GuidePreference(storage,false),false);
 assert.equal(readI2GuidePreference(storage),false);
 assert.deepEqual(writes,[I2_GUIDE_KEY,I2_GUIDE_KEY]);
 assert.equal(data.get('supply-lab-v90'),'legacy');
 assert.equal(data.get('supply-lab-i2-v1'),'campaign');
 assert.throws(()=>saveI2GuidePreference(storage,'yes'),/I2-12/);
 assert.equal(readI2GuidePreference({getItem(){throw Error('blocked')}}),false);
});
