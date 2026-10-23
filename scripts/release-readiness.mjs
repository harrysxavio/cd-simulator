import {readFileSync} from 'node:fs';
import {assessReleaseReadiness} from './release-readiness-core.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const report=assessReleaseReadiness({
 manifest:JSON.parse(read('release.json')),
 html:read('index.html'),
 app:read('src/app.js'),
 verifier:read('src/release-status.js'),
 checklist:read('docs/M7-38-ANDROID-A11Y-CHECKLIST.md'),
 acceptance:JSON.parse(read('docs/RELEASE-ACCEPTANCE.json'))
});
console.log(JSON.stringify(report,null,2));
if(report.technicalContract!=='passed')process.exitCode=1;
// A blocked manual gate is a correct, honest CI outcome. Never set
// 'stable' or create a Git tag based only on this script.
