import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Unlike model-only imports, the app renderer contains large nested blocks.
// Parse it in the regression workflow so duplicate lexical declarations or
// malformed handlers are rejected BEFORE the expensive Chromium E2E suite.
test('M4-19: browser app entrypoint remains syntactically valid JavaScript',()=>{
 const path=fileURLToPath(new URL('../src/app.js',import.meta.url));
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path],{
  encoding:'utf8',timeout:15000
 }));
});
