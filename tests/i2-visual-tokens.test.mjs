import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../juego/styles.css',import.meta.url),'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m=>[m[1],m[2]]));
function luminance(color){
 const c=color.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
 return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
}
function ratio(a,b){
 const x=luminance(tokens[a]),y=luminance(tokens[b]);
 return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
test('I2-07: semantic dark/orange palette maintains WCAG AA 4.5:1 for normal text',()=>{
 for(const [label,foreground,background] of [
  ['default body','text','bg'],
  ['muted copy','muted','bg'],
  ['body on panel','text','panel'],
  ['CTA label','action-label','primary'],
  ['selected description','choice-selected-label','choice-selected-bg'],
  ['detail toggle','detail-label','detail-bg'],
  ['danger status','danger-text','danger-bg'],
  ['warning hint','warning-text','bg'],
  ['success hint','success-text','bg']
 ]){
  assert.ok(tokens[foreground]&&tokens[background],label+' tokens missing');
  assert.ok(ratio(foreground,background)>=4.5,label+': contrast='+ratio(foreground,background).toFixed(2));
 }
 assert.ok(ratio('focus-ring','bg')>=3,'Focus ring should contrast with dark app background');
});
test('I2-07: focus, selected, disabled and operating-system high contrast have independent cues',()=>{
 assert.match(css,/\.game-choice\.chosen strong::before\{content:'✓ '/);
 assert.match(css,/\.game-choice\.chosen\{background:var\(--choice-selected-bg\);border:2px solid var\(--primary\)\}/);
 assert.match(css,/\.game-choice:disabled\{cursor:not-allowed/);
 assert.match(css,/\.learn-more summary:focus-visible/);
 assert.match(css,/\.action-primary:focus-visible/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(css,/border:3px solid Highlight/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
