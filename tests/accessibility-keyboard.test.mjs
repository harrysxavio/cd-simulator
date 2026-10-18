import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardTabDestination} from '../src/accessibility-keyboard.js';
test('M7-38: arrow keys wrap and Home/End select predictable buttons',()=>{
 assert.equal(keyboardTabDestination({key:'ArrowRight',index:3,count:4}),0);
 assert.equal(keyboardTabDestination({key:'ArrowDown',index:0,count:4}),1);
 assert.equal(keyboardTabDestination({key:'ArrowLeft',index:0,count:4}),3);
 assert.equal(keyboardTabDestination({key:'ArrowUp',index:2,count:4}),1);
 assert.equal(keyboardTabDestination({key:'Home',index:3,count:4}),0);
 assert.equal(keyboardTabDestination({key:'End',index:0,count:4}),3);
 assert.equal(keyboardTabDestination({key:'Enter',index:2,count:4}),null);
 assert.equal(keyboardTabDestination({key:'Tab',index:2,count:4}),null);
});
test('M7-38: impossible indices never control another section or corrupt session',()=>{
 for(const state of [{key:'End',index:0,count:0},
  {key:'ArrowRight',index:-1,count:4},
  {key:'Home',index:5,count:4},
  {key:'ArrowLeft',index:0.5,count:4},
  {key:'End',index:0,count:2.8}
 ])assert.throws(()=>keyboardTabDestination(state),/Navegación accesible/);
});
