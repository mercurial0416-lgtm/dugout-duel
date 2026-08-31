(() => {
  const PLAYER_KEY='dugout-duel-player-token-v2';
  const ROOM_KEY='dugout-duel-room-v2';
  const cfg=window.DUGOUT_CONFIG;
  const root=document.documentElement;

  const load=(src)=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('LOAD_FAIL '+src));
    document.body.appendChild(s);
  });

  const showEntry=async()=>{
    root.classList.remove('player-ready');
    root.classList.add('entry-ready');
    try{await load('./entry-static.js?v=3')}catch(e){
      console.error(e);
      const err=document.getElementById('ceError');
      if(err) err.textContent='화면 로드에 실패했습니다. 새로고침해 주세요.';
    }
  };

  const showCareer=async()=>{
    root.classList.remove('entry-ready');
    root.classList.add('player-ready');
    try{
      await load('./app.js?v=12');
      await load('./fm.js?v=6');
    }catch(e){
      console.error(e);
      root.classList.remove('player-ready');
      const token=localStorage.getItem(PLAYER_KEY);
      if(!token){ await showEntry(); return; }
      const entry=document.getElementById('careerEntry');
      if(entry){
        entry.style.display='block';
        entry.innerHTML='<div class="ce-wrap"><section class="ce-screen active" style="justify-content:center"><div class="ce-chapter">SYSTEM</div><h1 class="ce-title">화면을 불러오지 못했습니다.</h1><p class="ce-desc">페이지를 새로고침해 주세요.</p><button class="ce-submit" onclick="location.reload()">새로고침</button></section></div>';
      }
    }
  };

  const validate=async(token)=>{
    if(!cfg || !token) return false;
    try{
      const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/dugout_get_player`,{
        method:'POST',
        headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({p_token:token})
      });
      if(!res.ok) return false;
      const data=await res.json();
      return Boolean(data?.player);
    }catch(e){
      console.error('PLAYER_VALIDATE_FAILED',e);
      return null;
    }
  };

  (async()=>{
    let token='';
    try{token=localStorage.getItem(PLAYER_KEY)||''}catch{}
    if(!token){ await showEntry(); return; }

    const valid=await validate(token);
    if(valid===true){ await showCareer(); return; }
    if(valid===null){
      // Network failure: do not destroy a possibly valid career token.
      root.classList.add('entry-ready');
      const intro=document.getElementById('ceIntro');
      if(intro){
        const foot=intro.querySelector('.ce-intro-foot span');
        if(foot) foot.textContent='서버 연결을 확인하고 다시 시도하세요.';
      }
      return;
    }

    try{
      localStorage.removeItem(PLAYER_KEY);
      localStorage.removeItem(ROOM_KEY);
    }catch{}
    await showEntry();
  })();
})();
