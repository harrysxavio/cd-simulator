/**
 * I2-10 · Accessible, reusable short-form modal assistance.
 * A native <dialog> provides top-layer modal behavior, Escape and focus trap.
 * No game state, calculation, storage or event simulation is modified.
 */
export function openI2HelpDialog({title,paragraphs},source){
 if(typeof title!=='string'||!title.trim()
  ||!Array.isArray(paragraphs)||paragraphs.length<1
  ||paragraphs.length>5||paragraphs.some(p=>typeof p!=='string'||p.length>600)
  ||!(source instanceof HTMLElement)){
  throw new Error('I2-10: ayuda inválida');
 }
 const dialog=document.createElement('dialog');
 dialog.className='i2-help-dialog';
 dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby','i2-help-title');
 dialog.setAttribute('aria-describedby','i2-help-description');
 const heading=document.createElement('h2');
 heading.id='i2-help-title';
 heading.textContent=title;
 const close=document.createElement('button');
 close.type='button';
 close.className='i2-help-close';
 close.textContent='×';
 close.setAttribute('aria-label','Cerrar explicación y volver a la decisión');
 const main=document.createElement('div');
 main.className='i2-help-content';
 main.id='i2-help-description';
 for(const content of paragraphs){
  const p=document.createElement('p');p.textContent=content;main.append(p);
 }
 const top=document.createElement('div');
 top.className='i2-help-head';top.append(heading,close);
 dialog.append(top,main);
 let closed=false;
 const cleanup=()=>{
  if(closed)return;closed=true;
  dialog.remove();
  if(source.isConnected)source.focus({preventScroll:true});
 };
 close.addEventListener('click',()=>dialog.close());
// A click on the scrim outside the dialog rectangle closes the help.
// Interacting with its content, text or scroll must not dismiss it.
dialog.addEventListener('click',event=>{
 if(event.target!==dialog)return;
 const box=dialog.getBoundingClientRect();
 const outside=event.clientX<box.left||event.clientX>box.right
  ||event.clientY<box.top||event.clientY>box.bottom;
 if(outside)dialog.close();
});
 // There is deliberately just one focusable control in this concise sheet.
 // Some Chromium builds move focus to <body> on Tab even for a top-layer
 // <dialog> with only one tabbable node: keep focus within the dialog.
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Tab'){
   event.preventDefault();
   close.focus({preventScroll:true});
  }
 });
 dialog.addEventListener('close',cleanup,{once:true});
 // The native cancel event handles Escape and closes the top-layer dialog.
 document.body.append(dialog);
 try{dialog.showModal();close.focus({preventScroll:true})}
 catch(e){dialog.remove();throw e}
 return dialog;
}
