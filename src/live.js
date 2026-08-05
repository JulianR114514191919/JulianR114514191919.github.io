import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
  import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAfyM4g54lnJh3mQhJ3zU50U75mB_04MHk",
    authDomain: "julian-site-c5dd3.firebaseapp.com",
    projectId: "julian-site-c5dd3",
    storageBucket: "julian-site-c5dd3.firebasestorage.app",
    messagingSenderId: "695308416375",
    appId: "1:695308416375:web:2b3be5f7403ab323085d72"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const shareQuery = new URLSearchParams(location.search);
  const shareKind = ['photo', 'album', 'ref'].find(k => shareQuery.get(k));
  const shareId = shareKind ? shareQuery.get(shareKind).trim() : '';
  const shareOn = !!(shareKind && shareId);
  let shareSettled = false;
  if(shareOn){
    document.body.classList.add('share-mode');
    document.getElementById('shareLayer').classList.add('on');
  }

  const monthLabelEl = document.getElementById('calMonthLabel');
  const gridEl = document.getElementById('calGrid');
  const dayLabelEl = document.getElementById('calDayLabel');
  const dayEventsEl = document.getElementById('calDayEvents');

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = fmt(today);
  let eventsByDate = {};
  let calLoaded = false;

  function fmt(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function isSameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

  function renderMonthLabel(){
    monthLabelEl.textContent = `${viewYear}年 ${viewMonth+1}月`;
  }

  function renderGrid(){
    renderMonthLabel();
    gridEl.innerHTML = '';
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for(let i=0; i<totalCells; i++){
      const dayNum = i - startOffset + 1;
      let cellDate, otherMonth = false;
      if(dayNum < 1){
        cellDate = new Date(viewYear, viewMonth-1, daysInPrevMonth + dayNum);
        otherMonth = true;
      } else if(dayNum > daysInMonth){
        cellDate = new Date(viewYear, viewMonth+1, dayNum - daysInMonth);
        otherMonth = true;
      } else {
        cellDate = new Date(viewYear, viewMonth, dayNum);
      }
      const dstr = fmt(cellDate);
      const cell = document.createElement('div');
      cell.className = 'cal-cell' + (otherMonth ? ' other' : '') + (isSameDate(cellDate, today) ? ' today' : '') + (dstr === selectedDate ? ' selected' : '');
      const hasEvent = !!eventsByDate[dstr];
      cell.innerHTML = `<div class="num">${cellDate.getDate()}</div>${hasEvent ? '<div class="cal-dot"></div>' : ''}`;
      cell.addEventListener('click', ()=>{
        selectedDate = dstr;
        if(otherMonth){
          viewYear = cellDate.getFullYear();
          viewMonth = cellDate.getMonth();
        }
        renderGrid();
        renderDayEvents();
      });
      gridEl.appendChild(cell);
    }
  }

  function renderDayEvents(){
    const d = new Date(selectedDate + 'T00:00:00');
    const isToday = isSameDate(d, today);
    dayLabelEl.textContent = isToday ? '今日' : `${d.getMonth()+1}月${d.getDate()}日`;
    const list = eventsByDate[selectedDate] || [];
    if(list.length === 0){
      dayEventsEl.innerHTML = '<div class="cal-empty">這天沒有安排行程</div>';
      return;
    }
    dayEventsEl.innerHTML = list.map(ev => `
      <div class="cal-item">
        <div class="cal-dot-lg"></div>
        <div class="ci-info">
          <div class="ci-title">${escapeHtml(ev.title||'')}</div>
          ${ev.description ? `<div class="ci-desc">${escapeHtml(ev.description)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function goMonth(delta){
    viewMonth += delta;
    if(viewMonth < 0){ viewMonth = 11; viewYear--; }
    if(viewMonth > 11){ viewMonth = 0; viewYear++; }
    renderGrid();
  }

  document.getElementById('calPrev').addEventListener('click', ()=> goMonth(-1));
  document.getElementById('calNext').addEventListener('click', ()=> goMonth(1));

  (function(){
    let sx = 0, dx = 0, on = false;
    gridEl.addEventListener('touchstart', e=>{ sx = e.touches[0].clientX; dx = 0; on = true; }, {passive:true});
    gridEl.addEventListener('touchmove', e=>{ if(on) dx = e.touches[0].clientX - sx; }, {passive:true});
    gridEl.addEventListener('touchend', ()=>{
      on = false;
      if(dx < -40) goMonth(1);
      else if(dx > 40) goMonth(-1);
    });
  })();

  function startCalendarListening(){
    if(calLoaded) return;
    calLoaded = true;
    try{
      const q = query(collection(db, 'calendar'), orderBy('date', 'asc'));
      onSnapshot(q, (snap)=>{
        eventsByDate = {};
        snap.forEach(docSnap=>{
          const ev = docSnap.data();
          if(!ev.date) return;
          if(!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
          eventsByDate[ev.date].push(ev);
        });
        renderGrid();
        renderDayEvents();
      }, ()=>{
        renderGrid();
        renderDayEvents();
      });
    }catch(err){
      renderGrid();
      renderDayEvents();
    }
  }

  renderGrid();
  dayEventsEl.innerHTML = '<div class="cal-empty">載入中…</div>';
  window.addEventListener('calendar:open', startCalendarListening);

  const masonryMain = document.getElementById('masonryMain');
  const masonryClone = document.getElementById('masonryClone');

  let galleryPhotos = [];
  let galleryAlbums = [];

  function effOrder(x){
    if(typeof x.order === 'number') return x.order;
    const t = x.uploadedAt && x.uploadedAt.toMillis ? x.uploadedAt.toMillis() : 0;
    return -t;
  }

  function pinHtml(p){
    return `
      <div class="pin${p.pano ? ' is-pano' : ''}" data-photo-id="${p.id}">
        ${p.pano || p.hdr ? `<div class="badges">${p.pano ? '<b>◎ 360</b>' : ''}${p.hdr ? '<b class="hdr">HDR</b>' : ''}</div>` : ''}
        <img src="${p.imageUrl}" alt="${escapeHtml(p.caption||'')}" decoding="async" loading="lazy">
        ${p.caption ? `<div class="cap">${escapeHtml(p.caption)}</div>` : ''}
      </div>`;
  }

  let photosByAlbum = new Map();
  let albumsByParent = new Map();
  function indexGallery(){
    photosByAlbum = new Map();
    albumsByParent = new Map();
    const push = (map, key, val)=>{
      if(!map.has(key)) map.set(key, []);
      map.get(key).push(val);
    };
    galleryPhotos.forEach(p=> push(photosByAlbum, p.albumId || null, p));
    galleryAlbums.forEach(a=> push(albumsByParent, a.parentAlbumId || null, a));
    photosByAlbum.forEach(list=> list.sort((a,b)=> effOrder(a)-effOrder(b)));
    albumsByParent.forEach(list=> list.sort((a,b)=> effOrder(a)-effOrder(b)));
  }
  const photosOf = (albumId)=> photosByAlbum.get(albumId || null) || [];
  const subAlbumsOf = (parentId)=> albumsByParent.get(parentId || null) || [];

  function albumCoverPhoto(al, depth){
    const picked = galleryPhotos.find(p=> p.id === al.coverPhotoId) || photosOf(al.id)[0];
    if(picked) return picked;
    if((depth || 0) >= 5) return null;
    for(const sub of subAlbumsOf(al.id)){
      const c = albumCoverPhoto(sub, (depth || 0) + 1);
      if(c) return c;
    }
    return null;
  }

  function albumPinHtml(al){
    const cover = albumCoverPhoto(al, 0);
    const photoCount = photosOf(al.id).length;
    const subCount = subAlbumsOf(al.id).length;
    const count = subCount ? `${photoCount}　📁${subCount}` : `${photoCount}`;
    return `
      <div class="pin album-pin" data-album-id="${al.id}">
        ${cover ? `<img src="${cover.imageUrl}" alt="${escapeHtml(al.name)}" decoding="async" loading="lazy">` : `<div class="album-cover-ph">📁</div>`}
        <div class="aname">${escapeHtml(al.name)}　${count}</div>
      </div>`;
  }

  function sharePanel(which){
    ['shareLoading', 'shareError', 'shareEnd'].forEach(id=>{
      document.getElementById(id).style.display = id === which ? '' : 'none';
    });
    document.getElementById('shareLayer').classList.toggle('on', !!which);
  }
  function shareShown(){
    shareSettled = true;
    sharePanel(null);
    document.getElementById('shareBack').classList.add('on');
  }
  function shareFailed(){
    if(shareSettled) return;
    shareSettled = true;
    sharePanel('shareError');
  }
  function shareEnded(){
    sharePanel('shareEnd');
    document.getElementById('shareBack').classList.remove('on');
  }

  const SHARE_SOURCE = { photo:'gallery', album:'albums', ref:'fursonas' };
  function shareTick(from){
    if(!shareOn || shareSettled) return;
    let found = null;
    if(shareKind === 'photo'){
      const p = galleryPhotos.find(x=> x.id === shareId);
      if(p) found = ()=> window.openLightbox(0, [p], ()=> null);
    } else if(shareKind === 'album'){
      if(galleryAlbums.some(a=> a.id === shareId)) found = ()=> openAlbumPanel(shareId, null);
    } else if(shareKind === 'ref'){
      const f = (window.fursonaList || []).find(x=> x.id === shareId);
      if(f) found = ()=> window.openLightbox(
        0, [{ imageUrl:f.imageUrl, originalUrl:f.imageUrl, caption:f.label || '' }], ()=> null);
    }
    if(found){ shareShown(); found(); return; }
    if(from && from === SHARE_SOURCE[shareKind]) shareFailed();
  }
  function shareReopen(){
    shareSettled = false;
    shareTick();
  }
  if(shareOn){
    document.getElementById('shareAgain').addEventListener('click', shareReopen);
    setTimeout(shareFailed, 12000);
  }

  function renderGallery(){
    indexGallery();
    const scattered = photosOf(null);
    const merged = [
      ...scattered.map(p=> ({ kind:'photo', it:p })),
      ...subAlbumsOf(null).map(a=> ({ kind:'album', it:a }))
    ].sort((a,b)=> effOrder(a.it) - effOrder(b.it));

    window.lightboxPhotos = merged.filter(m=> m.kind==='photo').map(m=> m.it);

    if(!merged.length){
      masonryMain.innerHTML = '<div class="cal-empty">還沒有上傳照片，敬請期待</div>';
      masonryClone.innerHTML = '';
      return;
    }
    const html = merged.map(m=> m.kind==='album' ? albumPinHtml(m.it) : pinHtml(m.it)).join('');
    masonryMain.innerHTML = html;
    masonryClone.innerHTML = html;

    masonryMain.querySelectorAll('.pin').forEach((el, i)=>{
      el.classList.add('pin-in');
      el.style.animationDelay = Math.min(i, 10) * 35 + 'ms';
    });

    let photoIdx = 0;
    masonryMain.querySelectorAll('.pin').forEach(el=>{
      if(el.dataset.albumId){
        el.addEventListener('click', ()=> openAlbumPanel(el.dataset.albumId, el));
      }else{
        const idx = photoIdx++;
        el.addEventListener('click', ()=>{
          if(typeof window.openLightbox === 'function') window.openLightbox(idx);
        });
      }
    });

    if(albumPanel && albumPanel.classList.contains('open') && albumStack.length) renderAlbumPanel();
  }

  const albumPanel = document.getElementById('albumPanel');
  const albumPanelCard = document.getElementById('albumPanelCard');
  const albumMasonry = document.getElementById('albumMasonry');
  let albumSourceTile = null;

  function cardTransformToTile(tile){
    const cr = albumPanelCard.getBoundingClientRect();
    const r = tile.getBoundingClientRect();
    const s = Math.max(r.width / cr.width, 0.06);
    const tx = (r.left + r.width/2) - (cr.left + cr.width/2);
    const ty = (r.top + r.height/2) - (cr.top + cr.height/2);
    return `translate(${tx}px, ${ty}px) scale(${s})`;
  }

  let albumStack = [];

  function renderAlbumPanel(){
    const albumId = albumStack[albumStack.length - 1];
    const al = galleryAlbums.find(a=> a.id === albumId);
    if(!al){ closeAlbumPanel(); return; }

    const subs = subAlbumsOf(albumId);
    const items = photosOf(albumId);

    document.getElementById('albumPanelTitle').textContent = albumStack
      .map(id=> (galleryAlbums.find(a=> a.id === id) || {}).name || '')
      .filter(Boolean).join(' › ');
    document.getElementById('albumPanelCount').textContent =
      [items.length ? `${items.length} 張` : '', subs.length ? `${subs.length} 個相簿` : '']
        .filter(Boolean).join('・');

    albumMasonry.innerHTML = (subs.length || items.length)
      ? subs.map(albumPinHtml).join('') + items.map(pinHtml).join('')
      : '<div class="cal-empty">這個相簿目前是空的</div>';

    let photoIdx = 0;
    albumMasonry.querySelectorAll('.pin').forEach((el)=>{
      if(el.dataset.albumId){
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          albumStack.push(el.dataset.albumId);
          renderAlbumPanel();
        });
      }else{
        const idx = photoIdx++;
        el.addEventListener('click', (e)=>{
          e.stopPropagation();
          if(typeof window.openLightbox === 'function'){
            window.openLightbox(idx, items, ix=> albumMasonry.querySelectorAll('.pin:not(.album-pin) img')[ix]);
          }
        });
      }
    });
  }

  function openAlbumPanel(albumId, tile){
    const al = galleryAlbums.find(a=> a.id === albumId);
    if(!al) return;
    albumSourceTile = tile || null;
    albumStack = [albumId];
    renderAlbumPanel();

    albumPanel.classList.add('open');
    albumPanel.style.transition = 'none';
    albumPanel.style.opacity = '0';
    albumPanelCard.style.transition = 'none';
    albumPanelCard.style.transform = tile ? cardTransformToTile(tile) : 'scale(0.9)';
    albumPanelCard.style.opacity = '0';
    void albumPanelCard.offsetWidth;
    albumPanel.style.transition = 'opacity .3s ease';
    albumPanel.style.opacity = '1';
    albumPanelCard.style.transition = 'transform .38s cubic-bezier(0.32,0.72,0,1), opacity .3s ease';
    albumPanelCard.style.transform = 'none';
    albumPanelCard.style.opacity = '1';
  }

  function closeAlbumPanel(){
    if(shareOn) shareEnded();
    const tile = albumSourceTile;
    const target = tile && document.body.contains(tile) ? cardTransformToTile(tile) : 'scale(0.92)';
    albumPanel.style.transition = 'opacity .28s ease .05s';
    albumPanel.style.opacity = '0';
    albumPanelCard.style.transition = 'transform .32s cubic-bezier(0.32,0.72,0,1), opacity .26s ease .06s';
    albumPanelCard.style.transform = target;
    albumPanelCard.style.opacity = '0';
    setTimeout(()=>{
      albumPanel.classList.remove('open');
      albumPanel.style.transition = 'none';
      albumPanelCard.style.transition = 'none';
      albumPanelCard.style.transform = '';
    }, 340);
  }
  albumPanel.addEventListener('click', (e)=>{
    const blank = e.target === albumPanel
      || e.target.id === 'albumPanelBody'
      || e.target === albumMasonry;
    if(blank) closeAlbumPanel();
  });
  function albumPanelBack(){
    if(albumStack.length > 1){
      albumStack.pop();
      renderAlbumPanel();
      return;
    }
    closeAlbumPanel();
  }
  document.getElementById('albumPanelBack').addEventListener('click', albumPanelBack);
  window.addEventListener('keydown', (e)=>{
    if(e.key !== 'Escape') return;
    const lb = document.getElementById('lightboxOverlay');
    if(lb && lb.classList.contains('open')) return;
    if(albumPanel.classList.contains('open')) albumPanelBack();
  });

  const Pano = (function(){
    const full = document.getElementById('panoFull');
    const cvs = document.getElementById('panoCanvas');
    const hint = document.getElementById('panoHint');
    const resetBtn = document.getElementById('panoReset');
    const vrBtn = document.getElementById('panoVrBtn');
    const closeBtn = document.getElementById('panoClose');
    const pctEl = document.getElementById('panoPct');
    let loadSeq = 0;

    function blobToImage(blob){
      return new Promise((ok, fail)=>{
        const u = URL.createObjectURL(blob);
        const im = new Image();
        im.onload = ()=>{ URL.revokeObjectURL(u); ok(im); };
        im.onerror = ()=>{ URL.revokeObjectURL(u); fail(new Error('decode')); };
        im.src = u;
      });
    }
    async function fetchImage(url, onPct){
      const res = await fetch(url, { mode:'cors' });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const total = +res.headers.get('content-length') || 0;
      if(!res.body) return blobToImage(await res.blob());
      const reader = res.body.getReader();
      const chunks = []; let got = 0;
      for(;;){
        const r = await reader.read();
        if(r.done) break;
        chunks.push(r.value); got += r.value.length;
        if(total) onPct(got / total);
      }
      return blobToImage(new Blob(chunks));
    }

    let gl = null, prog = null, tex = null, uni = {}, raf = 0;
    let live = false, hasImage = false;
    let progVal = -1;
    let yaw = 0, pitch = 0, fov = 1.15;
    const FOV_MIN = 0.45, FOV_MAX = 1.9, PITCH_LIMIT = 1.45;

    const VS = 'attribute vec2 a; varying vec2 v;' +
               'void main(){ v = a; gl_Position = vec4(a, 0.0, 1.0); }';
    const FS = 'precision highp float; varying vec2 v;' +
      'uniform sampler2D tex; uniform vec2 res; uniform float fov, yaw, pitch;' +
      'uniform int xr; uniform vec4 pj; uniform vec4 q; uniform float prog;' +
      'uniform vec2 anch; uniform int menuOn; uniform vec4 mrect; uniform sampler2D mTex;' +
      'uniform vec3 cur0; uniform vec3 cur1; uniform int curN;' +
      'const float PI = 3.141592653589793;' +
      'void main(){' +
      '  vec3 d;' +
      '  if(xr == 1){' +
      '    vec3 e = normalize(vec3((v.x + pj.z) / pj.x, (v.y + pj.w) / pj.y, -1.0));' +
      '    d = normalize(e + 2.0 * cross(q.xyz, cross(q.xyz, e) + q.w * e));' +
      '  } else {' +
      '  float t = tan(fov * 0.5);' +
      '  d = normalize(vec3(v.x * t * (res.x / res.y), v.y * t, -1.0));' +
      '  float cp = cos(pitch), sp = sin(pitch);' +
      '  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);' +
      '  float cy = cos(yaw), sy = sin(yaw);' +
      '  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);' +
      '  }' +
      '  float u = atan(d.x, -d.z) / (2.0 * PI) + 0.5;' +
      '  float w = acos(clamp(d.y, -1.0, 1.0)) / PI;' +
      '  gl_FragColor = texture2D(tex, vec2(u, w));' +
      '  float lon = atan(d.x, -d.z);' +
      '  float lat = asin(clamp(d.y, -1.0, 1.0));' +
      '  if(menuOn == 1 && xr == 1){' +
      '    float ml = mod(lon - mrect.x + PI, 2.0 * PI) - PI;' +
      '    float mt = lat - mrect.y;' +
      '    if(abs(ml) < mrect.z && abs(mt) < mrect.w){' +
      '      vec4 mc = texture2D(mTex, vec2(ml / mrect.z * 0.5 + 0.5, 0.5 - mt / mrect.w * 0.5));' +
      '      gl_FragColor = vec4(mix(gl_FragColor.rgb, mc.rgb, mc.a), 1.0);' +
      '    }' +
      '  }' +
      '  if(prog >= 0.0 && xr == 1){' +
      '    float bl = mod(lon - anch.x + PI, 2.0 * PI) - PI;' +
      '    float bt = lat - anch.y;' +
      '    if(abs(bl) < 0.30 && abs(bt) < 0.014){' +
      '      float tt = (bl + 0.30) / 0.60;' +
      '      gl_FragColor = tt <= prog ? vec4(0.95, 0.92, 0.85, 1.0) : vec4(0.22, 0.20, 0.18, 1.0);' +
      '    }' +
      '  }' +
      '  if(prog >= 0.0 && xr == 0){' +
      '    float bw = 0.40, bh = 0.010, by = -0.55;' +
      '    if(abs(v.x) < bw && abs(v.y - by) < bh){' +
      '      float tt = (v.x + bw) / (2.0 * bw);' +
      '      gl_FragColor = tt <= prog ? vec4(0.95, 0.92, 0.85, 1.0) : vec4(0.22, 0.20, 0.18, 1.0);' +
      '    }' +
      '  }' +
      '  if(xr == 1 && curN > 0){' +
      '    float c0 = dot(d, cur0);' +
      '    if(c0 > 0.9998) gl_FragColor = c0 > 0.99993 ? vec4(1.0, 0.98, 0.92, 1.0) : vec4(0.15, 0.13, 0.11, 1.0);' +
      '  }' +
      '  if(xr == 1 && curN > 1){' +
      '    float c1 = dot(d, cur1);' +
      '    if(c1 > 0.9998) gl_FragColor = c1 > 0.99993 ? vec4(1.0, 0.98, 0.92, 1.0) : vec4(0.15, 0.13, 0.11, 1.0);' +
      '  }' +
      '}';

    function compile(src, type){
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }

    let lastError = '';
    function boot(){
      if(gl) return true;
      gl = cvs.getContext('webgl2', { antialias:false, alpha:false })
        || cvs.getContext('webgl', { antialias:false, alpha:false });
      if(!gl){ lastError = '這個瀏覽器建不出 WebGL 畫布'; return false; }
      const vs = compile(VS, gl.VERTEX_SHADER), fs = compile(FS, gl.FRAGMENT_SHADER);
      if(!vs || !fs){ gl = null; lastError = '著色器編譯失敗'; return false; }
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ gl = null; lastError = '著色器連結失敗'; return false; }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      uni = {
        res: gl.getUniformLocation(prog, 'res'),
        fov: gl.getUniformLocation(prog, 'fov'),
        yaw: gl.getUniformLocation(prog, 'yaw'),
        pitch: gl.getUniformLocation(prog, 'pitch'),
        xr: gl.getUniformLocation(prog, 'xr'),
        pj: gl.getUniformLocation(prog, 'pj'),
        q: gl.getUniformLocation(prog, 'q'),
        prog: gl.getUniformLocation(prog, 'prog'),
        anch: gl.getUniformLocation(prog, 'anch'),
        menuOn: gl.getUniformLocation(prog, 'menuOn'),
        mrect: gl.getUniformLocation(prog, 'mrect'),
        mtex: gl.getUniformLocation(prog, 'mTex'),
        cur0: gl.getUniformLocation(prog, 'cur0'),
        cur1: gl.getUniformLocation(prog, 'cur1'),
        curN: gl.getUniformLocation(prog, 'curN')
      };
      gl.uniform1i(uni.mtex, 1);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      menuGlTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, menuGlTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      gl.activeTexture(gl.TEXTURE0);
      return true;
    }

    function upload(img){
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      let w = Math.pow(2, Math.round(Math.log2(img.naturalWidth || 2048)));
      w = Math.max(1024, Math.min(w, 8192, max));
      for(; w >= 512; w = w / 2){
        try{
          const h = w / 2;
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          if(!ctx) continue;
          ctx.drawImage(img, 0, 0, w, h);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          while(gl.getError() !== gl.NO_ERROR){}
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
          if(gl.getError() !== gl.NO_ERROR) continue;
          hasImage = true;
          return true;
        }catch(err){}
      }
      lastError = '這台裝置的記憶體吃不下這張全景圖';
      return false;
    }

    function sizeCanvas(){
      const r = cvs.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if(cvs.width !== w || cvs.height !== h){ cvs.width = w; cvs.height = h; }
    }

    function draw(){
      if(!live) return;
      raf = requestAnimationFrame(draw);
      if(!gl || !hasImage) return;
      sizeCanvas();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.uniform1i(uni.xr, 0);
      gl.uniform1f(uni.prog, progVal);
      gl.viewport(0, 0, cvs.width, cvs.height);
      gl.uniform2f(uni.res, cvs.width, cvs.height);
      gl.uniform1f(uni.fov, fov);
      gl.uniform1f(uni.yaw, yaw);
      gl.uniform1f(uni.pitch, pitch);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function clampPitch(){ pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch)); }

    const pts = new Map();
    let pinchDist = 0;
    let vYaw = 0, vPitch = 0, lastT = 0;

    function look(dx, dy){
      const k = fov / cvs.clientHeight * 1.6;
      yaw += dx * k; pitch += dy * k;
      clampPitch();
      return { y: dx * k, p: dy * k };
    }
    function twoFingerDist(){
      const v = [...pts.values()];
      return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
    }

    let glide = 0;
    const GLIDE_MIN = 0.00002;
    function stopGlide(){ cancelAnimationFrame(glide); glide = 0; }
    function startGlide(){
      stopGlide();
      if(Math.abs(vYaw) < GLIDE_MIN && Math.abs(vPitch) < GLIDE_MIN) return;
      let prev = performance.now();
      const step = ()=>{
        if(!live){ glide = 0; return; }
        const now = performance.now();
        const dt = Math.min(32, now - prev); prev = now;
        yaw += vYaw * dt; pitch += vPitch * dt;
        clampPitch();
        const f = Math.pow(0.94, dt / 16.7);
        vYaw *= f; vPitch *= f;
        if(Math.abs(vYaw) > GLIDE_MIN || Math.abs(vPitch) > GLIDE_MIN)
          glide = requestAnimationFrame(step);
        else { glide = 0; vYaw = vPitch = 0; }
      };
      glide = requestAnimationFrame(step);
    }

    cvs.addEventListener('pointerdown', e=>{
      e.stopPropagation();
      cvs.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stopGlide(); vYaw = vPitch = 0;
      if(pts.size === 2) pinchDist = twoFingerDist();
      lastT = performance.now();
      hideHint();
    });
    cvs.addEventListener('pointermove', e=>{
      const p = pts.get(e.pointerId);
      if(!p) return;
      e.stopPropagation();
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if(pts.size >= 2){
        const d = twoFingerDist();
        if(pinchDist && d) fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov * (pinchDist / d)));
        pinchDist = d;
        vYaw = vPitch = 0;
        return;
      }
      const now = performance.now();
      const dt = Math.max(8, now - lastT); lastT = now;
      const m = look(dx, dy);
      vYaw = m.y / dt; vPitch = m.p / dt;
    });
    const endPointer = e=>{
      if(!pts.has(e.pointerId)) return;
      e.stopPropagation();
      pts.delete(e.pointerId);
      if(pts.size < 2) pinchDist = 0;
      if(pts.size === 0) startGlide();
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>
      cvs.addEventListener(t, endPointer));
    cvs.addEventListener('wheel', e=>{
      e.preventDefault(); e.stopPropagation();
      fov = Math.max(FOV_MIN, Math.min(FOV_MAX, fov * (e.deltaY > 0 ? 1.08 : 1/1.08)));
    }, { passive:false });

    let hintTimer = 0;
    function showHint(){
      hint.classList.add('show');
      clearTimeout(hintTimer); hintTimer = setTimeout(hideHint, 2600);
    }
    function hideHint(){ hint.classList.remove('show'); }

    let xrSession = null, xrRefSpace = null;

    async function vrSupported(){
      if(!navigator.xr || !navigator.xr.isSessionSupported) return false;
      try{ return await navigator.xr.isSessionSupported('immersive-vr'); }
      catch(err){ return false; }
    }

    let headLon = 0, headLat = 0;
    let barAnchored = false, barLon = 0, barLat = 0;
    let menuOpen = false, menuLon = 0, menuLat = 0, menuHover = -1, menuBtnWas = false;
    let menuGlTex = null, menuCvs = null;
    const MENU_HW = 0.34, MENU_HH = 0.22;
    const FWD = { x: 0, y: 0, z: -1 };

    function rotVec(q2, p){
      const tx = 2 * (q2.y * p.z - q2.z * p.y);
      const ty = 2 * (q2.z * p.x - q2.x * p.z);
      const tz = 2 * (q2.x * p.y - q2.y * p.x);
      return {
        x: p.x + q2.w * tx + (q2.y * tz - q2.z * ty),
        y: p.y + q2.w * ty + (q2.z * tx - q2.x * tz),
        z: p.z + q2.w * tz + (q2.x * ty - q2.y * tx)
      };
    }
    function dirLonLat(o){
      const f = rotVec(o, FWD);
      return {
        lon: Math.atan2(f.x, -f.z),
        lat: Math.asin(Math.max(-1, Math.min(1, f.y)))
      };
    }
    const wrapA = a=>{
      a = (a + Math.PI) % (2 * Math.PI);
      if(a < 0) a += 2 * Math.PI;
      return a - Math.PI;
    };
    function rayRow(o){
      const g = dirLonLat(o);
      const dl = wrapA(g.lon - menuLon), dt = g.lat - menuLat;
      if(Math.abs(dl) >= MENU_HW || Math.abs(dt) >= MENU_HH) return -1;
      return Math.min(3, Math.max(0, Math.floor((MENU_HH - dt) / (2 * MENU_HH) * 4)));
    }

    function drawMenuTex(){
      if(!menuCvs){
        menuCvs = document.createElement('canvas');
        menuCvs.width = 512; menuCvs.height = 332;
      }
      const c = menuCvs.getContext('2d');
      const W = menuCvs.width, H = menuCvs.height, rh = H / 4, r = 26;
      c.clearRect(0, 0, W, H);
      c.beginPath();
      c.moveTo(r, 0); c.arcTo(W, 0, W, H, r); c.arcTo(W, H, 0, H, r);
      c.arcTo(0, H, 0, 0, r); c.arcTo(0, 0, W, 0, r); c.closePath();
      c.fillStyle = 'rgba(24, 21, 18, 0.93)';
      c.fill();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(243, 234, 217, 0.55)';
      c.font = '500 24px system-ui, sans-serif';
      c.fillText(nav && nav.count > 1 ? ('360 全景 ' + (navIdx + 1) + ' / ' + nav.count) : '360 全景', W / 2, rh * 0.5);
      const rows = ['', '上一張', '下一張', '離開 VR'];
      const canNav = !!(nav && nav.count > 1);
      for(let i = 1; i < 4; i++){
        const dis = i < 3 && !canNav;
        if(i === menuHover && !dis){
          c.fillStyle = 'rgba(243, 234, 217, 0.16)';
          c.fillRect(10, rh * i + 4, W - 20, rh - 8);
        }
        c.fillStyle = dis ? 'rgba(243, 234, 217, 0.28)'
          : (i === menuHover ? '#FFF7E8' : '#F3EAD9');
        c.font = '600 34px system-ui, sans-serif';
        c.fillText(rows[i], W / 2, rh * i + rh * 0.5);
        c.fillStyle = 'rgba(243, 234, 217, 0.10)';
        c.fillRect(24, rh * i, W - 48, 1);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, menuGlTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, menuCvs);
      gl.activeTexture(gl.TEXTURE0);
    }

    function toggleMenu(){
      menuOpen = !menuOpen;
      if(menuOpen){
        menuLon = headLon;
        menuLat = Math.max(-0.8, Math.min(0.8, headLat));
        menuHover = -1;
        drawMenuTex();
      }
    }

    let curDirs = [];
    function pollXRInput(frame){
      let pressed = false, hover = -1;
      curDirs.length = 0;
      for(const src of frame.session.inputSources){
        const gp = src.gamepad;
        if(src.handedness === 'left' && gp && gp.buttons){
          const b4 = gp.buttons[4], b5 = gp.buttons[5];
          if((b4 && b4.pressed) || (b5 && b5.pressed)) pressed = true;
        }
        if(menuOpen && src.targetRaySpace){
          const rp = frame.getPose(src.targetRaySpace, xrRefSpace);
          if(rp){
            if(curDirs.length < 2) curDirs.push(rotVec(rp.transform.orientation, FWD));
            const row = rayRow(rp.transform.orientation);
            if(row > 0) hover = row;
          }
        }
      }
      if(pressed && !menuBtnWas) toggleMenu();
      menuBtnWas = pressed;
      if(menuOpen && hover !== menuHover){ menuHover = hover; drawMenuTex(); }
    }

    function onXRSelect(ev){
      if(!xrRefSpace) return;
      let row = -1;
      try{
        const rp = ev.frame.getPose(ev.inputSource.targetRaySpace, xrRefSpace);
        if(rp) row = rayRow(rp.transform.orientation);
      }catch(err){}
      if(!menuOpen){ toggleMenu(); return; }
      if(row < 0 && menuHover > 0) row = menuHover;
      if(row === 1) switchTo(-1);
      else if(row === 2) switchTo(1);
      else if(row === 3){
        menuOpen = false;
        if(xrSession) xrSession.end().catch(()=>{});
      }
      else if(row < 0) menuOpen = false;
    }

    function onXRFrame(t, frame){
      const session = frame.session;
      session.requestAnimationFrame(onXRFrame);
      const layer = session.renderState.baseLayer;
      if(!layer) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const pose = frame.getViewerPose(xrRefSpace);
      if(!pose) return;
      const g = dirLonLat(pose.transform.orientation);
      headLon = g.lon; headLat = g.lat;
      if(progVal >= 0){
        if(!barAnchored){ barAnchored = true; barLon = headLon; barLat = headLat; }
      } else barAnchored = false;
      pollXRInput(frame);
      gl.uniform1i(uni.xr, 1);
      gl.uniform1f(uni.prog, progVal);
      gl.uniform2f(uni.anch, barLon, barLat);
      gl.uniform1i(uni.menuOn, menuOpen ? 1 : 0);
      gl.uniform4f(uni.mrect, menuLon, menuLat, MENU_HW, MENU_HH);
      gl.uniform1i(uni.curN, curDirs.length);
      if(curDirs[0]) gl.uniform3f(uni.cur0, curDirs[0].x, curDirs[0].y, curDirs[0].z);
      if(curDirs[1]) gl.uniform3f(uni.cur1, curDirs[1].x, curDirs[1].y, curDirs[1].z);
      for(const view of pose.views){
        const vp = layer.getViewport(view);
        if(!vp) continue;
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const m = view.projectionMatrix;
        gl.uniform4f(uni.pj, m[0], m[5], m[8], m[9]);
        const o = view.transform.orientation;
        gl.uniform4f(uni.q, o.x, o.y, o.z, o.w);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    let fullUrl = '', onFullDone = null;
    let nav = null, navIdx = 0;

    async function upgradeTexture(url){
      if(!gl) return false;
      const my = ++loadSeq;
      progVal = 0;
      try{
        const im = await fetchImage(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'pano=1', f=>{
          if(my === loadSeq) progVal = f;
        });
        if(my !== loadSeq){ progVal = -1; return false; }
        const ok = upload(im);
        progVal = -1;
        if(ok) full.classList.remove('loading');
        return ok;
      }catch(err){
        progVal = -1;
        return false;
      }
    }

    async function switchTo(dir){
      if(!nav || nav.count < 2) return;
      navIdx = (navIdx + nav.count + dir) % nav.count;
      const at = navIdx;
      const info = nav.load(at);
      try{ nav.onShow(at); }catch(err){}
      menuOpen = false;
      const my = ++loadSeq;
      progVal = 0;
      try{
        const im = await fetchImage(info.url + (info.url.indexOf('?') >= 0 ? '&' : '?') + 'pano=1', f=>{
          if(my === loadSeq) progVal = f;
        });
        if(my !== loadSeq) return;
        progVal = -1;
        if(!upload(im)) return;
        if(info.fullUrl){
          const done = await upgradeTexture(info.fullUrl);
          if(done && nav){ try{ nav.onFull(at); }catch(err){} }
        }
      }catch(err){
        if(my === loadSeq) progVal = -1;
      }
    }

    async function enterVR(){
      if(!gl || xrSession) return false;
      if(!await vrSupported()){ lastError = '這台裝置沒有回報支援 immersive-vr'; return false; }
      try{
        if(gl.makeXRCompatible) await gl.makeXRCompatible();
        const session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local'], optionalFeatures: ['hand-tracking'] })
          .catch(()=> navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['hand-tracking'] }));
        session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });
        xrRefSpace = null;
        for(const want of ['local-floor', 'local']){
          try{ xrRefSpace = await session.requestReferenceSpace(want); break; }
          catch(err){}
        }
        if(!xrRefSpace){
          lastError = '拿不到會隨頭部轉動的參考空間（只剩 viewer，那個是綁在頭上的）';
          try{ await session.end(); }catch(err){}
          return false;
        }
        xrSession = session;
        session.addEventListener('select', onXRSelect);
        session.addEventListener('end', ()=>{
          xrSession = null; xrRefSpace = null;
          menuOpen = false; menuBtnWas = false; menuHover = -1;
          vrBtn.dataset.state = 'off';
          vrBtn.textContent = '戴上 VR 看';
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.uniform1i(uni.xr, 0);
          if(live){ cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
        });
        cancelAnimationFrame(raf); raf = 0;
        session.requestAnimationFrame(onXRFrame);
        return true;
      }catch(err){
        lastError = 'VR 啟動失敗（' + (err && err.message ? err.message : '未知') + '）';
        return false;
      }
    }

    vrBtn.addEventListener('click', async e=>{
      e.stopPropagation();
      if(vrBtn.dataset.state !== 'off') return;
      vrBtn.dataset.state = 'loading';
      vrBtn.textContent = '進入 VR…';
      const ok = await enterVR();
      if(ok){
        vrBtn.dataset.state = 'on';
        vrBtn.textContent = 'VR 進行中';
        if(fullUrl){
          const url = fullUrl;
          fullUrl = '';
          const t0 = performance.now();
          while(!hasImage && live && performance.now() - t0 < 8000)
            await new Promise(r=> setTimeout(r, 100));
          const done = await upgradeTexture(url);
          if(done && onFullDone) onFullDone();
        }
      }else{
        vrBtn.dataset.state = 'off';
        vrBtn.textContent = '戴上 VR 看';
        alert('進不了 VR：' + (lastError || '未知原因'));
      }
    });

    let xrDevice = false;
    const HEADSET_UA = /OculusBrowser|MetaQuest|Quest|PicoBrowser|Wolvic/i.test(navigator.userAgent);
    vrSupported().then(ok=>{
      if(ok) vrBtn.dataset.state = 'off';
      xrDevice = ok && HEADSET_UA;
    });

    resetBtn.addEventListener('click', e=>{
      e.stopPropagation();
      stopGlide(); vYaw = vPitch = 0;
      yaw = 0; pitch = 0; fov = 1.15; showHint();
    });

    addEventListener('resize', ()=>{ if(live) sizeCanvas(); });
    closeBtn.addEventListener('click', e=>{ e.stopPropagation(); api.close(); });
    addEventListener('keydown', e=>{
      if(e.key === 'Escape' && live){ e.stopImmediatePropagation(); api.close(); }
    }, true);

    const api = {
      get isOpen(){ return live; },
      get lastError(){ return lastError; },
      tryAutoVR(){
        if(!xrDevice || xrSession) return false;
        if(vrBtn.dataset.state !== 'off') return false;
        vrBtn.click();
        return true;
      },
      open(url, onFail, onDone, opts){
        fullUrl = (opts && opts.fullUrl) || '';
        onFullDone = (opts && opts.onFullDone) || null;
        nav = (opts && opts.nav) || null;
        navIdx = (opts && opts.navIndex) || 0;
        progVal = -1;
        full.classList.add('open', 'loading');
        if(!boot()){
          full.classList.remove('open', 'loading');
          return false;
        }
        pctEl.textContent = '載入全景圖…';
        hasImage = false; live = true;
        yaw = 0; pitch = 0; fov = 1.15;
        const my = ++loadSeq;
        fetchImage(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'pano=1', f=>{
          if(my === loadSeq) pctEl.textContent = Math.round(f * 100) + '%';
        }).then(im=>{
          if(my !== loadSeq || !live) return;
          if(!upload(im)){
            live = false; cancelAnimationFrame(raf); raf = 0;
            full.classList.remove('open', 'loading'); hideHint();
            if(onFail) onFail(lastError);
            return;
          }
          full.classList.remove('loading');
          showHint();
          if(onDone) onDone();
        }).catch(err=>{
          if(my !== loadSeq || !live) return;
          live = false; cancelAnimationFrame(raf); raf = 0;
          full.classList.remove('open', 'loading'); hideHint();
          lastError = '全景圖讀取失敗（' + (err && err.message ? err.message : '網路或格式問題') + '）';
          if(onFail) onFail(lastError);
        });
        cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
        return true;
      },
      close(){
        live = false; hasImage = false;
        progVal = -1; fullUrl = ''; onFullDone = null;
        nav = null; navIdx = 0; menuOpen = false;
        if(xrSession) xrSession.end().catch(()=>{});
        loadSeq++;
        cancelAnimationFrame(raf); raf = 0;
        stopGlide(); vYaw = vPitch = 0; pts.clear(); pinchDist = 0;
        hideHint();
        full.classList.remove('open', 'loading');
      }
    };
    return api;
  })();

  (function(){
    const overlay = document.getElementById('lightboxOverlay');
    const stage = document.getElementById('lightboxStage');
    const imgEl = document.getElementById('lightboxImg');
    const capEl = document.getElementById('lightboxCaption');
    const counterEl = document.getElementById('lightboxCounter');
    const closeBtn = document.getElementById('lightboxClose');
    const downloadBtn = document.getElementById('lightboxDownload');
    const track = document.getElementById('lightboxTrack');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    const metaRow = document.querySelector('.lightbox-meta');

    function syncMetaWidth(){
      const w = imgEl.getBoundingClientRect().width;
      if(w > 0) metaRow.style.width = w + 'px';
    }
    imgEl.addEventListener('load', syncMetaWidth);
    window.addEventListener('resize', syncMetaWidth);
    if(typeof ResizeObserver === 'function'){
      new ResizeObserver(syncMetaWidth).observe(imgEl);
    }
    const prevImgEl = document.getElementById('lightboxPrevImg');
    const nextImgEl = document.getElementById('lightboxNextImg');
    const panoEnter = document.getElementById('panoEnter');
    const panoFullBtn = document.getElementById('panoFullBtn');
    const hdrToggle = document.getElementById('hdrToggle');
    const hdrLabel = hdrToggle.querySelector('.hdr-label');
    const fullToggle = document.getElementById('fullToggle');
    const fullLabel = fullToggle.querySelector('.full-label');
    let fullSeq = 0;
    const fullShown = new Set();
    const srcFor = (p)=>{
      if(!p) return '';
      if(fullBlob && fullBlob.id === p.id) return fullBlob.url;
      return (fullShown.has(p.id) && p.originalUrl) ? p.originalUrl : p.imageUrl;
    };

    panoEnter.addEventListener('click', e=>{
      e.stopPropagation();
      const p = currentList[idx];
      if(!p) return;
      panoFullOwner = p;
      panoFullBtn.dataset.state = panoCanFull(p) ? (fullShown.has(p.id) ? 'on' : 'off') : 'none';
      panoFullBtn.textContent = fullShown.has(p.id) ? '已是全尺寸' : '以全尺寸顯示';
      const already = fullShown.has(p.id) && p.originalUrl;
      const panoList = currentList.filter(x=> x.pano);
      const opened = Pano.open(already ? p.originalUrl : (p.panoUrl || p.imageUrl), (why)=>{
        panoEnter.dataset.on = '0';
        alert('這張全景圖打不開：' + (why || '未知原因') + '。先用一般照片顯示。');
      }, null, {
        fullUrl: (!already && panoCanFull(p)) ? p.originalUrl : '',
        onFullDone: ()=>{
          fullShown.add(p.id);
          panoFullBtn.dataset.state = 'on';
          panoFullBtn.textContent = '已是全尺寸';
          updateDownloadHint();
        },
        nav: {
          count: panoList.length,
          load(at){
            const n = panoList[at];
            const has = fullShown.has(n.id) && n.originalUrl;
            return {
              url: has ? n.originalUrl : (n.panoUrl || n.imageUrl),
              fullUrl: (!has && panoCanFull(n)) ? n.originalUrl : ''
            };
          },
          onShow(at){
            const n = panoList[at];
            const wi = currentList.indexOf(n);
            if(wi >= 0) idx = wi;
            ++hdrSeq; ++fullSeq;
            hdrOff();
            panoFullOwner = n;
            imgEl.style.transition = 'none';
            imgEl.style.transform = '';
            imgEl.style.opacity = '1';
            setSrc(imgEl, srcFor(n), isOriginal(n, srcFor(n)));
            imgEl.alt = n.caption || '';
            void imgEl.offsetWidth;
            imgEl.style.transition = '';
            syncMetaWidth();
            renderChrome(true);
            panoFullBtn.dataset.state = panoCanFull(n) ? (fullShown.has(n.id) ? 'on' : 'off') : 'none';
            panoFullBtn.textContent = fullShown.has(n.id) ? '已是全尺寸' : '以全尺寸顯示';
          },
          onFull(at){
            const n = panoList[at];
            fullShown.add(n.id);
            if(panoFullOwner === n){
              panoFullBtn.dataset.state = 'on';
              panoFullBtn.textContent = '已是全尺寸';
            }
            updateDownloadHint();
          }
        },
        navIndex: Math.max(0, panoList.indexOf(p))
      });
      if(!opened) alert('這台裝置沒辦法顯示 360 全景：' + (Pano.lastError || '未知原因'));
      else Pano.tryAutoVR();
    });

    const panoCanFull = (p)=> !!(p && p.originalUrl && p.originalStore === 'r2');
    let panoFullOwner = null;

    panoFullBtn.addEventListener('click', e=>{
      e.stopPropagation();
      const p = panoFullOwner;
      if(!p || panoFullBtn.dataset.state !== 'off') return;
      panoFullBtn.dataset.state = 'loading';
      panoFullBtn.textContent = '載入原尺寸…';
      const ok = Pano.open(p.originalUrl, ()=>{
        panoFullBtn.dataset.state = 'off';
        panoFullBtn.textContent = '以全尺寸顯示';
      }, ()=>{
        fullShown.add(p.id);
        panoFullBtn.dataset.state = 'on';
        panoFullBtn.textContent = '已是全尺寸';
        updateDownloadHint();
      });
      if(!ok){
        panoFullBtn.dataset.state = 'off';
        panoFullBtn.textContent = '以全尺寸顯示';
      }
    });

    let idx = 0;
    let currentList = [];
    let hdrSeq = 0;
    let closeTimer = 0;
    let sourceGetter = null;

    const HDR_CTRL = CSS.supports('dynamic-range-limit', 'no-limit');

    const HDR_SCREEN = (()=>{
      try{
        const q = matchMedia('(dynamic-range: high)');
        return q.media === 'not all' ? true : q.matches;
      }catch(e){ return true; }
    })();
    let hdrRamp = 0, hdrLevel = 0;
    function setHdrLevel(v){
      hdrLevel = Math.max(0, Math.min(1, v));
      imgEl.style.setProperty('dynamic-range-limit',
        hdrLevel <= 0 ? 'standard' :
        hdrLevel >= 1 ? 'no-limit' :
        'dynamic-range-limit-mix(standard ' + Math.round((1 - hdrLevel) * 100) +
        '%, no-limit ' + Math.round(hdrLevel * 100) + '%)');
    }
    function stopHdrRamp(){ clearTimeout(hdrRamp); hdrRamp = 0; }
    function hdrOn(){ stopHdrRamp(); setHdrLevel(1); }
    function hdrOff(){ stopHdrRamp(); setHdrLevel(0); }

    hdrToggle.addEventListener('click', e=>{
      e.stopPropagation();
      const p = currentList[idx];
      if(!p || !p.hdr || !p.originalUrl) return;
      if(hdrToggle.dataset.state !== 'off') return;
      const my = ++hdrSeq;
      hdrToggle.dataset.state = 'loading';
      hdrLabel.textContent = '點亮 HDR 中…';
      const hi = new Image();
      hi.crossOrigin = 'anonymous';
      hi.src = p.originalUrl;
      hi.decode().then(()=>{
        if(my !== hdrSeq || !overlay.classList.contains('open')) return;
        setSrc(imgEl, p.originalUrl, true);
        fullShown.add(p.id);
        hdrOn();
        hdrToggle.dataset.state = 'none';
      }).catch(()=>{
        if(my !== hdrSeq) return;
        hdrLabel.textContent = 'HDR';
        hdrToggle.dataset.state = 'off';
      });
    });

    function setSrc(el, url, cors){
      if(cors) el.crossOrigin = 'anonymous';
      else el.removeAttribute('crossorigin');
      el.src = url;
    }
    const isOriginal = (p, url)=> !!(p && p.originalUrl && url === p.originalUrl);
    const blobFor = (p)=> (p && fullBlob && fullBlob.id === p.id) ? fullBlob.url : null;

    function swapPhoto(url, alt, stillValid){
      const cors = isOriginal(currentList[idx], url);
      const pre = new Image();
      if(cors) pre.crossOrigin = 'anonymous';
      let done = false;
      const apply = ()=>{
        if(done) return;
        done = true;
        if(stillValid && !stillValid()) return;
        imgEl.style.transition = 'none';
        imgEl.style.transform = '';
        setSrc(imgEl, url, cors);
        if(alt !== undefined) imgEl.alt = alt;
        void imgEl.offsetWidth;
        imgEl.style.transition = '';
        imgEl.style.opacity = '1';
        syncMetaWidth();
      };
      pre.onload = ()=> setTimeout(apply, 100);
      pre.onerror = apply;
      pre.decode().then(apply).catch(apply);
      setTimeout(apply, 1200);
      pre.src = url;
    }

    fullToggle.addEventListener('click', e=>{
      e.stopPropagation();
      const p = currentList[idx];
      if(!p || !p.originalUrl || fullToggle.dataset.state !== 'off') return;
      const my = ++fullSeq;
      fullToggle.dataset.state = 'loading';
      fullToggle.style.setProperty('--p', 0);
      delete fullToggle.dataset.indet;
      fullLabel.textContent = '載入原尺寸…';
      let done = false;
      const apply = (blob)=>{
        if(done) return;
        done = true;
        if(my !== fullSeq || !overlay.classList.contains('open')) return;
        setSrc(imgEl, blob ? keepBlob(p.id, blob) : p.originalUrl, !blob);
        fullShown.add(p.id);
        fullToggle.dataset.state = 'on';
        fullLabel.textContent = '已是全尺寸';
        syncMetaWidth();
        updateDownloadHint();
      };
      const fail = ()=>{
        if(done || my !== fullSeq) return;
        done = true;
        fullToggle.dataset.state = 'off';
        fullLabel.textContent = '以全尺寸顯示';
      };
      const viaImage = ()=>{
        if(done) return;
        const hi = new Image();
        hi.crossOrigin = 'anonymous';
        hi.onload = ()=> setTimeout(apply, 0);
        hi.onerror = fail;
        hi.decode().then(apply).catch(()=>{});
        hi.src = p.originalUrl;
      };
      pullWithProgress(p.originalUrl, pct=>{
        if(my !== fullSeq || done) return;
        const n = Math.round(pct * 100);
        fullToggle.style.setProperty('--p', n);
        fullLabel.textContent = '載入原尺寸 ' + n + '%';
      }, ()=>{ if(my === fullSeq) fullToggle.dataset.indet = '1'; })
        .then(blob=>{ if(blob) apply(blob); else viaImage(); }).catch(viaImage);
    });

    async function pullWithProgress(url, onPct, onNoTotal){
      try{
        const res = await fetch(url, { mode:'cors' });
        if(!res.ok || !res.body) return false;
        const total = +res.headers.get('content-length') || 0;
        if(!total && onNoTotal) onNoTotal();
        const reader = res.body.getReader();
        const chunks = []; let got = 0;
        for(;;){
          const r = await reader.read();
          if(r.done) break;
          chunks.push(r.value); got += r.value.length;
          if(total) onPct(got / total);
        }
        return new Blob(chunks, { type: res.headers.get('content-type') || 'image/jpeg' });
      }catch(err){
        return null;
      }
    }

    let fullBlob = null;
    function keepBlob(id, blob){
      if(fullBlob) URL.revokeObjectURL(fullBlob.url);
      fullBlob = { id, url: URL.createObjectURL(blob) };
      return fullBlob.url;
    }
    function dropBlob(){
      if(fullBlob) URL.revokeObjectURL(fullBlob.url);
      fullBlob = null;
    }

    function updateDownloadHint(){
      const p = currentList[idx];
      const cached = !!p && fullShown.has(p.id);
      downloadBtn.title = cached
        ? '原始檔已經在瀏覽器裡，存檔不會再下載一次'
        : '下載原始檔';
    }

    function render(instant){
      const list = currentList;
      if(!list.length) return;
      const p = list[idx];
      if(typeof resetZoom === 'function') resetZoom(false);
      Pano.close();
      panoEnter.dataset.on = p.pano ? '1' : '0';
      const rs = ++hdrSeq;
      ++fullSeq;
      renderChrome();
      const show = ()=>{
        if(rs !== hdrSeq) return;
        swapPhoto(srcFor(p), p.caption || '', ()=> rs === hdrSeq);
      };
      if(instant){
        hdrOff();
        show();
      } else if(hdrLevel > 0){
        imgEl.style.opacity = '0';
        setTimeout(hdrOff, 150);
        setTimeout(show, 330);
      } else {
        hdrOff();
        imgEl.style.opacity = '0';
        setTimeout(show, 120);
      }
    }

    function renderChrome(keepPano){
      const list = currentList;
      const p = list[idx];
      if(!p) return;
      if(!keepPano) Pano.close();
      panoEnter.dataset.on = p.pano ? '1' : '0';
      const isHdrPhoto = !!(p.hdr && p.originalUrl);
      hdrToggle.dataset.state = isHdrPhoto ? (HDR_SCREEN ? 'off' : 'nohdr') : 'none';
      hdrLabel.textContent = HDR_SCREEN ? 'HDR' : '當前無法顯示 HDR';
      hdrToggle.title = HDR_SCREEN ? '點亮 HDR' : '這個螢幕沒有 HDR 亮度範圍';
      capEl.textContent = p.caption || '';
      counterEl.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
      if(p.originalUrl){
        downloadBtn.style.display = 'flex';
        const hasDownloaded = localStorage.getItem('lbHasDownloaded') === '1';
        downloadBtn.classList.toggle('compact', hasDownloaded);
        downloadBtn.classList.toggle('attract', !hasDownloaded);
      }else{
        downloadBtn.style.display = 'none';
      }
      const canFull = p.originalStore === 'r2' && !!p.originalUrl && !p.pano;
      const isFull = fullShown.has(p.id);
      fullToggle.dataset.state = canFull ? (isFull ? 'on' : 'off') : 'none';
      fullLabel.textContent = isFull ? '已是全尺寸' : '以全尺寸顯示';
      updateDownloadHint();
      const many = list.length > 1;
      prevBtn.style.display = many ? 'flex' : 'none';
      nextBtn.style.display = many ? 'flex' : 'none';
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === list.length - 1;
      fillNeighbours();
      setTrack(0, false);
    }

    window.openLightbox = function(i, list, getSourceEl){
      currentList = list || window.lightboxPhotos || [];
      if(!currentList.length) return;
      sourceGetter = getSourceEl || (ix => masonryMain.querySelectorAll('.pin:not(.album-pin) img')[ix]);
      idx = Math.max(0, Math.min(i, currentList.length - 1));
      scale = 1; tx = 0; ty = 0;
      overlay.classList.remove('zoomed');
      imgEl.style.transition = 'none';
      imgEl.style.transform = '';
      imgEl.style.opacity = '1';
      imgEl.style.borderRadius = '';
      void imgEl.offsetWidth;
      imgEl.style.transition = '';
      render(true);
      clearTimeout(closeTimer);
      overlay.classList.remove('hdr-mask');
      overlay.classList.add('open');
    };
    function close(){
      dropBlob();
      Pano.close();
      if(shareOn) shareEnded();
      hdrSeq++;
      if(HDR_CTRL && hdrLevel > 0){
        overlay.classList.add('hdr-mask');
        imgEl.style.opacity = '0';
        setTimeout(hdrOff, 150);
        closeTimer = setTimeout(()=>{
          overlay.classList.remove('open', 'zoomed');
          setTimeout(()=>{ overlay.classList.remove('hdr-mask'); }, 350);
        }, 430);
      } else {
        hdrOff();
        overlay.classList.remove('open', 'zoomed');
      }
    }
    const slotW = ()=> stage.clientWidth || window.innerWidth;
    function setTrack(dx, animate){
      track.style.transition = animate
        ? 'transform .34s cubic-bezier(0.32,0.72,0,1)'
        : 'none';
      track.style.transform = `translate3d(${-slotW() + dx}px,0,0)`;
    }
    function fillNeighbours(){
      const before = currentList[idx - 1], after = currentList[idx + 1];
      [[prevImgEl, before], [nextImgEl, after]].forEach(([el, p])=>{
        if(p){ if(el.src !== p.imageUrl) setSrc(el, p.imageUrl, false); el.style.visibility = ''; }
        else { el.removeAttribute('src'); el.style.visibility = 'hidden'; }
      });
    }
    let sliding = false;
    function slideTo(nextIdx){
      if(sliding || nextIdx < 0 || nextIdx >= currentList.length) return;
      sliding = true;
      const dir = nextIdx < idx ? 1 : -1;
      setTrack(dir * slotW(), true);
      setTimeout(()=>{
        idx = nextIdx;
        const p = currentList[idx];
        ++hdrSeq;
        ++fullSeq;
        hdrOff();
        imgEl.style.transition = 'none';
        imgEl.style.transform = '';
        imgEl.style.opacity = '1';
        setSrc(imgEl, srcFor(p), isOriginal(p, srcFor(p)));
        imgEl.alt = p.caption || '';
        void imgEl.offsetWidth;
        imgEl.style.transition = '';
        syncMetaWidth();
        renderChrome();
        sliding = false;
      }, 340);
    }
    function goPrev(){ slideTo(idx - 1); }
    function goNext(){ slideTo(idx + 1); }

    prevBtn.addEventListener('click', goPrev);
    nextBtn.addEventListener('click', goNext);
    closeBtn.addEventListener('click', close);
    downloadBtn.addEventListener('click', ()=>{
      const p = currentList[idx];
      if(!p || !p.originalUrl) return;
      const a = document.createElement('a');
      a.href = blobFor(p) || p.originalUrl;
      a.download = p.originalName || '';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if(!downloadBtn.classList.contains('compact')){
        downloadBtn.classList.remove('attract');
        downloadBtn.classList.add('compact');
        try{ localStorage.setItem('lbHasDownloaded', '1'); }catch(err){}
      }
    });
    overlay.addEventListener('click', e=>{ if(e.target === overlay) close(); });
    stage.addEventListener('click', e=>{ if(e.target === stage) close(); });
    let slotDownX = 0, slotDownY = 0;
    track.addEventListener('pointerdown', e=>{ slotDownX = e.clientX; slotDownY = e.clientY; });
    track.addEventListener('click', e=>{
      if(!e.target.classList || !e.target.classList.contains('lb-slot')) return;
      if(Math.hypot(e.clientX - slotDownX, e.clientY - slotDownY) > 8) return;
      close();
    });

    window.addEventListener('keydown', e=>{
      if(!overlay.classList.contains('open')) return;
      if(e.key === 'Escape') close();
      if(e.key === 'ArrowLeft') goPrev();
      if(e.key === 'ArrowRight') goNext();
    });

    const ZOOM_MAX = 4, ZOOM_DOUBLE = 2.5;
    let scale = 1, tx = 0, ty = 0;

    function applyZoom(animate){
      imgEl.style.transition = animate
        ? 'opacity .22s ease, transform .26s cubic-bezier(0.32,0.72,0,1)'
        : 'opacity .22s ease, transform 0s';
      imgEl.style.transform = (scale === 1 && !tx && !ty)
        ? ''
        : `translate(${tx}px, ${ty}px) scale(${scale})`;
      overlay.classList.toggle('zoomed', scale > 1.01);
    }

    function clampPan(){
      const w = imgEl.offsetWidth * scale, h = imgEl.offsetHeight * scale;
      const maxX = Math.max(0, (w - stage.clientWidth) / 2);
      const maxY = Math.max(0, (h - stage.clientHeight) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    }

    function zoomAt(next, px, py, animate){
      next = Math.max(1, Math.min(ZOOM_MAX, next));
      const k = next / scale;
      const r = stage.getBoundingClientRect();
      const cx = r.left + r.width / 2 + tx;
      const cy = r.top + r.height / 2 + ty;
      tx -= (k - 1) * (px - cx);
      ty -= (k - 1) * (py - cy);
      scale = next;
      clampPan();
      applyZoom(animate);
    }

    function resetZoom(animate){
      scale = 1; tx = 0; ty = 0;
      applyZoom(animate);
    }
    const isZoomed = () => scale > 1.01;

    let sx = 0, sy = 0, sdx = 0, sdy = 0, dragging = false, axis = null;

    function dismissToSource(){
      const heldTransform = imgEl.style.transform;
      imgEl.style.transition = 'none';
      imgEl.style.transform = '';
      const base = imgEl.getBoundingClientRect();
      imgEl.style.transform = heldTransform;
      void imgEl.offsetWidth;

      let target = null;
      const srcEl = sourceGetter ? sourceGetter(idx) : null;
      if(srcEl){
        const r = srcEl.getBoundingClientRect();
        if(r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < window.innerHeight) target = r;
      }

      imgEl.style.transition = 'transform .34s cubic-bezier(0.32,0.72,0,1), opacity .26s ease .12s, border-radius .34s ease';
      if(target){
        const s = Math.max(target.width / base.width, 0.05);
        const tx = (target.left + target.width/2) - (base.left + base.width/2);
        const ty = (target.top + target.height/2) - (base.top + base.height/2);
        imgEl.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
        imgEl.style.borderRadius = `${Math.min(16 / s, base.width / 2)}px`;
      } else {
        imgEl.style.transform = `translate(${sdx}px, ${sdy}px) scale(0.25)`;
      }
      imgEl.style.opacity = '0';
      close();

      setTimeout(()=>{
        overlay.style.background = '';
        imgEl.style.transition = 'none';
        imgEl.style.transform = '';
        imgEl.style.opacity = '1';
        imgEl.style.borderRadius = '';
      }, 400);
    }

    let pinching = false, pinchDist0 = 0, pinchScale0 = 1;
    let panning = false, panX0 = 0, panY0 = 0, panTx0 = 0, panTy0 = 0;

    const touchDist = (t)=> Math.hypot(
      t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY
    );
    const touchMid = (t)=> ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2
    });

    stage.addEventListener('touchstart', e=>{
      if(e.touches.length === 2){
        pinching = true; dragging = false; panning = false;
        pinchDist0 = touchDist(e.touches);
        pinchScale0 = scale;
        imgEl.style.transition = 'none';
        return;
      }
      if(isZoomed()){
        panning = true; dragging = false;
        panX0 = e.touches[0].clientX; panY0 = e.touches[0].clientY;
        panTx0 = tx; panTy0 = ty;
        imgEl.style.transition = 'none';
        return;
      }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      sdx = 0; sdy = 0; axis = null; dragging = true;
      imgEl.style.transition = 'none';
    }, {passive:true});

    stage.addEventListener('touchmove', e=>{
      if(pinching && e.touches.length === 2){
        const mid = touchMid(e.touches);
        zoomAt(pinchScale0 * (touchDist(e.touches) / pinchDist0), mid.x, mid.y, false);
        return;
      }
      if(panning){
        tx = panTx0 + (e.touches[0].clientX - panX0);
        ty = panTy0 + (e.touches[0].clientY - panY0);
        clampPan();
        applyZoom(false);
        return;
      }
      if(!dragging) return;
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if(axis === null){
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if(axis === 'x'){
        sdx = dx;
        const atEdge = (idx === 0 && dx > 0) || (idx === currentList.length - 1 && dx < 0);
        setTrack(atEdge ? dx * 0.32 : dx, false);
      } else {
        sdx = dx; sdy = dy;
        const progress = Math.min(Math.hypot(dx, dy) / 300, 1);
        imgEl.style.transform = `translate(${dx}px, ${dy}px) scale(${1 - progress * 0.3})`;
        overlay.style.background = `rgba(10,8,6,${0.92 * (1 - progress * 0.8)})`;
      }
    }, {passive:true});

    stage.addEventListener('touchend', e=>{
      if(pinching){
        if(e.touches.length === 0){
          pinching = false;
          if(scale < 1.05) resetZoom(true); else { clampPan(); applyZoom(true); }
        }
        return;
      }
      if(panning){
        if(e.touches.length === 0) panning = false;
        return;
      }
      dragging = false;
      if(axis === 'x'){
        overlay.style.background = '';
        imgEl.style.transition = '';
        const need = Math.min(slotW() * 0.18, 60);
        if(sdx < -need && idx < currentList.length - 1) goNext();
        else if(sdx > need && idx > 0) goPrev();
        else setTrack(0, true);
      } else if(axis === 'y'){
        if(Math.hypot(sdx, sdy) > 90){
          dismissToSource();
        } else {
          overlay.style.background = '';
          imgEl.style.transition = '';
          imgEl.style.transform = '';
        }
      } else {
        overlay.style.background = '';
      }
    });

    let lastTap = 0, lastTapX = 0, lastTapY = 0;
    stage.addEventListener('touchend', e=>{
      if(pinching || panning) return;
      const t = e.changedTouches[0];
      if(!t) return;
      const now = Date.now();
      const near = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 30;
      if(now - lastTap < 300 && near){
        if(isZoomed()) resetZoom(true);
        else zoomAt(ZOOM_DOUBLE, t.clientX, t.clientY, true);
        lastTap = 0;
      }else{
        lastTap = now; lastTapX = t.clientX; lastTapY = t.clientY;
      }
    });
    imgEl.addEventListener('dblclick', e=>{
      e.preventDefault();
      if(isZoomed()) resetZoom(true);
      else zoomAt(ZOOM_DOUBLE, e.clientX, e.clientY, true);
    });

    stage.addEventListener('wheel', e=>{
      if(!overlay.classList.contains('open')) return;
      e.preventDefault();
      zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY, false);
      if(!isZoomed()) resetZoom(false);
    }, {passive:false});

    stage.addEventListener('mousedown', e=>{
      if(!isZoomed()) return;
      e.preventDefault();
      panning = true;
      panX0 = e.clientX; panY0 = e.clientY; panTx0 = tx; panTy0 = ty;
      imgEl.style.transition = 'none';
    });
    window.addEventListener('mousemove', e=>{
      if(!panning) return;
      tx = panTx0 + (e.clientX - panX0);
      ty = panTy0 + (e.clientY - panY0);
      clampPan();
      applyZoom(false);
    });
    window.addEventListener('mouseup', ()=>{ panning = false; });
  })();

  function startGalleryListening(){
    try{
      onSnapshot(query(collection(db, 'gallery'), orderBy('uploadedAt', 'desc')), (snap)=>{
        galleryPhotos = [];
        snap.forEach(d=>{
          const data = d.data();
          if(data.deletedAt) return;
          galleryPhotos.push({ id:d.id, ...data });
        });
        cacheImages(galleryPhotos.map(p=> p.imageUrl));
        renderGallery();
        shareTick('gallery');
      }, ()=>{
        masonryMain.innerHTML = '<div class="cal-empty">還沒有上傳照片，敬請期待</div>';
        if(shareKind === 'photo') shareFailed();
      });
      onSnapshot(collection(db, 'albums'), (snap)=>{
        galleryAlbums = [];
        snap.forEach(d=> galleryAlbums.push({ id:d.id, ...d.data() }));
        renderGallery();
        shareTick('albums');
      }, ()=>{ if(shareKind === 'album') shareFailed(); });
    }catch(err){
      masonryMain.innerHTML = '<div class="cal-empty">還沒有上傳照片，敬請期待</div>';
      if(shareKind !== 'ref') shareFailed();
    }
  }
  startGalleryListening();

  const avatarImgEl = document.getElementById('avatarImg');
  const pfpCreditEl = document.getElementById('pfpCredit');
  window.avatarLib = [];
  window.avatarIndex = 0;
  let avatarSwapToken = 0;

  function applyAvatar(){
    if(window.eggStage && window.eggStage !== 0) return;

    const myToken = ++avatarSwapToken;

    if(!window.avatarLib.length){
      avatarImgEl.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23E8DCC8'/%3E%3C/svg%3E";
      pfpCreditEl.textContent = '';
      return;
    }
    const a = window.avatarLib[window.avatarIndex % window.avatarLib.length];
    avatarImgEl.style.opacity = '0';
    setTimeout(async ()=>{
      if(myToken !== avatarSwapToken) return;
      if(window.eggStage && window.eggStage !== 0) return;
      const src = a.imageUrl;
      try{ const pre = new Image(); pre.src = src; await pre.decode(); }catch(err){}
      if(myToken !== avatarSwapToken) return;
      if(window.eggStage && window.eggStage !== 0) return;
      avatarImgEl.src = src;
      pfpCreditEl.textContent = a.artist ? `PFP by ${a.artist}` : '';
      avatarImgEl.style.opacity = '1';
      const cloneImg = document.getElementById('avatarImgClone');
      const clonePfp = document.getElementById('pfpCreditClone');
      if(cloneImg) cloneImg.src = src;
      if(clonePfp) clonePfp.textContent = a.artist ? `PFP by ${a.artist}` : '';
      if(typeof window.setFavicon === 'function') window.setFavicon(src);
    }, 70);
  }

  window.cycleAvatar = function(){
    if(!window.avatarLib.length) return;
    if(window.eggStage && window.eggStage !== 0) return;
    window.avatarIndex = (window.avatarIndex + 1) % window.avatarLib.length;
    applyAvatar();
  };
  window.restoreCurrentAvatar = function(){
    applyAvatar();
  };

  const _preloadSeen = new Set();
  const _preloadQueue = [];
  let _preloadStarted = false;
  let _preloadActive = false;
  function pumpPreload(){
    if(_preloadActive || !_preloadStarted) return;
    const url = _preloadQueue.shift();
    if(!url) return;
    _preloadActive = true;
    const img = new Image();
    const done = ()=>{ _preloadActive = false; setTimeout(pumpPreload, 50); };
    img.onload = done; img.onerror = done;
    img.src = url;
  }
  function cacheImages(urls){
    urls.forEach(url=>{
      if(!url || _preloadSeen.has(url)) return;
      _preloadSeen.add(url);
      _preloadQueue.push(url);
    });
    pumpPreload();
  }
  function startPreload(){ _preloadStarted = true; pumpPreload(); }
  if(document.readyState === 'complete') setTimeout(startPreload, 800);
  else window.addEventListener('load', ()=> setTimeout(startPreload, 800));

  try{
    const avatarQ = query(collection(db, 'avatars'), orderBy('order', 'asc'));
    onSnapshot(avatarQ, (snap)=>{
      const list = [];
      snap.forEach(d=> list.push(d.data()));
      window.avatarLib = list;
      if(window.avatarIndex >= list.length) window.avatarIndex = 0;
      cacheImages(list.map(a=> a.imageUrl));
      applyAvatar();
    }, ()=>{ applyAvatar(); });
  }catch(err){
    applyAvatar();
  }

  window.aboutModals = window.aboutModals || {};
  try{
    onSnapshot(doc(db, 'settings', 'aboutModals'), (snap)=>{
      window.aboutModals = snap.exists() ? snap.data() : {};
    });
  }catch(err){}

  try{
    onSnapshot(doc(db, 'profile', 'main'), (snap)=>{
      const data = snap.exists() ? snap.data() : {};
      window.currentSubtitle = data.subtitle || '';
      window.currentBio = data.bio || '';
      if(!window.eggStage || window.eggStage === 0){
        const subEl = document.getElementById('subText');
        const subCloneEl = document.getElementById('subTextClone');
        if(subEl) subEl.textContent = window.currentSubtitle;
        if(subCloneEl) subCloneEl.textContent = window.currentSubtitle;
      }
    });
  }catch(err){}

  function applyCustomTheme(hex1, hex2, hex3){
    if(!hex1 || !hex2 || !hex3) return;
    try{ localStorage.setItem('julian_theme_colors', JSON.stringify({color1:hex1, color2:hex2, color3:hex3})); }catch(err){}
    window.deriveTheme(hex1, hex2, hex3);
  }

  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
      try{
        const cached = localStorage.getItem('julian_theme_colors');
        if(!cached) return;
        const t = JSON.parse(cached);
        if(t.color1 && t.color2 && t.color3) applyCustomTheme(t.color1, t.color2, t.color3);
      }catch(err){}
    });
  }

  try{
    onSnapshot(doc(db, 'settings', 'theme'), (snap)=>{
      if(!snap.exists()) return;
      const d = snap.data();
      if(!d.color1 || !d.color2 || !d.color3){
        try{ localStorage.removeItem('julian_theme_colors'); }catch(err){}
        return;
      }
      applyCustomTheme(d.color1, d.color2, d.color3);
    });
  }catch(err){}

  window.eggConfig = window.eggConfig || {
    avatar: '',
    sound: '',
    stage2Url: 'https://youtu.be/dQw4w9WgXcQ?si=Ba_6rd1HG80EjtXY'
  };
  try{
    onSnapshot(doc(db, 'settings', 'easterEgg'), (snap)=>{
      if(!snap.exists()) return;
      const d = snap.data();
      if(d.stage1AvatarUrl){
        window.eggConfig.avatar = d.stage1AvatarUrl;
        cacheImages([d.stage1AvatarUrl]);
      }
      if(d.stage1SoundUrl){
        window.eggConfig.sound = d.stage1SoundUrl;
        const audioEl = document.getElementById('eggAudio');
        if(audioEl) audioEl.src = d.stage1SoundUrl;
      }
      if(d.stage2Url) window.eggConfig.stage2Url = d.stage2Url;
    });
  }catch(err){}

  window.fursonaList = [];
  try{
    const fursonaQ = query(collection(db, 'fursonas'), orderBy('order', 'asc'));
    onSnapshot(fursonaQ, (snap)=>{
      const list = [];
      snap.forEach(d=> list.push({ id:d.id, ...d.data() }));
      window.fursonaList = list;
      cacheImages(list.map(f=> f.imageUrl));
      shareTick('fursonas');
      if(list.length){
        const tileRef = document.getElementById('tileRef');
        const tileRefImg = document.getElementById('tileRefImg');
        if(tileRef && tileRefImg){
          tileRefImg.onload = ()=> tileRefImg.classList.add('loaded');
          tileRefImg.src = list[0].imageUrl;
          tileRef.classList.add('has-img');
        }
      }
    });
  }catch(err){}

  window.ocArtList = [];
  try{
    const ocArtQ = query(collection(db, 'ocArt'), orderBy('order', 'asc'));
    onSnapshot(ocArtQ, (snap)=>{
      const list = [];
      snap.forEach(d=> list.push(d.data()));
      window.ocArtList = list;
      cacheImages(list.map(a=> a.imageUrl));
    });
  }catch(err){}

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  const NOWPLAYING_API = 'https://novatorem-39a6-nine.vercel.app/api/nowplaying';
  let npData = null;
  let npFetchTime = 0;

  function formatMs(ms){
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function renderNowPlaying(){
    document.getElementById('npSkeleton').style.display = 'none';

    ['', 'Clone'].forEach(suf=>{
      const card = document.getElementById('npCard2' + suf);
      const fallback = document.getElementById('npFallback' + suf);
      const label = document.getElementById('npLabel' + suf);
      const listenBtn = document.getElementById('npListenBtn' + suf);

      if(!npData || !npData.has_track){
        card.style.display = 'none';
        if(listenBtn) listenBtn.style.display = 'none';
        fallback.style.display = 'flex';
        label.textContent = '🎧 Spotify';
        return;
      }

      fallback.style.display = 'none';
      card.style.display = 'flex';
      if(listenBtn) listenBtn.style.display = 'flex';

      const progressRow = document.getElementById('npProgressRow' + suf);
      const pauseBadge = document.getElementById('npPauseBadge' + suf);

      if(npData.is_last_played){
        label.textContent = '🎧 最後播放：';
        if(pauseBadge) pauseBadge.style.display = 'none';
        if(progressRow) progressRow.style.display = 'none';
      } else {
        label.textContent = npData.is_playing ? '🎧 目前在聽' : '🎧 已暫停';
        if(pauseBadge) pauseBadge.style.display = npData.is_playing ? 'none' : 'flex';
        if(progressRow) progressRow.style.display = 'flex';
      }

      document.getElementById('npArt' + suf).src = npData.album_art || '';
      document.getElementById('npTitle2' + suf).textContent = npData.title || '';
      document.getElementById('npArtist2' + suf).textContent = npData.artist || '';
      document.getElementById('npDuration' + suf).textContent = formatMs(npData.duration_ms);
      if(listenBtn) listenBtn.href = npData.song_url || '#';
    });

    tickProgress();
  }

  function tickProgress(){
    if(!npData || !npData.has_track || npData.is_last_played) return;
    let elapsed = npData.progress_ms || 0;
    if(npData.is_playing){
      elapsed += (Date.now() - npFetchTime);
    }
    elapsed = Math.min(elapsed, npData.duration_ms || 0);
    const pct = npData.duration_ms ? (elapsed / npData.duration_ms * 100) : 0;
    ['', 'Clone'].forEach(suf=>{
      const fill = document.getElementById('npFill' + suf);
      const elapsedEl = document.getElementById('npElapsed' + suf);
      if(fill) fill.style.width = pct + '%';
      if(elapsedEl) elapsedEl.textContent = formatMs(elapsed);
    });
  }

  async function fetchNowPlaying(){
    try{
      const res = await fetch(NOWPLAYING_API, { cache: 'no-store' });
      npData = await res.json();
      npFetchTime = Date.now();
    }catch(err){
      npData = null;
    }
    renderNowPlaying();
  }

  fetchNowPlaying();
  setInterval(()=>{ if(!document.hidden) fetchNowPlaying(); }, 15000);
  setInterval(()=>{ if(!document.hidden) tickProgress(); }, 1000);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) fetchNowPlaying(); });

  (function(){
    const eA = `
-==-------===========-:-=----=====--------.....................:--::::::::------------------------------------
-==-------===========-:-==---=======------.................    :--::::::::-----------------------------------=
-==-------===========-:-==---=========----.................... :----::::::-----------------------------------=
-==-------===========-:-==---============-...................  .------::::-----------------------------------=
-==-------===========---===--============-.....:................--------::--------------------------======-===
-==-------===========---===--============-.......................-------::---------------------=--============
-==-------===========--=++=--============---:::::...............-:------::--------------========-=============
===-------============:--:::-=======================-------:::::::------::-------------=======================
===-------=+==++==++-:.:::::::::-=====================---------:.:------::------------========================
===-------=++=++++=:..::-------:::=====================---------::-------:----------==========================
=+=-------=+++++++-..:::-------=---======================----------------:------==============================
=+==-----==++++++=..::--------=============================--------------:-=---===============================
=++=----===+++++++.::::--===-====++========================-------:::.::::-===================================
=++=--=====+++++++:::::--=+==++==++==========================----.   ..  .:===================================
=++----====+++++++-:::--====-=====++=-------------------------==:.:--=--: :==-================================
=++=---====+++++++----=======-===============--::---------:::-==-::-=+=+=.-=. -===============================
=++----====+++++++-===+++++==========#WWWWWWW##=-=********=::-=-----=*=++-==---===============================
=++=---==-=++++*WW+==++++++========+=*#########=-=********=::-----=-=*+++=-----===============================
=++=------=**##W@@@#+++++=====----+###W########=:=********=:--=++----=+=::------==============================
*#######**##WWW@@@@@@#++===-=+***+++*#WWWWWWWWW=:=#######**+*++*+----=+*=::--------===========================
*W#WWWW###WWWWW@@@@@@@@*===*######***#W########=:=******+*#WWW###*=--+WWWW*+--------======-------=============
*#####*###WWWWW@@@@@@@@@@WW@@@@@@@*==*WW@@WWWW#=:=#****++*#WW@@W@@W*#WWWWWWW+::----=++===---------============
+***###WWWWWW@@@@W@@@@WWWWWWW@@@@@@**WWWW######+:=####*+**#WWW@WWWWWWW***+*=---:::--:-+=----------======-=====
+*###WWWWWWW@@WWWWWW@W@WWWWWW@@@@W@##WWWW######=:-****=***##W@WWWWW*=--===+-:=-====----------------------=====
+*##WWWWWWWWWWWWWWWWWWWWWWWWWW@W@W@@WWWWWWWWWWW+:=###*=--=++#W#W#+-----===-... -=--=------------------------==
+*###WW#W#######WWWWWWWWWWWWWWWWWW@W*WW#===---::.::::=++=:--+++=--------::=*+=-----------------------------===
+*###W##########WWWWWWWWWWWWWWWW#**++#W@#-:::::------+++=:::-------+#WW*+*++*++---::::----------------------==
+*##WW###########WW#WWWWWWWWWWWW===+++#W#-===========++++:::::----=###W@#####WW#-...::-----------------------=
+*##WW####***+**#WWWWWWWWWWWWWWW--==+++=--==========++***=::::::---W#*#W@W####WWW*:.:------------------------=
*###WW#**##*=**##*####W##WWWWWW*=---==++=--=========+**+=-::--=+*+=W#**#W@#**###WW#-.:::::::::----------------
+WWWWWW#**+=*******#######WWWWW++=----===::--=--:::.=:::--++*++++++WW#**#W@#***###W#=:::::::::::::::::::------
:=+*#####+=*******#######WWWWW#==+--------+++++=... :-=-=+=++*+++-=WWW#***#W#*****#*#+::::::::::::::::::....::
::::..:::=**########*####WWWWW#--+=-------=+++=+-.   :===+=====--==#WWW##***WW*+****#W+:::::::::::::::::::::::
::::::-:=**********#####WWWWW###==:--:::---=+++++::   .:-==-------:*WWWW##*+++*+++++=-==-::::::----------:::::
:::::::-+********####WWWWWW###WW+=+*+-:::--::=****=::::::::::::::::=***+++=-::-=====::-==------=--------------
:-::::=+*++*********##WWWW##WW@@#=-----:::----*+++-:---------------:-=++++-:.:----==-:::--=---:::::::---------
:--::=+*+****##WWWWWWWWW##WWWWWW*=**++*-:---------==============-::::...:::--:::::--===-::-==---------:::::::-
:-::=+++++++***##W#####WWWWWWWWW=------------=======------====+=-:---=-------::::::----::::::::---------------
::::++***###########WWWWWWWWWW@*:-------=======------==========================---::-:::----------------------
.::-=+**#####WWWWWWWW###WWWWWWW=---========------==============---===================-------------------------
..:==+****##*+++++++**#WWWWWWW#---======--------===------------:--=======================---------------------
 ..:=++**+-------=======+*####*--===------------------------::::--==========================------------------
`;
    const eL = [43,33,78,32,61,17,1,22,71,17,1,22,58,10,21,22,48,20,4,2,15,33,60,17,5,35,57,2,30,50,23,12,30,21,46,15,30,16,50,7,86,3,7,7,7,84,20,6,9,24,10,7,38,3,7,7,6,2,34,5,10,47,7,7,39,1,2,2,3,3,47,7,7,15,8,14,3,3,5,1,35,25,14,10,1,1,1,8,1,3,7,1,52,4,3,1,3,13,1,1,10,1,1,1,8,1,3,7,4,39,3,6,1,2,3,3,1,5,8,1,1,11,1,1,1,1,8,1,2,2,2,4,3,8,31,2,14,5,1,4,3,7,2,9,1,1,1,7,2,6,5,3,7,31,3,20,1,3,1,6,4,7,2,1,1,1,9,4,3,4,4,2,35,1,15,18,1,3,2,6,1,1,1,1,5,2,2,8,2,7,1,7,4,23,3,3,8,21,2,5,5,1,1,1,4,3,2,11,5,1,10,26,2,9,23,9,3,1,1,1,4,2,4,7,1,7,36,1,2,17,27,1,1,1,4,1,3,2,5,1,9,4,32,1,2,26,7,1,3,4,10,3,3,4,11,2,1,30,3,1,21,10,2,4,3,12,4,9,1,1,3,8,32,1,16,15,6,3,12,4,9,1,3,3,7,1,5,25,1,11,4,13,3,3,5,11,2,4,1,9,2,2,4,7,19,10,1,10,9,9,2,1,21,3,2,4,2,2,1,2,3,3,8,28,1,6,3,11,6,4,2,9,3,3,4,7,8,4,2,11,1,27,2,7,1,14,6,4,7,5,1,5,4,8,2,5,3,2,7,1,1,34,1,13,8,2,2,8,5,1,5,13,11,7,1,1,32,1,15,7,1,5,6,6,8,9,1,1,6,5,6,3,30,1,10,13,1,5,8,1,4,1,16,1,4,3,4,5,3,24,6,2,14,10,1,1,12,4,20,5,7,3,5,5,21,2,7,18,1,2,1,3,21,4,5,7,35,4,1,10,9,8,24,22,6,6,24,1,2,16,9,1,9,41,29,3,2,2,18,6,1,3,76,3,3,4,2,11,8,3,29,49,2,1,2,4,11,3,2,4,1,80];
    const eC = ["#655","#422","#654","#422","#654","#965","#654","#422","#654","#965","#654","#422","#654","#877","#754","#422","#654","#877","#754","#a76","#754","#432","#755","#a76","#765","#533","#765","#633","#865","#544","#767","#433","#876","#543","#766","#543","#865","#543","#766","#432","#755","#987","#755","#987","#432","#754","#877","#432","#755","#a76","#765","#433","#755","#987","#755","#988","#432","#755","#a76","#765","#422","#766","#a88","#644","#966","#644","#321","#654","#966","#532","#766","#a88","#755","#a76","#767","#544","#865","#533","#976","#421","#644","#877","#b76","#dbd","#769","#546","#878","#bac","#778","#544","#865","#c88","#965","#a88","#cac","#a89","#866","#b76","#b89","#868","#bac","#769","#546","#868","#b9c","#779","#445","#765","#c98","#965","#988","#755","#878","#a9b","#cbe","#fdf","#dcc","#a88","#a75","#754","#a77","#dbc","#abe","#77a","#546","#769","#bad","#77a","#446","#756","#a89","#654","#976","#743","#766","#aaa","#cbd","#fdf","#cbb","#a87","#964","#b88","#bab","#dde","#77a","#446","#879","#cbe","#99d","#99a","#755","#a87","#533","#765","#bab","#dce","#caa","#976","#c99","#ebc","#baa","#dcd","#abd","#669","#446","#768","#aac","#ece","#cab","#865","#ecc","#b9a","#755","#a9a","#cbd","#fdf","#baa","#977","#dcc","#edf","#bce","#77a","#446","#768","#bad","#88b","#b9b","#ecd","#caa","#fdd","#978","#645","#a88","#766","#989","#bac","#ccf","#fdf","#baa","#ecc","#bcd","#78a","#446","#768","#cbe","#9ad","#a9a","#dcd","#caa","#967","#644","#877","#a9b","#cbe","#fdf","#dcc","#abd","#77a","#436","#668","#aac","#77a","#bac","#ede","#caa","#977","#754","#888","#bac","#ccf","#fdf","#88b","#436","#768","#cbd","#769","#656","#977","#dbb","#a88","#855","#411","#654","#878","#aac","#cbf","#fde","#b99","#ecc","#878","#655","#a88","#643","#a86","#754","#ba9","#976","#643","#766","#889","#bad","#ede","#dbb","#b98","#fdd","#755","#a88","#543","#854","#b87","#ebb","#a99","#644","#889","#aad","#dcd","#976","#ebb","#855","#a88","#644","#966","#dbb","#ede","#cab","#756","#423","#654","#889","#bad","#a9a","#cbd","#fde","#755","#a75","#743","#866","#a99","#766","#533","#ecd","#bab","#ede","#cab","#534","#765","#99a","#bbe","#a9a","#cbd","#fde","#caa","#976","#b9a","#767","#544","#866","#b99","#867","#ecd","#bab","#ece","#bab","#655","#98a","#dcf","#cbc","#a8a","#cbc","#fde","#a98","#865","#633","#766","#543","#767","#a99","#dcd","#b9b","#dcd","#877","#533","#767","#b9b","#868","#b9b","#dcd","#876","#743","#a77","#766","#322","#656","#988","#755","#dcd","#b9b","#ede","#a9a","#dcd","#a89","#534","#867","#a9b","#dbc","#755","#a77","#744","#a88","#655","#323","#877","#dbc","#a9a","#ecd","#a89","#544","#867","#b9b","#ece","#dbb","#966","#643","#976","#544","#866","#544","#baa","#ecd","#bab","#a88","#756","#643","#756","#a8a","#cbd","#fdd","#a88","#744","#977","#caa","#877","#433","#876","#ba9","#978","#655","#976","#533","#865","#433","#868","#a9b","#dce","#dbb","#977","#754","#b99","#744","#978","#544","#865","#532","#865","#543","#978","#a9b","#dbe","#b99","#976","#ca9","#a76","#754","#a64","#743","#432","#754","#433","#867","#a8a","#bad","#ece","#976","#853","#542","#855","#532","#545","#989","#bac","#ece","#baa","#643","#965","#643","#333","#657","#98a","#bad","#ece","#866","#643","#964","#323","#768","#a9b","#cbe","#a9b","#ebd","#654","#965","#642","#222","#435","#768","#98b","#668","#966","#a89","#dbd","#baa","#754"];
    let f = '', p = 0;
    for(const n of eL){ f += '%c' + eA.slice(p, p + n); p += n; }
    console.log(f + '%c\n剛才我在架設網站，你偷看了罷(惱\n',
      ...eC.map(x => 'font:10px/10px Consolas,Menlo,monospace;background:#161311;color:' + x),
      'font:15px/2.6 system-ui;color:#B85C34;font-weight:700;padding-left:186px');
  })();
