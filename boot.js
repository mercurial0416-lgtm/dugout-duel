(() => {
  const PLAYER_KEY='dugout-duel-player-token-v2';
  const ROOM_KEY='dugout-duel-room-v2';
  const RESET_KEY='dugout-duel-reset-marker';
  const RESET_VERSION='2026-08-31-player-wipe-1';
  const cfg=window.DUGOUT_CONFIG;
  const root=document.documentElement;
  let cachedPlayerState=null;

  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const load=(src,timeout=6000)=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    let done=false;
    const timer=setTimeout(()=>{if(done)return;done=true;s.remove();reject(new Error('LOAD_TIMEOUT '+src));},timeout);
    s.src=src;
    s.onload=()=>{if(done)return;done=true;clearTimeout(timer);resolve();};
    s.onerror=()=>{if(done)return;done=true;clearTimeout(timer);reject(new Error('LOAD_FAIL '+src));};
    document.body.appendChild(s);
  });
  const waitFor=async(fn,timeout=4500)=>{
    const start=Date.now();
    while(Date.now()-start<timeout){
      try{if(fn())return true}catch{}
      await sleep(100);
    }
    return false;
  };
  const synthetic=(data)=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});

  function clearCareerLocal(){
    try{
      localStorage.removeItem(PLAYER_KEY);
      localStorage.removeItem(ROOM_KEY);
    }catch{}
  }

  function restoreEntryCopy(){
    const intro=document.getElementById('ceIntro');
    if(!intro)return;
    const eyebrow=intro.querySelector('.ce-eyebrow');
    const lines=intro.querySelectorAll('.ce-intro-line');
    const foot=intro.querySelector('.ce-intro-foot');
    if(eyebrow)eyebrow.textContent='HIGH SCHOOL · FINAL SEASON';
    if(lines[0])lines[0].textContent='고교 마지막 시즌.';
    if(lines[1])lines[1].innerHTML='프로 지명까지 <strong>12주</strong>.';
    if(lines[2])lines[2].textContent='여기서 커리어가 시작된다.';
    if(foot)foot.style.visibility='visible';
  }

  async function showEntry(){
    root.classList.remove('player-ready');
    root.classList.add('entry-ready');
    const app=document.getElementById('app');
    const entry=document.getElementById('careerEntry');
    if(app)app.style.display='none';
    if(entry)entry.style.display='block';
    restoreEntryCopy();
    if(!window.__DUGOUT_ENTRY_BOUND){
      try{
        await load('./entry-static.js?v=7',4500);
        window.__DUGOUT_ENTRY_BOUND=true;
      }catch(e){
        console.error(e);
        const err=document.getElementById('ceError');
        if(err)err.textContent='화면을 불러오지 못했습니다. 새로고침해 주세요.';
      }
    }
  }

  function installGetPlayerFallback(initialState){
    cachedPlayerState=initialState;
    if(window.__DUGOUT_FETCH_GUARD_INSTALLED)return;
    window.__DUGOUT_FETCH_GUARD_INSTALLED=true;
    const realFetch=window.fetch.bind(window);
    window.fetch=async(input,init)=>{
      const url=typeof input==='string'?input:(input?.url||'');
      const isPlayer=url.includes('/rest/v1/rpc/dugout_get_player');
      try{
        const res=await realFetch(input,init);
        if(!isPlayer)return res;
        if(res.ok){
          try{
            const data=await res.clone().json();
            if(data?.player)cachedPlayerState=data;
          }catch{}
          return res;
        }
        if(res.status>=500 && cachedPlayerState)return synthetic(cachedPlayerState);
        return res;
      }catch(err){
        if(isPlayer && cachedPlayerState)return synthetic(cachedPlayerState);
        throw err;
      }
    };
  }

  async function validate(token){
    if(!cfg || !token)return {kind:'invalid'};
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2800);
    try{
      const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/dugout_get_player`,{
        method:'POST',
        signal:controller.signal,
        headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},
        body:JSON.stringify({p_token:token})
      });
      clearTimeout(timer);
      if(res.ok){
        const data=await res.json();
        return data?.player?{kind:'valid',data}:{kind:'invalid'};
      }
      const text=await res.text().catch(()=>"");
      if(res.status===400||res.status===401||res.status===403||res.status===404||text.includes('PLAYER_DENIED'))return {kind:'invalid'};
      return {kind:'network'};
    }catch(e){
      clearTimeout(timer);
      console.error('PLAYER_VALIDATE_FAILED',e);
      return {kind:'network'};
    }
  }

  async function showCareer(initialState){
    installGetPlayerFallback(initialState);
    try{
      await load('./app.js?v=15',5500);
      await load('./fm.js?v=9',5500);
    }catch(e){
      console.error(e);
      const entry=document.getElementById('careerEntry');
      if(entry){
        entry.style.display='block';
        entry.innerHTML='<div class="ce-wrap"><section class="ce-screen active" style="justify-content:center"><div class="ce-chapter">SYSTEM</div><h1 class="ce-title">커리어 화면을 열지 못했습니다.</h1><button class="ce-submit" onclick="location.reload()">다시 시도</button></section></div>';
      }
      return;
    }

    const ready=await waitFor(()=>{
      const hub=document.getElementById('fmHub');
      return Boolean(hub && hub.children.length);
    });

    if(!ready){
      const entry=document.getElementById('careerEntry');
      if(entry){
        entry.style.display='block';
        entry.innerHTML='<div class="ce-wrap"><section class="ce-screen active" style="justify-content:center"><div class="ce-chapter">SYSTEM</div><h1 class="ce-title">커리어 화면 준비에 실패했습니다.</h1><button class="ce-submit" onclick="location.reload()">다시 시도</button></section></div>';
      }
      return;
    }

    const brand=document.querySelector('.brand-head');
    if(brand)brand.style.setProperty('display','none','important');
    document.getElementById('homeView')?.classList.remove('hidden');
    document.getElementById('dashboardPanel')?.classList.remove('hidden');
    root.classList.remove('entry-ready');
    root.classList.add('player-ready');
    const entry=document.getElementById('careerEntry');
    const app=document.getElementById('app');
    if(entry)entry.style.display='none';
    if(app)app.style.display='block';
  }

  (async()=>{
    let forcedReset=false;
    try{
      if(localStorage.getItem(RESET_KEY)!==RESET_VERSION){
        clearCareerLocal();
        localStorage.setItem(RESET_KEY,RESET_VERSION);
        forcedReset=true;
      }
    }catch{}

    if(forcedReset){
      await showEntry();
      return;
    }

    let token='';
    try{token=localStorage.getItem(PLAYER_KEY)||''}catch{}
    if(!token){
      await showEntry();
      return;
    }

    const result=await validate(token);
    if(result.kind==='valid'){
      await showCareer(result.data);
      return;
    }
    if(result.kind==='invalid'){
      clearCareerLocal();
      await showEntry();
      return;
    }

    const intro=document.getElementById('ceIntro');
    if(intro){
      const eyebrow=intro.querySelector('.ce-eyebrow');
      const lines=intro.querySelectorAll('.ce-intro-line');
      const foot=intro.querySelector('.ce-intro-foot');
      if(eyebrow)eyebrow.textContent='CONNECTION';
      if(lines[0])lines[0].textContent='서버 연결을 확인하지 못했습니다.';
      if(lines[1])lines[1].textContent='다시 시도해 주세요.';
      if(lines[2])lines[2].textContent='';
      if(foot){
        foot.style.visibility='visible';
        foot.innerHTML='<span>네트워크 상태를 확인하세요.</span><button class="ce-text-btn" type="button" onclick="location.reload()">다시 시도 →</button>';
      }
    }
  })();
})();