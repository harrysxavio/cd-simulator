import test from 'node:test';
import assert from 'node:assert/strict';
import {I2_AREAS} from '../src/i2-product-contract.js';
import {
 I2_GAME_STORAGE_KEY,I2_GAME_SCHEMA,newI2GameState,
 normalizeI2GameState,loadI2GameState,saveI2GameState
} from '../src/i2-game-state.js';

const fakeStorage=(initial={})=>{
 const items=new Map(Object.entries(initial)),writes=[];
 return {
  items,writes,
  getItem(k){return items.has(k)?items.get(k):null},
  setItem(k,v){writes.push(k);items.set(k,String(v))}
 };
};
test('I2-05: clean start has stable case seed and own versioned storage key',()=>{
 const x=newI2GameState();
 assert.equal(x.schema,2);
 assert.equal(I2_GAME_SCHEMA,2);
 assert.equal(x.seed,'alpha-case-01');
 assert.equal(x.campaignId,'CD-I2-MVP-ALFA');
 assert.equal(x.phase,'intro');
 assert.equal(x.substep,'briefing');
 assert.equal(x.confirmedAreas.length,0);
 assert.equal(Object.keys(x.choices).length,8);
 const db=fakeStorage({'supply-lab-v90':'{"important":"keep"}'});
 assert.deepEqual(loadI2GameState(db),x);
 assert.deepEqual(db.writes,[]);
 const saved=saveI2GameState(db,x);
 assert.deepEqual(saved,x);
 assert.deepEqual(db.writes,[I2_GAME_STORAGE_KEY]);
 assert.equal(db.getItem('supply-lab-v90'),'{"important":"keep"}');
});

test('I2-05: valid v1 game progress migrates to v2 without revealing surprise',()=>{
 const old={...newI2GameState(),schema:1,phase:'area',index:3,
  confirmedAreas:I2_AREAS.slice(0,3).map(a=>a.id),substep:undefined,
  selectedPurchaseOrders:[{sku:'A',email:'not-for-local-storage'}],
  customerName:'do not persist'};
 delete old.campaignId;delete old.seed;
 const db=fakeStorage({[I2_GAME_STORAGE_KEY]:JSON.stringify(old),
  'supply-lab-v90':'{"choices":{"picking":"normal"}}'});
 const restored=loadI2GameState(db);
 assert.equal(restored.schema,2);
 assert.equal(restored.phase,'area');
 assert.equal(restored.index,3);
 assert.deepEqual(restored.confirmedAreas,['commercial','planning','purchasing']);
 assert.equal(restored.reveal,false);
 assert.equal(restored.substep,'decision');
 assert.deepEqual(db.writes,[I2_GAME_STORAGE_KEY]);
 assert.equal(db.getItem('supply-lab-v90'),'{"choices":{"picking":"normal"}}');
 const persisted=db.getItem(I2_GAME_STORAGE_KEY);
 assert.doesNotMatch(persisted,/customerName|customerEmail|selectedPurchaseOrders|not-for-local-storage/);
 assert.deepEqual(JSON.parse(persisted),restored);
});

test('I2-05: completed campaign resumes with eight confirmed choices and reveal state',()=>{
 const all=I2_AREAS.map(a=>a.id);
 const completed={...newI2GameState(),phase:'result',substep:'learning',
  index:7,confirmedAreas:all,reveal:true,recovery:'combined',arrivalDay:13,coverage:75};
 const db=fakeStorage();
 saveI2GameState(db,completed);
 assert.deepEqual(loadI2GameState(db),completed);
 const consulted={...completed,phase:'area',substep:'decision',reveal:false,index:2};
 assert.equal(normalizeI2GameState(consulted)?.index,2,
  'Consult-only back navigation may show an earlier confirmed area');
});

test('I2-05: JSON corruption and forged progression cannot unlock unseen results',()=>{
 for(const invalid of [
  '{not-json',JSON.stringify({schema:3}),JSON.stringify([]),
  JSON.stringify({...newI2GameState(),seed:'forged'}),
  JSON.stringify({...newI2GameState(),phase:'result',reveal:true}),
  JSON.stringify({...newI2GameState(),phase:'recover',reveal:false,
   confirmedAreas:I2_AREAS.map(a=>a.id)}),
  JSON.stringify({...newI2GameState(),phase:'area',reveal:true}),
  JSON.stringify({...newI2GameState(),choices:{...newI2GameState().choices,picking:'fake'}}),
  JSON.stringify({...newI2GameState(),confirmedAreas:['fake']}),
  JSON.stringify({...newI2GameState(),confirmedAreas:['commercial','commercial']})
 ]){
  const db=fakeStorage({[I2_GAME_STORAGE_KEY]:invalid,'supply-lab-v90':'stable'});
  assert.deepEqual(loadI2GameState(db),newI2GameState());
  assert.equal(db.getItem('supply-lab-v90'),'stable');
  assert.equal(db.writes.length,0);
 }
});
test('I2-05: blocked localStorage can still start an in-memory mission',()=>{
 const blocked={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};
 assert.deepEqual(loadI2GameState(blocked),newI2GameState());
 assert.throws(()=>saveI2GameState(blocked,newI2GameState()),/blocked/);
});
