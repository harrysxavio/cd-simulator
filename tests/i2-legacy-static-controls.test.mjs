import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const get=p=>readFileSync(new URL(p,root),'utf8');
const html=get('index.html'),app=get('src/app.js'),release=get('src/release-status.js');
const buttons=[...html.matchAll(/<button\b([^>]*)>/g)]
 .map(m=>m[1].match(/\bid="([^"]+)"/)?.[1]||null);

// Explicitly account for every static entrypoint. This verifies wiring in
// source, NOT user comprehension, visibility in every state or that it works
// under TalkBack on a physical Android device.
const expected=[
 'checkRelease','goToOperations','resetAnytime','setupTab',
 'operationsTab','preliminaryTab','recoveryTab','dashboardTab',
 'firstGuideToggle','resetScenario','beginExercise','reset','openReport',
 'prev','next','revealDemand','startRecovery','directorPilot',
 'skipRecovery','resultTabOverview','resultTabAreas','resultTabInventory',
 'resultTabEconomics','resultTabImprovement','overviewToAreas',
 'primaryToAreas','areasToInventory','economicsToImprovement',
 'inventoryToEconomics','improvementToRecovery','restartFinal','export'
];
const resultViews=['resultTabOverview','resultTabAreas','resultTabInventory',
 'resultTabEconomics','resultTabImprovement'];
const genericLinks=['overviewToAreas','areasToInventory',
 'economicsToImprovement','inventoryToEconomics'];

test('I2 legacy audit: every static button has a stable unique ID and is inventoried',()=>{
 assert.equal(buttons.length,expected.length,'New static controls require audit inventory');
 assert.ok(buttons.every(Boolean),'A static control has no ID');
 assert.equal(new Set(buttons).size,buttons.length,'Duplicate IDs can misroute actions');
 assert.deepEqual([...buttons].sort(),[...expected].sort());
});

test('I2 legacy audit: every inventoried static button has an event binding in source',()=>{
 const misses=[];
 for(const id of expected){
  if(id==='checkRelease'){
   if(!release.includes("getElementById('checkRelease')")||!release.includes("button.addEventListener('click',run)"))misses.push(id);
   continue;
  }
  if(resultViews.includes(id)){
   if(!app.includes("for(const button of $('resultTabs').children)button.onclick="))misses.push(id);
   continue;
  }
  if(genericLinks.includes(id)){
   if(!app.includes("'"+id+"'"))misses.push(id);
   if(!app.includes("$(id).onclick=()=>showResultView(view,true)"))misses.push(id+' handler');
   continue;
  }
  if(!app.includes("$('"+id+"').onclick="))misses.push(id);
 }
 assert.deepEqual(misses,[],'Inert or unregistered static buttons');
});
