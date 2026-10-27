import {I2_AREAS} from './i2-product-contract.js';
import {newI2GameState,normalizeI2GameState} from './i2-game-state.js';

/**
 * I2-09 · One state transition per footer action, with no physical replay.
 * A revealed surprise cannot be unrevealed. After confirmation, original
 * planning decisions are view-only; the original purchase plan stays sealed.
 *
 * All navigation returns a fresh, validated state. No DOM or localStorage.
 */
export function navigateI2GameState(value,action){
 const previous=normalizeI2GameState(value);
 if(!previous)throw new Error('I2-09: estado de navegación inválido');
 if(typeof action!=='string')throw new Error('I2-09: acción inválida');
 const next={...previous,choices:{...previous.choices},confirmedAreas:[...previous.confirmedAreas]};
 const change=(phase,index=next.index)=>{next.phase=phase;next.index=index;};
 switch(action){
  case 'start':
   if(next.phase!=='intro')break;
   // Resume at the earliest unconfirmed area, never erase the earlier plan.
   change('area',Math.min(next.confirmedAreas.length,I2_AREAS.length-1));
   return normalizeI2GameState(next);
  case 'forward':
   if(next.phase==='area'){
    const area=I2_AREAS[next.index];
    if(!next.confirmedAreas.includes(area.id)){
     if(next.confirmedAreas.length!==next.index)
      throw new Error('I2-09: no puedes confirmar fuera de secuencia');
     next.confirmedAreas.push(area.id);
    }
    if(next.index===I2_AREAS.length-1)change('reveal',7);
    else change('area',next.index+1);
    return normalizeI2GameState(next);
   }
   break;
  case 'back':
   if(next.phase==='area'){
    if(next.index>0)change('area',next.index-1);
    else change('intro',0);
    return normalizeI2GameState(next);
   }
   if(next.phase==='reveal'&&!next.reveal){
    change('area',I2_AREAS.length-1);
    return normalizeI2GameState(next);
   }
   if(next.phase==='recover'&&next.reveal){
    change('review',7);
    return normalizeI2GameState(next);
   }
   break;
  case 'reveal':
   if(next.phase==='reveal'&&!next.reveal
    &&next.confirmedAreas.length===I2_AREAS.length){
    next.reveal=true;
    change('recover',7);
    return normalizeI2GameState(next);
   }
   break;
  case 'return-to-recovery':
   if(next.phase==='review'&&next.reveal){
    change('recover',7);
    return normalizeI2GameState(next);
   }
   break;
  case 'revise-recovery':
   if(next.phase==='result'&&next.reveal){
    change('recover',7);
    return normalizeI2GameState(next);
   }
   break;
  case 'finish':
   if(next.phase==='recover'&&next.reveal){
    change('result',7);
    return normalizeI2GameState(next);
   }
   break;
  case 'restart':
   // Reintento en condiciones idénticas, sin filtrar la sorpresa de antemano.
   return newI2GameState({seed:previous.seed,advanced:previous.advanced});
  default:
   break;
 }
 throw new Error('I2-09: transición no permitida: '+next.phase+'/'+action);
}

export function i2FooterLabels(value){
 const state=normalizeI2GameState(value);
 if(!state)throw new Error('I2-09: estado inválido');
 switch(state.phase){
  case 'intro':return Object.freeze({primary:state.confirmedAreas.length?'Continuar mi plan →':'Comenzar misión →',secondary:null,action:'start',back:null});
  case 'area':{
   const confirmed=state.confirmedAreas.includes(I2_AREAS[state.index].id);
   return Object.freeze({
    primary:state.index===7?'Cerrar planificación →':
     confirmed?'Siguiente área →':'Confirmar y siguiente →',
    secondary:'← Atrás',action:'forward',back:'back'
   });
  }
  case 'reveal':return Object.freeze({
   primary:'Revelar demanda →',secondary:'← Revisar Transporte',action:'reveal',back:'back'
  });
  case 'recover':return Object.freeze({
   primary:'Confirmar intervención →',secondary:'← Revisar plan',
   action:'finish',back:'back'
  });
  case 'review':return Object.freeze({
   primary:'Volver a recuperación →',secondary:null,
   action:'return-to-recovery',back:null
  });
  case 'result':return Object.freeze({
   primary:'Jugar de nuevo ↻',
   secondary:state.recoveryConfirmation?'← Revisar intervención':null,
   action:'restart',back:state.recoveryConfirmation?'revise-recovery':null
  });
  default:throw new Error('I2-09: pantalla desconocida');
 }
}
