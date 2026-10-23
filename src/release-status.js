export const RELEASE=Object.freeze({version:'11.68',assetRevision:177});
// Compare version numbers numerically, not lexicographically or by asset
// revision alone. Asset revisions are comparable only within one version.
export function compareRelease(manifest,expected=RELEASE){
 const valid=value=>value&&typeof value==='object'&&!Array.isArray(value)
  &&typeof value.version==='string'&&/^[0-9]+\.[0-9]+$/.test(value.version)
  &&Number.isSafeInteger(value.assetRevision)&&value.assetRevision>=0;
 if(!valid(manifest)||!valid(expected))return 'invalid';
 const actual=manifest.version.split('.').map(Number);
 const previous=expected.version.split('.').map(Number);
 if(!actual.every(Number.isSafeInteger)||!previous.every(Number.isSafeInteger))return 'invalid';
 for(let i=0;i<2;i++){
  if(actual[i]>previous[i])return 'newer';
  if(actual[i]<previous[i])return 'older-server';
 }
 if(manifest.assetRevision===expected.assetRevision)return 'current';
 return manifest.assetRevision>expected.assetRevision?'newer':'older-server';
}
export async function checkPublishedRelease({fetcher=fetch,baseUrl,expected=RELEASE}={}){
 const url=new URL('./release.json',baseUrl);
 url.searchParams.set('nocache',String(Date.now()));
 const response=await fetcher(url.toString(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
 if(!response.ok)throw new Error('No se pudo consultar la versión publicada (HTTP '+response.status+')');
 const manifest=await response.json();
 return {status:compareRelease(manifest,expected),manifest};
}
export function wireReleaseStatus(doc=document,baseUrl=window.location.href){
 const info=doc.getElementById('releaseStatus'),button=doc.getElementById('checkRelease'),link=doc.getElementById('forceCurrentRelease');
 if(!info||!button||!link)return;
 let checking=false;
 const run=async()=>{
  if(checking)return;checking=true;button.disabled=true;link.hidden=true;info.textContent='Consultando la versión publicada…';
  try{
   const {status,manifest}=await checkPublishedRelease({baseUrl});
   if(status==='current'){
    info.textContent='✓ v'+RELEASE.version+' verificada en servidor';
    info.className='release-status current';
    link.href='./?release='+encodeURIComponent(RELEASE.version+'-r'+RELEASE.assetRevision);
    link.textContent='Abrir versión actual';link.hidden=false;
   }else if(status==='newer'){
    info.className='release-status update';
    info.textContent='Hay una versión nueva: v'+manifest.version+'. Abre la actualización.';
    link.href='./?release='+encodeURIComponent(manifest.version+'-r'+manifest.assetRevision)+'&refresh='+Date.now();
    link.textContent='Actualizar ahora →';link.hidden=false;
   }else if(status==='older-server'){
    info.className='release-status update';
    info.textContent='El servidor o su caché sigue mostrando v'+manifest.version+'; esta pantalla es v'+RELEASE.version+'.';
    link.href='./?release='+encodeURIComponent(RELEASE.version+'-r'+RELEASE.assetRevision)+'&refresh='+Date.now();
    link.textContent='Volver a comprobar →';link.hidden=false;
   }else{
    info.className='release-status update';info.textContent='La información de versión del servidor no es válida.';
   }
  }catch{
   info.className='release-status';info.textContent='No se pudo consultar la versión. La simulación sigue funcionando.';
  }finally{checking=false;button.disabled=false}
 };
 button.addEventListener('click',run);
 run();
}
if(typeof document!=='undefined'&&typeof window!=='undefined')wireReleaseStatus(document,window.location.href);
