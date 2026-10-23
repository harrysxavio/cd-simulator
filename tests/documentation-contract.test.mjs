// M8-41: documentación vigente como contrato verificable de publicación.
// Estas pruebas detectan enlaces locales rotos y documentación que mezcle
// horizontes/unidades o se desvincule de la versión funcional publicada.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const file=p=>readFileSync(resolve(root,p),'utf8');
const manifest=JSON.parse(file('release.json'));
const docs=[
 'docs/GUIA-USUARIO.md',
 'docs/ESCENARIOS-DE-APRENDIZAJE.md',
 'docs/ARQUITECTURA-Y-DATOS.md',
 'docs/GLOSARIO-Y-LIMITES.md',
 'docs/SOPORTE-Y-VERIFICACION.md'
];

test('M8-41: README points to all current docs, with matching release',()=>{
 const readme=file('README.md');
 assert.ok(readme.includes('## Documentación vigente · M8-41'));
 assert.ok(readme.includes('v'+manifest.version+' r'+manifest.assetRevision));
 for(const path of docs){
  assert.ok(existsSync(resolve(root,path)),'Documento inexistente '+path);
  assert.ok(readme.includes(']('+path+')'),'README omite '+path);
  const content=file(path);
  assert.ok(content.startsWith('# '),'Falta título '+path);
  assert.ok(content.includes('v'+manifest.version+' r'+manifest.assetRevision),
   'Documento con release desactualizado: '+path);
  assert.ok(content.length>2000,'Documento demasiado incompleto: '+path);
 }
});

test('M8-41: relative Markdown links resolve to real repository files',()=>{
 for(const path of docs){
  const markdown=file(path);
  // Ignore absolute HTTP links and hash-only anchors; verify file destinations.
  const links=[...markdown.matchAll(/\\[[^\\]]+\\]\\(([^)]+)\\)/g)].map(m=>m[1]);
  assert.ok(links.length>3,'Sin rutas de navegación suficientes: '+path);
  for(const href of links){
   if(/^(https?:|mailto:|#)/i.test(href))continue;
   const local=decodeURIComponent(href.split('#',1)[0]);
   assert.ok(local&&!local.includes('?'),'Enlace local ambiguo '+href);
   assert.ok(existsSync(resolve(root,dirname(path),local)),
    'Enlace roto en '+path+' -> '+href);
  }
 }
});

test('M8-41: technical distinctions, manual blocker and business exercises remain explicit',()=>{
 const guide=file('docs/GUIA-USUARIO.md');
 const cases=file('docs/ESCENARIOS-DE-APRENDIZAJE.md');
 const tech=file('docs/ARQUITECTURA-Y-DATOS.md');
 const glossary=file('docs/GLOSARIO-Y-LIMITES.md');
 const support=file('docs/SOPORTE-Y-VERIFICACION.md');

 // Protect essential educational meaning rather than exact marketing copy.
 assert.match(guide,/12 días/);
 assert.match(guide,/modelo agregado/i);
 assert.match(guide,/localStorage|almacenamiento local/i);
 assert.match(guide,/Confirmar decisión en simulación/);
 assert.match(cases,/Escenario 1/);
 assert.match(cases,/Escenario 6/);
 assert.match(cases,/día 13/i);
 assert.match(tech,/mermaid/);
 assert.match(tech,/campaign-contract\\.js/);
 assert.match(tech,/src\\/campaign\\.js/);
 assert.match(tech,/src\\/session-state\\.js/);
 assert.match(glossary,/no tarifado/i);
 assert.match(glossary,/pedido completo/i);
 assert.match(glossary,/despacho|expedición/i);
 assert.match(support,/M8-42/);
 for(const text of [guide,cases,tech,glossary,support]){
  assert.match(text,/TalkBack/,'No omitir gate M7-38');
 }
});
