export const RELEASE=Object.freeze({version:'11.31',assetRevision:140});
export function compareRelease(manifest,expected=RELEASE){
 if(!manifest||typeof manifest!=='object'||!/^[0-9]+\.[0-9]+$/.test(manifest.version)||!Number.isInteger(manifest.assetRevision))return 'invalid';
 if(manifest.version===expected.version&&manifest.assetRevision===expected.assetRevision)return 'current';
 if(manifest.assetRevision>expected.assetRevision)return 'newer';
 return 'older-server';
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
  if(checking)return;checking=true;button.disabled=true;info.textContent='Consultando la versión publicada…';
  try{
   const {status,manifest}=await checkPublishedRelease({baseUrl});
   if(status==='current'){
    info.textContent='✓ v'+RELEASE.version+' verificada en servidor';
    info.className='release-status current';
    link.href='./?release='+encodeURIComponent(RELEASE.version+'-r'+RELEASE.assetRevision);
    link.textContent='Abrir versión actual';
   }else if(status==='newer'){
    info.className='release-status update';
    info.textContent='Hay una versión nueva: v'+manifest.version+'. Abre la actualización.';
    link.href='./?release='+encodeURIComponent(manifest.version+'-r'+manifest.assetRevision)+'&refresh='+Date.now();
    link.textContent='Actualizar ahora →';
   }else if(status==='older-server'){
    info.className='release-status update';
    info.textContent='El servidor o su caché sigue mostrando v'+manifest.version+'; esta pantalla es v'+RELEASE.version+'.';
    link.href='./?release='+encodeURIComponent(RELEASE.version+'-r'+RELEASE.assetRevision)+'&refresh='+Date.now();
    link.textContent='Volver a comprobar →';
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
