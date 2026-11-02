import {I2_AREAS} from '../src/i2-product-contract.js';

/**
 * I2-36.16 · Centro de decisiones por las ocho áreas.
 * Navegación editorial: solo tres palancas tienen impacto físico ya modelado;
 * jamás inventa operaciones para las cinco áreas restantes.
 */
const CONFIG=Object.freeze({
 commercial:{icon:'📈',summary:'Pronóstico ya comprometido; no puede corregirse con información futura.'},
 planning:{icon:'🧭',summary:'La cobertura inicial ya definió compras; no se reescriben sus órdenes.'},
 purchasing:{icon:'🛒',summary:'Compra urgente adicional, con día de llegada y cobertura.',target:'multiBuy'},
 receiving:{icon:'🏗️',summary:'Turnos extra solo disponibles cuando el incidente de muelle lo habilita.'},
 quality:{icon:'🔎',summary:'Línea alternativa solo en el incidente específico de Calidad.'},
 inventory:{icon:'📦',summary:'Trasladar reserva existente sin fabricar stock.',target:'multiReserve'},
 picking:{icon:'👷',summary:'Refuerzo nominal de preparación (+80 cupos/jornada).',target:'multiBoost'},
 transport:{icon:'🚚',summary:'La capacidad de expedición se definió inicialmente; refuerzo posterior aún no modelado.'}
});
export const I2_RECOVERY_AREA_IDS=Object.freeze(I2_AREAS.map(a=>a.id));

export function renderI2RecoveryAreaBoard(state,{onNavigate=()=>{},onExplain=()=>{}}={}){
 if(!state?.reveal||state.phase!=='recover'||state.eventSeed)
  throw new Error('I2-36.16: tablero solo después de la demanda real, sin incidente');
 const create=(tag,cls='',text='')=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  e.textContent=text;
  return e;
 };
 const section=create('section','i2-command-deck');
 const intro=create('div','i2-command-deck-head');
 intro.append(create('strong','','TU CENTRO DE MANDO · 8 ÁREAS'),
  create('p','',
   'Explora las ocho etapas; abre las tres acciones que este motor realmente permite combinar. Las otras políticas quedaron comprometidas antes de conocer la demanda.'));
 const grid=create('div','i2-command-deck-grid');
 grid.setAttribute('role','group');
 grid.setAttribute('aria-label','Ocho áreas del centro de distribución');
 for(const area of I2_AREAS){
  const cfg=CONFIG[area.id];
  const isReserve=area.id==='inventory';
  const enabled=Boolean(cfg.target)&&(!isReserve||(state.advanced.reservePercent??0)>0);
  const card=create('button','i2-command-area-card');
  card.type='button';card.dataset.area=area.id;
  card.dataset.available=String(enabled);
  card.setAttribute('aria-label',area.title+'. '+cfg.summary+'. '+
   (enabled?'Ir a configurar acción':'Consultar por qué no hay otra acción'));
  const icon=create('span','i2-command-area-icon',cfg.icon);
  icon.setAttribute('aria-hidden','true');
  const words=create('span','i2-command-area-words');
  words.append(create('strong','',area.title),
   create('span','i2-command-area-status',
    enabled?'Acción modelada · configurar':
     isReserve?'Sin reserva física disponible':'Política fija / sin nueva orden'));
  card.append(icon,words);
  card.addEventListener('click',()=>{
   if(enabled)onNavigate(area.id,cfg.target,card);
   else onExplain(area,cfg.summary,card);
  });
  grid.append(card);
 }
 section.append(intro,grid,
  create('p','i2-command-deck-note',
   'Solo Compras, Inventario (si separaste reserva) y Picking admiten acciones combinables aquí. Sin acción disponible no significa que el área no importe. Los incidentes abren otras respuestas en su jornada.'));
 return section;
}
