/**
 * M7-38 · Keyboard tablists on real native buttons.
 *
 * A view/tab selection is presentation only. This helper never mutates
 * a campaign, invokes a warehouse model, or reads browser globals.
 */
const KEYS=Object.freeze({
 ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1
});
export function keyboardTabDestination({key,index,count}={}){
 if(!Number.isSafeInteger(index)||!Number.isSafeInteger(count)
  ||count<1||index<0||index>=count)
  throw new Error('Navegación accesible: índice de pestaña inválido');
 if(key==='Home')return 0;
 if(key==='End')return count-1;
 const step=KEYS[key];
 return step===undefined?null:(index+step+count)%count;
}
