// Inline <head> script (runs before the app bundle). After a new deploy, a browser can still hold the
// previous page (host HTTP cache or the service worker), whose hashed files no longer exist, so the app
// never starts and the screen stays blank. When an app file fails to load, clear the offline caches,
// drop the service worker and reload the page fresh — once per tab session, so it can never loop.
export const BOOT_RECOVERY_SCRIPT = `(function(){
var K="cubix-recovered";
function recover(){
  try{ if(sessionStorage.getItem(K)) return; sessionStorage.setItem(K,"1"); }catch(e){ return; }
  var jobs=[];
  try{ if(window.caches) jobs.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); })); }catch(e){}
  try{ if(navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.unregister(); })); })); }catch(e){}
  Promise.all(jobs).catch(function(){}).then(function(){
    var u=new URL(location.href); u.searchParams.set("fresh", String(Date.now())); location.replace(u.href);
  });
}
window.__cubixRecover=recover;
window.__cubixBooted=function(){
  try{ sessionStorage.removeItem(K); }catch(e){}
  try{ var u=new URL(location.href); if(u.searchParams.has("fresh")){ u.searchParams.delete("fresh"); history.replaceState(history.state,"",u.pathname+u.search+u.hash); } }catch(e){}
};
window.addEventListener("error",function(e){
  var t=e.target; if(!t||t===window) return;
  var n=t.tagName, src=t.src||t.href||"";
  if((n==="SCRIPT"||(n==="LINK"&&/stylesheet|modulepreload/.test(t.rel)))&&src.indexOf("/assets/")>-1) recover();
},true);
window.addEventListener("vite:preloadError",function(e){ if(e.preventDefault) e.preventDefault(); recover(); });
})();`;

/** Called by the app when a lazily loaded part (3D engine, solver) fails to load. */
export function recoverFromMissingFiles() {
  const w = window as unknown as { __cubixRecover?: () => void };
  w.__cubixRecover?.();
}

/** Called once the app is running, so a later broken deploy can be recovered again. */
export function markBooted() {
  const w = window as unknown as { __cubixBooted?: () => void };
  w.__cubixBooted?.();
}
