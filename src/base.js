window.deriveTheme = function(hex1, hex2, hex3){
    function hexToRgb(hex){
      hex = (hex||'').replace('#','').trim();
      if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
      const num = parseInt(hex,16);
      if(isNaN(num)) return {r:0,g:0,b:0};
      return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
    }
    function mix(c1,c2,t){ return { r:c1.r+(c2.r-c1.r)*t, g:c1.g+(c2.g-c1.g)*t, b:c1.b+(c2.b-c1.b)*t }; }
    function rgba(c,a){ return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`; }
    function toHex(r,g,b){ return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }

    const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    const c3Picked = hexToRgb(hex3);
    const black = {r:0,g:0,b:0}, white = {r:255,g:255,b:255};
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const c3 = systemDark ? mix(c3Picked, black, 0.82) : c3Picked;
    const isLight = !systemDark;
    const ink = isLight ? mix(c3, black, 0.82) : mix(c3, white, 0.9);
    const muted = isLight ? mix(c3, black, 0.5) : mix(c3, white, 0.55);
    const glassBase = isLight ? white : mix(c3, black, 0.4);

    const root = document.documentElement.style;
    root.setProperty('--rust', hex1);
    if(typeof window.setCursorColor === 'function') window.setCursorColor(hex1);
    root.setProperty('--moss', hex2);
    root.setProperty('--bg-base', toHex(c3.r, c3.g, c3.b));
    root.setProperty('--ink', toHex(ink.r, ink.g, ink.b));
    root.setProperty('--muted', toHex(muted.r, muted.g, muted.b));
    root.setProperty('--line', isLight ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.10)');
    root.setProperty('--glass', rgba(glassBase, isLight?0.38:0.55));
    root.setProperty('--glass-strong', rgba(glassBase, isLight?0.58:0.72));
    root.setProperty('--chip-bg', toHex(ink.r, ink.g, ink.b));
    root.setProperty('--chip-text', isLight ? '#F6EEDF' : '#16120E');
    root.setProperty('--scrim', isLight ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.5)');
    root.setProperty('--bg-radial-1', rgba(c1, 0.55));
    root.setProperty('--bg-radial-2', rgba(mix(c1,c2,0.5), 0.5));
    root.setProperty('--bg-radial-3', rgba(c2, 0.55));
    root.setProperty('--bg-radial-4', rgba(mix(c3Picked,c1,0.3), 0.4));
  };

  (function(){
    try{
      const cached = localStorage.getItem('julian_theme_colors');
      if(!cached) return;
      const t = JSON.parse(cached);
      if(t.color1 && t.color2 && t.color3) window.deriveTheme(t.color1, t.color2, t.color3);
    }catch(err){}
  })();
