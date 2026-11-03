type Kind='library'|'book'|'chapter';
/** Fast, content-free visual feedback while secure server components load. */
export default function RouteLoading({kind}:{kind:Kind}){
 const title=kind==='library'?'Bibliothèque':kind==='chapter'?'Ouverture du chapitre':'Ouverture de l’ouvrage';
 return <div className="route-loading" role="status" aria-live="polite" aria-label={title+' en cours de chargement'}>
   <aside className="route-loading-nav" aria-hidden="true">
     <div className="route-loading-mark shimmer"/>
     <div className="route-loading-line shimmer"/>
     <div className="route-loading-line short shimmer"/>
     <div className="route-loading-line shimmer"/>
   </aside>
   <main className="route-loading-main">
     <div className="route-loading-top" aria-hidden="true"><div className="route-loading-line shimmer"/></div>
     <div className="route-loading-body">
       <span className="eyebrow">BOOKSTUDIO AI</span>
       <h1>{title}…</h1>
       <p>Chargement sécurisé de votre espace.</p>
       <div className="route-loading-row" aria-hidden="true">
         <div className="route-loading-block shimmer"/>
         <div className="route-loading-block shimmer"/>
         <div className="route-loading-block shimmer"/>
       </div>
     </div>
   </main>
 </div>;
}
