const track = document.getElementById('track');
  const dots = document.querySelectorAll('.dots .dot');
  const allGlass = document.querySelectorAll('.glass');
  const realPages = document.querySelectorAll('#p1 .glass, #p2 .glass, #p3 .glass, #p4 .glass');

  let current = 0;
  const total = 4;
  const SLIDE = 100/6;
  let looping = false;

  function playCardFrost(skipIndex){
    allGlass.forEach(g=>{
      if(skipIndex !== undefined && realPages[skipIndex] === g) return;
      g.classList.remove('frosting');
      void g.offsetWidth;
      g.classList.add('frosting');
    });
  }

  function blurOutgoing(index, amount){
    if(index === undefined || index === null) return;
    const g = realPages[index];
    if(!g) return;
    clearTimeout(g._blurTimer);
    g.style.transition = '';
    g.style.filter = `blur(${amount}px)`;
    g._blurTimer = setTimeout(()=>{ g.style.filter = ''; }, 650);
  }

  function replayEntrance(i){
    if(i === 0 && typeof resetEgg === 'function') resetEgg();
  }

  function setDot(i){
    dots.forEach((d,idx)=> d.classList.toggle('active', idx===i));
  }

  function applyTransform(){
    track.style.transform = `translateX(-${(current+1) * SLIDE}%)`;
  }

  function resetWallScroll(){
    document.querySelectorAll('.glass.top').forEach(el=>{ el.scrollTop = 0; });
  }
  function goTo(i, fromDrag){
    if(looping) return;
    if(i >= total){ loopForward(fromDrag); return; }
    if(i < 0){ loopBackward(fromDrag); return; }
    const prev = current;
    const jump = Math.abs(i - prev) > 1;
    current = i;
    resetWallScroll();
    if(prev === 0 && current !== 0 && typeof resetEgg === 'function') resetEgg();
    if(!jump){
      playCardFrost(current);
      if(prev !== current && !fromDrag) blurOutgoing(prev, 10);
      applyTransform();
    } else {
      track.style.transition = 'none';
      applyTransform();
      void track.offsetWidth;
      track.style.transition = '';
      const g = realPages[current];
      if(g){
        g.classList.remove('jumped');
        void g.offsetWidth;
        g.classList.add('jumped');
      }
    }
    setDot(current);
    if(prev !== current) replayEntrance(current);
  }

  function loopForward(fromDrag){
    looping = true;
    playCardFrost(0);
    if(!fromDrag) blurOutgoing(total-1, 10);
    track.style.transition = '';
    track.style.transform = `translateX(-${(total+1) * SLIDE}%)`;
    setDot(0);
    const onEnd = (ev)=>{
      if(ev.propertyName !== 'transform') return;
      track.removeEventListener('transitionend', onEnd);
      track.style.transition = 'none';
      current = 0;
      applyTransform();
      resetWallScroll();
      requestAnimationFrame(()=> requestAnimationFrame(()=>{
        track.style.transition = '';
        replayEntrance(0);
        looping = false;
      }));
    };
    track.addEventListener('transitionend', onEnd);
  }

  function loopBackward(fromDrag){
    looping = true;
    if(typeof resetEgg === 'function') resetEgg();
    playCardFrost(total-1);
    if(!fromDrag) blurOutgoing(0, 10);
    track.style.transition = '';
    track.style.transform = `translateX(0%)`;
    setDot(total-1);
    const onEnd2 = (ev)=>{
      if(ev.propertyName !== 'transform') return;
      track.removeEventListener('transitionend', onEnd2);
      track.style.transition = 'none';
      current = total-1;
      applyTransform();
      resetWallScroll();
      requestAnimationFrame(()=> requestAnimationFrame(()=>{
        track.style.transition = '';
        replayEntrance(total-1);
        looping = false;
      }));
    };
    track.addEventListener('transitionend', onEnd2);
  }

  dots.forEach(d => d.addEventListener('click', ()=>{
    if(typeof cancelHintTimer === 'function') cancelHintTimer();
    goTo(parseInt(d.dataset.i));
  }));

  const app = document.getElementById('app');
  let startX = 0, startY = 0, dragX = 0, dragY = 0, isDragging = false, lockAxis = null;
  let dragStartAtBottom = false;

  function getActiveGlass(){
    const activeSlide = track.children[current + 1];
    return activeSlide ? activeSlide.querySelector('.glass') : null;
  }

  let dragGlass = null;

  function dragStart(x, y){
    if(looping || calOpen) return;
    if(typeof cancelHintTimer === 'function') cancelHintTimer();
    startX = x; startY = y; dragX = 0; dragY = 0;
    isDragging = true; lockAxis = null;
    const g = getActiveGlass();
    dragStartAtBottom = g ? (g.scrollHeight - g.scrollTop - g.clientHeight <= 2) : true;
    track.style.transition = 'none';
    dragGlass = g;
    if(dragGlass){
      dragGlass.style.transition = 'none';
      dragGlass._blurStep = null;
    }
  }
  function dragMove(x, y){
    if(!isDragging) return;
    const dx = x - startX;
    const dy = y - startY;
    if(lockAxis === null){
      lockAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if(lockAxis === 'y'){ dragY = dy; return; }
    dragX = dx;
    const basePercent = -((current+1) * SLIDE);
    const dragPercent = (dx / window.innerWidth) * SLIDE;
    track.style.transform = `translateX(${basePercent + dragPercent}%)`;

    if(dragGlass){
      const frac = Math.min(1, Math.abs(dx) / (window.innerWidth * 0.15));
      const step = Math.round(frac * 20) / 2;
      if(step !== dragGlass._blurStep){
        dragGlass._blurStep = step;
        dragGlass.style.filter = `blur(${step}px)`;
      }
    }
  }
  function dragEnd(){
    if(!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    const threshold = window.innerWidth * 0.15;
    const g = dragGlass;
    if(g) g.style.transition = '';

    if(lockAxis === 'x'){
      const navigating = dragX < -threshold || dragX > threshold;
      if(g){
        g.style.filter = navigating ? 'blur(10px)' : 'blur(0px)';
        clearTimeout(g._blurTimer);
        g._blurTimer = setTimeout(()=>{ g.style.filter = ''; }, navigating ? 650 : 400);
      }
      if(dragX < -threshold) goTo(current+1, true);
      else if(dragX > threshold) goTo(current-1, true);
      else goTo(current, true);
    } else if(lockAxis === 'y'){
      if(g) g.style.filter = '';
      if(dragY < -70 && dragStartAtBottom){
        openCalendar();
      }
    }
    dragGlass = null;
  }

  app.addEventListener('touchstart', e=>{ dragStart(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  app.addEventListener('touchmove', e=>{ dragMove(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  app.addEventListener('touchend', dragEnd);

  let mouseDownX = 0, mouseDownY = 0, realDrag = false;
  const DRAG_THRESHOLD = 6;

  app.addEventListener('mousedown', e=>{
    mouseDownX = e.clientX; mouseDownY = e.clientY;
    realDrag = false;
    dragStart(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', e=>{
    if(!isDragging) return;
    if(!realDrag){
      const moved = Math.hypot(e.clientX - mouseDownX, e.clientY - mouseDownY);
      if(moved < DRAG_THRESHOLD) return;
      realDrag = true;
      window._isDraggingCursor = true;
      app.style.cursor = window._cursorGrabbing || 'grabbing';
    }
    dragMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', e=>{
    if(realDrag){
      dragEnd();
      const blockClick = ev => {
        if(app.contains(ev.target)){
          ev.stopPropagation(); ev.preventDefault();
        }
        window.removeEventListener('click', blockClick, true);
      };
      window.addEventListener('click', blockClick, true);
    } else {
      isDragging = false;
      track.style.transition = '';
    }
    window._isDraggingCursor = false;
    app.style.cursor = window._cursorGrab || 'grab';
  });

  function cancelSwipe(){
    if(!isDragging) return;
    isDragging = false;
    realDrag = false;
    lockAxis = null;
    dragX = 0; dragY = 0;
    if(dragGlass){
      dragGlass.style.transition = '';
      dragGlass.style.filter = '';
      dragGlass = null;
    }
    track.style.transition = '';
    applyTransform();
    window._isDraggingCursor = false;
    app.style.cursor = window._cursorGrab || 'grab';
  }
  window.addEventListener('dragstart', cancelSwipe, true);
  window.addEventListener('dragend', cancelSwipe, true);
  window.addEventListener('blur', cancelSwipe);
  window.addEventListener('pointercancel', e=>{
    if(e.pointerType === 'mouse') cancelSwipe();
  });

  app.style.cursor = window._cursorGrab || 'grab';
  track.style.transition = 'none';
  applyTransform();
  void track.offsetWidth;
  track.style.transition = '';

  let hintCancelled = false;
  function showNextPagePeek(){
    if(hintCancelled || current !== 0 || looping || isDragging || calOpen) return;
    const base = (current + 1) * SLIDE;
    track.style.transform = `translateX(calc(-${base}% - 28px))`;
    setTimeout(()=>{
      if(current === 0 && !isDragging){
        track.style.transform = `translateX(-${base}%)`;
      }
    }, 480);
  }
  let hintTimer = setInterval(showNextPagePeek, 5000);
  function cancelHintTimer(){
    if(hintCancelled) return;
    hintCancelled = true;
    clearInterval(hintTimer);
  }
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(ev=>
    window.addEventListener(ev, cancelHintTimer, { capture:true, passive:true, once:true })
  );

  window.addEventListener('keydown', e=>{
    if(calOpen){
      if(e.key === 'ArrowDown' || e.key === 'Escape') closeCalendar();
      return;
    }
    if(e.key==='ArrowRight'){ if(typeof cancelHintTimer==='function') cancelHintTimer(); goTo(current+1); }
    if(e.key==='ArrowLeft'){ if(typeof cancelHintTimer==='function') cancelHintTimer(); goTo(current-1); }
    if(e.key==='ArrowUp') openCalendar();
  });

  function innerCanScroll(target, deltaY){
    let el = target instanceof Element ? target : null;
    while(el && el !== app){
      if(el.scrollHeight > el.clientHeight + 1){
        const oy = getComputedStyle(el).overflowY;
        if(oy === 'auto' || oy === 'scroll'){
          if(deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if(deltaY < 0 && el.scrollTop > 0) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }
  let wheelLock = false;
  app.addEventListener('wheel', e=>{
    if(wheelLock || looping || calOpen) return;
    if(e.target instanceof Element && e.target.closest('.glass.top, .masonry, .album-panel')) return;
    const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
    if(vertical && innerCanScroll(e.target, e.deltaY)) return;
    const delta = vertical ? e.deltaY : e.deltaX;
    if(Math.abs(delta) < 12) return;
    wheelLock = true;
    if(typeof cancelHintTimer === 'function') cancelHintTimer();
    if(delta > 0) goTo(current+1); else goTo(current-1);
    setTimeout(()=>{ wheelLock = false; }, 650);
  }, {passive:true});

  function freezeAfterEntrance(el){
    const isName = el.classList.contains('name');
    const animName = isName ? 'fadeZoom' : 'rise';
    const onAnimEnd = (ev)=>{
      if(ev.target !== el || ev.animationName !== animName) return;
      el.removeEventListener('animationend', onAnimEnd);
      el.classList.add(isName ? 'entered' : 'risen');
    };
    el.addEventListener('animationend', onAnimEnd);
  }
  document.querySelectorAll('.glass, .name').forEach(freezeAfterEntrance);

  const nameMain = document.querySelector('#p1 .name');
  if(nameMain){
    nameMain.style.cursor = 'pointer';
    nameMain.addEventListener('click', ()=>{
      nameMain.classList.remove('entered');
      nameMain.style.animation = 'none';
      void nameMain.offsetWidth;
      nameMain.style.animation = '';
      freezeAfterEntrance(nameMain);
    });
  }

  const avatarWrap = document.getElementById('avatarWrap');
  const avatarImg = document.getElementById('avatarImg');
  const eggAudio = document.getElementById('eggAudio');
  const subText = document.getElementById('subText');
  const EGG_SUB = '(25歲，是個老人)';

  window.setFavicon = function(url){
    if(!url) return;
    const link = document.getElementById('faviconLink');
    if(link) link.href = url;
  };

  window.setCursorColor = function(hex){
    hex = hex || '#8B4FD9';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><path d="M4 3 L26 15 L15.5 16.5 L12.5 27 Z" fill="${hex}" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const encoded = encodeURIComponent(svg);
    const dataUri = `url('data:image/svg+xml,${encoded}') 4 3, auto`;
    const grabUri = `url('data:image/svg+xml,${encoded}') 4 3, grab`;
    const grabbingUri = `url('data:image/svg+xml,${encoded}') 4 3, grabbing`;
    const pointerUri = `url('data:image/svg+xml,${encoded}') 4 3, pointer`;
    document.body.style.cursor = dataUri;
    window._cursorGrab = grabUri;
    window._cursorGrabbing = grabbingUri;
    const appEl = document.getElementById('app');
    if(appEl) appEl.style.cursor = window._isDraggingCursor ? grabbingUri : grabUri;

    let styleTag = document.getElementById('cursorPointerStyle');
    if(!styleTag){
      styleTag = document.createElement('style');
      styleTag.id = 'cursorPointerStyle';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
      a, button, .about-tile, .pin, .dot, .cal-cell, .cal-nav-btn,
      .lightbox-nav, .lightbox-close, .modal-close, .cal-handle,
      .np-listen-btn, .avatar, .name, .links a {
        cursor: ${pointerUri} !important;
      }
    `;
  };
  window.setCursorColor(getComputedStyle(document.documentElement).getPropertyValue('--rust').trim());

  window.currentSubtitle = window.currentSubtitle || '';
  window.eggStage = 0;

  window.eggConfig = window.eggConfig || {
    avatar: '',
    sound: '',
    stage2Url: 'https://youtu.be/dQw4w9WgXcQ?si=Ba_6rd1HG80EjtXY'
  };

  let eggStage = 0;
  let pressTimer = null;
  let clickCount = 0;

  function triggerStage1(){
    if(eggStage !== 0) return;
    eggStage = 1;
    window.eggStage = 1;
    try{ if(navigator.vibrate) navigator.vibrate(40); }catch(err){}
    clickCount = 0;
    if(window.eggConfig.avatar){
      const eggSrc = window.eggConfig.avatar;
      avatarImg.src = eggSrc;
      window.setFavicon(eggSrc);
    }
    avatarImg.style.opacity = '1';
    const pfpEl = document.getElementById('pfpCredit');
    if(pfpEl) pfpEl.textContent = '';
    const hintEl = document.querySelector('#p1 .hint');
    if(hintEl){ hintEl.style.transition = 'opacity .35s ease'; hintEl.style.opacity = '0'; }
    subText.textContent = EGG_SUB;
    subText.style.fontFamily = 'system-ui, sans-serif';
    if(window.eggConfig.sound){
      try{ eggAudio.currentTime = 0; eggAudio.play(); }catch(err){}
    }
  }
  function triggerStage2(){
    if(eggStage !== 1) return;
    try{ if(navigator.vibrate) navigator.vibrate([30, 40, 30]); }catch(err){}
    window.open(window.eggConfig.stage2Url, '_blank', 'noopener');
  }
  function resetEgg(){
    const wasActive = eggStage !== 0;
    eggStage = 0;
    window.eggStage = 0;
    clickCount = 0;
    clearTimeout(pressTimer);
    if(wasActive){
      if(typeof window.restoreCurrentAvatar === 'function') window.restoreCurrentAvatar();
      subText.textContent = window.currentSubtitle || '';
      subText.style.fontFamily = '';
      const hintEl = document.querySelector('#p1 .hint');
      if(hintEl) hintEl.style.opacity = '';
    }
  }
  function currentPressDuration(){
    return eggStage === 0 ? 11451 : 11000;
  }
  function startPress(e){
    e.stopPropagation();
    clearTimeout(pressTimer);
    pressTimer = setTimeout(()=>{
      if(eggStage === 0) triggerStage1();
      else if(eggStage === 1) triggerStage2();
    }, currentPressDuration());
  }
  function endPress(e){
    e.stopPropagation();
    clearTimeout(pressTimer);
  }
  function handleClick(e){
    e.stopPropagation();
    if(eggStage === 0 && typeof window.cycleAvatar === 'function'){
      window.cycleAvatar();
    }
    clickCount++;
    if(clickCount >= 11){
      clickCount = 0;
      if(eggStage === 0) triggerStage1();
      else if(eggStage === 1) triggerStage2();
    }
  }
  avatarWrap.addEventListener('mousedown', startPress);
  avatarWrap.addEventListener('touchstart', startPress, {passive:true});
  avatarWrap.addEventListener('mouseup', endPress);
  avatarWrap.addEventListener('mouseleave', endPress);
  avatarWrap.addEventListener('touchend', endPress);
  avatarWrap.addEventListener('touchcancel', endPress);
  avatarWrap.addEventListener('click', handleClick);

  window.currentBio = window.currentBio || '';
  function buildBioHtml(){
    const bio = window.currentBio && window.currentBio.trim()
      ? escapeHtmlLocal(window.currentBio)
      : '尚未填寫自介。';
    return `<div class="modal-title">自介</div><div class="bio">${bio}</div>`;
  }
  function escapeHtmlLocal(str){
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  window.aboutModals = window.aboutModals || {};

  function extractSpotifyPlaylistId(url){
    if(!url) return '';
    const m = url.match(/playlist[/:]([a-zA-Z0-9]+)/);
    return m ? m[1] : '';
  }

  function buildMusicHtml(){
    const m = window.aboutModals || {};
    const title = m.musicTitle || '最愛歌單';
    const desc = m.musicDesc || '';
    const playlistId = extractSpotifyPlaylistId(m.musicUrl);
    const embed = playlistId
      ? `<div style="border-radius:16px; overflow:hidden; border:1px solid var(--line);">
           <iframe src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0"
             width="100%" height="352" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
         </div>`
      : `<div class="bio">尚未設定歌單網址。</div>`;
    return `
      <div class="modal-title">${escapeHtmlLocal(title)}</div>
      ${desc ? `<div style="font-size:12.5px; color:var(--muted); font-weight:500; line-height:1.6; margin-bottom:14px;">${escapeHtmlLocal(desc)}</div>` : ''}
      ${embed}
    `;
  }

  function buildFursonaHtml(){
    const list = (window.fursonaList && window.fursonaList.length) ? window.fursonaList : null;
    let html = `<div class="modal-title">設定圖</div>`;
    if(list){
      html += list.map((f, idx) => `
        <img class="modal-img" data-idx="${idx}" style="cursor:pointer;" src="${f.imageUrl}" alt="" loading="lazy">
        <div style="font-size:12px; color:var(--muted); font-weight:600; margin:6px 0 16px;">${f.label ? f.label.replace(/</g,'&lt;') : ''}</div>
      `).join('');
    } else {
      html += `<div class="bio">尚未上傳設定圖。</div>`;
    }
    return html;
  }

  function buildOcArtHtml(){
    const list = (window.ocArtList && window.ocArtList.length) ? window.ocArtList : null;
    let html = `<div class="modal-title">OC 美術圖</div>`;
    if(list){
      html += list.map((a, idx) => `
        <img class="modal-img" data-idx="${idx}" style="cursor:pointer;" src="${a.imageUrl}" alt="" loading="lazy">
        <div style="font-size:12px; color:var(--muted); font-weight:600; margin:6px 0 16px;">${a.artist ? '繪師：' + a.artist.replace(/</g,'&lt;') : ''}</div>
      `).join('');
    } else {
      html += `<div class="bio">尚未上傳 OC 美術圖。</div>`;
    }
    return html;
  }

  const modalOverlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  function openModal(html){
    modalBody.innerHTML = html;
    modalOverlay.classList.add('open');
  }
  function closeModal(){
    modalOverlay.classList.remove('open');
  }
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e=>{ if(e.target === modalOverlay) closeModal(); });

  document.getElementById('tileBio').addEventListener('click', ()=> openModal(buildBioHtml()));
  document.getElementById('tileRef').addEventListener('click', ()=>{
    openModal(buildFursonaHtml());
    const list = (window.fursonaList || []).map(f => ({ imageUrl: f.imageUrl, caption: f.label || '' }));
    document.querySelectorAll('#modalBody .modal-img[data-idx]').forEach(img=>{
      img.addEventListener('click', ()=>{
        if(typeof window.openLightbox === 'function'){
          window.openLightbox(
            parseInt(img.dataset.idx, 10),
            list,
            ix => document.querySelectorAll('#modalBody .modal-img')[ix]
          );
        }
      });
    });
  });
  document.getElementById('tileMusic').addEventListener('click', ()=> openModal(buildMusicHtml()));
  document.getElementById('tilePhoto').addEventListener('click', ()=>{
    openModal(buildOcArtHtml());
    document.querySelectorAll('#modalBody .modal-img[data-idx]').forEach(img=>{
      img.addEventListener('click', ()=>{
        if(typeof window.openLightbox === 'function'){
          window.openLightbox(
            parseInt(img.dataset.idx, 10),
            (window.ocArtList || []).map(a => ({ imageUrl: a.imageUrl, caption: a.artist ? '繪師：' + a.artist : '' })),
            ix => document.querySelectorAll('#modalBody .modal-img')[ix]
          );
        }
      });
    });
  });

  window.calOpen = false;
  const calOverlay = document.getElementById('calOverlay');
  const calHandle = document.getElementById('calHandle');

  window.openCalendar = function(){
    if(window.calOpen) return;
    window.calOpen = true;
    calOverlay.classList.add('open');
    window.dispatchEvent(new CustomEvent('calendar:open'));
  };
  window.closeCalendar = function(){
    window.calOpen = false;
    calOverlay.classList.remove('open');
  };

  calHandle.addEventListener('click', ()=> window.openCalendar());
  calOverlay.addEventListener('click', e=>{ if(e.target === calOverlay) window.closeCalendar(); });

  (function(){
    const sheet = document.getElementById('calSheet');
    let sy = 0, dy2 = 0, dragging2 = false;
    sheet.addEventListener('touchstart', e=>{ sy = e.touches[0].clientY; dy2 = 0; dragging2 = true; }, {passive:true});
    sheet.addEventListener('touchmove', e=>{
      if(!dragging2) return;
      dy2 = e.touches[0].clientY - sy;
    }, {passive:true});
    sheet.addEventListener('touchend', ()=>{
      dragging2 = false;
      if(dy2 > 50 && sheet.scrollTop <= 0) window.closeCalendar();
    });
  })();
