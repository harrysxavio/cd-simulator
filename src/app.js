import {NODES,DEFAULTS,START,PRODUCTS,TOTAL_ORDERS,evaluate,impacts,upstreamCause,PARAMETERS,numericValue,diagnostic} from './engine.js';
const $=id=>document.getElementById(id),STORE='supply-lab-v3-state';
let decisions={...START,values:{}},active=0;
const fmt=n=>Math.round(n).toLocaleString('es-CL');
const saved=()=>{try{localStorage.setItem(STORE,JSON.stringify({decisions,active}))}catch{}};
function load(){try{const raw=JSON.parse(localStorage.getItem(STORE)||'null');if(!raw||!raw.decisions)return;const clean={};for(const n of NODES)if(n.choices.some(c=>c.id===raw.decisions[n.id]))clean[n.id]=raw.decisions[n.id];decisions={...clean,values:{}};for(const n of NODES){const v=raw.decisions.values?.[n.id],p=PARAMETERS[n.id];if(v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=p.min&&Number(v)<=p.max)decisions.values[n.id]=Number(v)}active=Math.max(0,Math.min(7,Number.isInteger(raw.active)?raw.active:0))}catch{}}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function add(parent,tag,cls,text){const e=el(tag,cls,text);parent.append(e);return e}
function status(n,i){if(decisions[n.id])return 'done';if(i===active)return 'current';return 'locked'}
function nav(i){active=i;saved();render();$('mission').scrollIntoView({behavior:'smooth',block:'start'})}
function showMap(r){
const root=$('roadmap');root.replaceChildren();
NODES.forEach((n,i)=>{const st=status(n,i);const btn=add(root,'button','node '+st);btn.type='button';btn.setAttribute('aria-label','Abrir área '+n.title);btn.setAttribute('aria-current',i===active?'step':'false');const icon=add(btn,'span','node-icon',n.icon);icon.setAttribute('aria-hidden','true');const content=add(btn,'span','node-content');add(content,'strong','',String(i+1).padStart(2,'0')+' · '+n.title);add(content,'small','',st==='done'?'Decisión registrada':st==='current'?'Misión actual':'Disponible para explorar');add(btn,'span','node-state',st==='done'?'✓':st==='current'?'●':'→');btn.addEventListener('click',()=>nav(i))});
const done=NODES.filter(n=>decisions[n.id]).length;$('progressText').textContent=done+' de 8 áreas decididas';$('progressFill').style.width=(done/8*100)+'%';
}
function mission(r){
const node=NODES[active],current=decisions[node.id]??DEFAULTS[node.id];
$('missionNumber').textContent='MISIÓN '+String(active+1).padStart(2,'0')+' / 08';
$('missionTitle').textContent=node.icon+' '+node.title;
$('missionDescription').textContent=node.desc;
$('missionKpi').textContent=node.kpi;
const choices=$('choices');choices.replaceChildren();
node.choices.forEach(c=>{const b=add(choices,'button','choice '+(current===c.id?'selected':''));b.type='button';const head=add(b,'strong','',c.label);add(b,'small','',c.note);b.setAttribute('aria-pressed',String(current===c.id));b.addEventListener('click',()=>{decisions[node.id]=c.id;decisions.values[node.id]=c[PARAMETERS[node.id].key];saved();render()})});
const p=PARAMETERS[node.id],control=add(choices,'div','numeric-control');
add(control,'label','',p.label+' ('+p.unit.trim()+')');
add(control,'p','muted',p.hint);
const field=add(control,'div','numeric-row');
const input=add(field,'input','numeric-input');input.type='number';input.min=p.min;input.max=p.max;input.step=p.step;input.value=numericValue(node.id,decisions);input.setAttribute('aria-label',p.label);
const range=add(field,'input','numeric-range');range.type='range';range.min=p.min;range.max=p.max;range.step=p.step;range.value=input.value;range.setAttribute('aria-label','Ajustar '+p.label);
const error=add(control,'div','input-error');error.setAttribute('role','status');
const change=v=>{const n=Number(v);if(v===''||!Number.isFinite(n)||n<p.min||n>p.max){error.textContent='Ingresa un valor entre '+p.min+' y '+p.max;return}decisions[node.id]=current;decisions.values[node.id]=n;saved();render()};
input.addEventListener('change',()=>change(input.value));range.addEventListener('change',()=>change(range.value));
const before=evaluate({...decisions,[node.id]:DEFAULTS[node.id],values:{...decisions.values,[node.id]:numericValue(node.id,{})}});
const after=r;
$('nodeResult').textContent='Valor configurado: '+numericValue(node.id,decisions)+p.unit+'. Resultado proyectado: '+fmt(after.result)+' pedidos completables de '+TOTAL_ORDERS+'. '+(after.result===before.result?'La capacidad final no cambia respecto a la alternativa estándar del área: puede haber otra restricción.':('Diferencia frente a la opción estándar: '+(after.result-before.result>0?'+':'')+fmt(after.result-before.result)+' pedidos.'));
$('prev').disabled=active===0;$('next').textContent=active===7?'Ver diagnóstico final':'Continuar a la siguiente área →';
}
function summary(r){
$('completed').textContent=fmt(r.result);$('pending').textContent=fmt(r.pending);$('fulfillment').textContent=(r.result/10).toFixed(1).replace('.',',')+'%';
const cause=upstreamCause(r);$('cause').textContent=cause.text;
const detail=$('sku');detail.replaceChildren();
for(const p of r.sku){const row=add(detail,'div','sku-row');add(row,'strong','',p.name);add(row,'span','','Demanda '+fmt(p.forecast)+' · Disponible '+fmt(p.usable));const bar=add(row,'div','sku-track');const fill=add(bar,'div','sku-fill');fill.style.width=Math.min(100,p.usable/(p.forecast||1)*100)+'%';}
const results=$('results');results.replaceChildren();for(const s of r.stage){const node=NODES.find(n=>n.id===s.id);const line=add(results,'div','stage-result');add(line,'span','',node.icon+' '+node.title);add(line,'strong','',fmt(s.value));add(line,'small','',s.label)}
const recommendations=impacts(decisions),box=$('actions');box.replaceChildren();
if(!recommendations.length)add(box,'p','muted','No hay una mejora individual positiva dentro de las alternativas actuales. Prueba combinaciones de decisiones o revisa si el lote ya está cubierto.');
recommendations.slice(0,4).forEach((x,i)=>{const item=add(box,'div','action');add(item,'span','action-index',String(i+1));const content=add(item,'div','');add(content,'strong','',x.node.title+' · '+x.parameter.label+' a '+x.value+x.parameter.unit);add(content,'small','','Potencial estimado: +'+fmt(x.delta)+' pedidos completables, manteniendo las otras decisiones.');const b=add(item,'button','mini','Aplicar');b.addEventListener('click',()=>{decisions[x.node.id]=decisions[x.node.id]??DEFAULTS[x.node.id];decisions.values[x.node.id]=x.value;saved();render()})});
$('riskCount').textContent=String(r.limiting.length);$('focus').textContent=r.limiting.map(id=>NODES.find(n=>n.id===id)?.title).join(' y ')||'Sin restricciones';
}
function render(){const r=evaluate(decisions);showMap(r);mission(r);summary(r);$('report').hidden=Object.keys(decisions).length<8}
$('prev').addEventListener('click',()=>nav(Math.max(0,active-1)));
$('next').addEventListener('click',()=>{if(!decisions[NODES[active].id])decisions[NODES[active].id]=DEFAULTS[NODES[active].id];saved();if(active<7)nav(active+1);else{$('report').hidden=false;render();$('report').scrollIntoView({behavior:'smooth',block:'start'})}});
$('reset').addEventListener('click',()=>{if(!confirm('¿Reiniciar todas las decisiones de esta campaña?'))return;decisions={...START,values:{}};active=0;saved();render()});
$('openReport').addEventListener('click',()=>{$('report').hidden=false;$('report').scrollIntoView({behavior:'smooth',block:'start'})});
$('export').addEventListener('click',()=>{const r=evaluate(decisions);const rows=[['Campo','Valor'],['Pedidos completables',r.result],['Pendientes',r.pending],['Foco',upstreamCause(r).text],...NODES.map(n=>[n.title,numericValue(n.id,decisions)+' '+PARAMETERS[n.id].unit])];const data='\ufeff'+rows.map(a=>a.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));const a=el('a');a.href=url;a.download='supply-chain-lab-campana.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)});
load();render();
