import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/** Static checks run before Chromium; CSS is source of truth for game tokens. */
const css=readFileSync(new URL('../juego/styles.css',import.meta.url),'utf8');
const root=css.slice(css.indexOf(':root{'),css.indexOf('}',css.indexOf(':root{')));
const value=name=>{
 const hit=root.match(new RegExp(name.replace(/[-]/g,'\\-')+':(#[0-9a-fA-F]{6})'));
 assert.ok(hit,'missing game color token '+name);
 return hit[1];
};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const relativeLight=hex=>{
 const channels=rgb(hex).map(c=>{
  const v=c/255;
  return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
 });
 return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
};
const contrast=(left,right)=>{
 const a=relativeLight(left),b=relativeLight(right);
 return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
};

test('I2-36: dark theme contrast and orange-on-dark CTA meet WCAG normal text',()=>{
 assert.equal(value('--primary'),'#f97316');
 assert.equal(value('--panel'),'#172438');
 assert.equal(value('--detail-bg'),'#142236');
 assert.ok(contrast(value('--text'),value('--panel'))>=4.5);
 assert.ok(contrast(value('--detail-label'),value('--choice-selected-bg'))>=4.5);
 assert.ok(contrast(value('--action-label'),value('--primary'))>=4.5);
});

test('I2-36: incident selectors cannot silently fall back to light UI colors',()=>{
 const start=css.indexOf('/* I2-35.5c · Sorpresa');
 assert.ok(start>0);
 const styles=css.slice(start);
 for(const stale of ['var(--surface','var(--line','var(--muted-surface',
  '#fff','#f8fafc','#e2e8f0','#2563eb','#b45309']){
  assert.ok(!styles.includes(stale),'unexpected light/off-brand token: '+stale);
 }
 for(const sel of ['.i2-operational-drill-card','.i2-operational-drill-button',
  '.i2-incident-outcome','.i2-incident-event','.i2-incident-choice',
  '.i2-incident-confirmed','.i2-incident-first-commitment',
  '.i2-two-decision-summary','.i2-daily-incidents']){
  assert.ok(styles.includes(sel),'missing themed game surface '+sel);
 }
 assert.match(styles,/border-inline-start:4px solid var\(--primary\)/);
 assert.match(styles,/@media\(forced-colors:active\)/);
});
