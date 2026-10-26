/* Safari's visual viewport follows the keyboard and browser bars without user-agent detection. */
(()=>{
  const root=document.documentElement,modal=document.getElementById('registration-modal');let frame=0;
  function updateViewport(){
    cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const viewport=window.visualViewport;
      const height=Math.round(viewport?.height||window.innerHeight),top=Math.round(viewport?.offsetTop||0);
      root.style.setProperty('--visual-height',height+'px');root.style.setProperty('--visual-top',top+'px');
      const open=modal.classList.contains('open');root.classList.toggle('registration-open',open);
      if(!open&&(!viewport||Math.abs(viewport.scale-1)<.01))root.style.setProperty('--app-height',height+'px');
    });
  }
  window.addEventListener('resize',updateViewport);window.addEventListener('pageshow',updateViewport);
  window.visualViewport?.addEventListener('resize',updateViewport);window.visualViewport?.addEventListener('scroll',updateViewport);
  new MutationObserver(updateViewport).observe(modal,{attributes:true,attributeFilter:['class']});
  document.getElementById('player-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('player-email').focus();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateViewport();syncPending();if(screens.board.classList.contains('active'))populateBoard();}});
  let markerFrame=0;
  function keepMarkersRegistered(){cancelAnimationFrame(markerFrame);markerFrame=requestAnimationFrame(()=>{
    if(!state.current||!screens.game.classList.contains('active'))return;
    setSvgCircle($('origin-dot'),state.current.base.lat,state.current.base.lon,mapSvg);
    if(state.guess)setSvgCircle($('guess-dot'),state.guess.lat,state.guess.lon,mapSvg);
    if($('actual-dot').style.display!=='none')setSvgCircle($('actual-dot'),state.current.d.lat,state.current.d.lon,mapSvg);
  });}
  if(window.ResizeObserver)new ResizeObserver(keepMarkersRegistered).observe(document.getElementById('map-canvas'));
  updateViewport();
})();
