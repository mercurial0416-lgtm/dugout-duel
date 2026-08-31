(() => {
  const PLAYER_KEY='dugout-duel-player-token-v2';
  const ROOM_KEY='dugout-duel-room-v2';
  const cfg=window.DUGOUT_CONFIG;
  const root=document.documentElement;
  let cachedPlayerState=null;

  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const load=(src)=>new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=()=>reject(new Error('LOAD_FAIL '+src));
    document.body.appendChild(s);
  });
  const waitFor=async(fn,timeout=10000)=>{
    const start=Date.now();
    while(Date.now()-start<timeout){
      try{if(fn())return true}catch{}
      await sleep(120);
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

  function setEntryLoading(){
    const intro=document.getElementById('ceIntro');
    const create=document.getElementById('ceCreate');
    if(create)create.classList.remove('active');
    if(intro){
      intro.classList.add('active');
      const eyebrow=intro.querySelector('.ce-eyebrow');
      const lines=intro.querySelectorAll('.ce-intro-line');
      const foot=intro.querySelector('.ce-intro-foot');
      if(eyebrow)eyebrow.textContent='CAREER DATA';
      if(lines[0])lines[0].textContent='커리어 불러오는 중.';
      if(lines[1])lines[1].textContent='선수 데이터를 확인하고 있습니다.';
      if(lines[2])lines[2].textContent='';
      if(foot)foot.style.visibility='hidden';
    }
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

  const showEntry=async()=>{
    root.classList.remove('player-ready');
    root.classList.add('entry-ready');
    const app=document.getElementById('app');
    const entry=document.getElementById('careerEntry');
    if(app)app.style.display='none';
    if(entry)entry.style.display='block';
    restoreEntryCopy();
    if(!window.__DUGOUT_ENTRY_BOUND){
      try{
        await load('./entry-static.js?v=5');
        window.__DUGOUT_ENTRY_BOUND=true;
      }catch(e){
        console.error(e);
        const err=document.getElementById('ceError');
        if(err)err.textContent='화면 로드에 실패했습니다. 새로고침해 주세요.';
      }
    }
  };

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

  const validate=async(token)=>{
    if(!cfg || !token)return {kind:'invalid'};
    let lastNetworkError=null;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/dugout_get_player`,{
          method:'POST',
          headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({p_token:token})
        });
        if(res.ok){
          const data=await res.json();
          if(data?.player)return {kind:'valid',data};
          return {kind:'invalid'};
        }
        const text=await res.text().catch(()=>"");
        if(res.status===400||res.status===401||res.status===403||res.status===404||text.includes('PLAYER_DENIED'))return {kind:'invalid'};
        lastNetworkError=new Error('HTTP '+res.status);
      }catch(e){
        lastNetworkError=e;
      }
      await sleep(350*(attempt+1));
    }
    console.error('PLAYER_VALIDATE_RETRY_FAILED',lastNetworkError);
    return {kind:'network'};
  };

  const showCareer=async(initialState)=>{
    setEntryLoading();
    installGetPlayerFallback(initialState);
    root.classList.remove('player-ready');
    root.classList.add('entry-ready');
    try{
      await load('./app.js?v=13');
      await load('./fm.js?v=7');
    }catch(e){
      console.error(e);
      const err=document.getElementById('ceError');
      if(err)err.textContent='커리어 화면을 불러오지 못했습니다.';
      return;
    }

    const ready=await waitFor(()=>{
      const token=localStorage.getItem(PLAYER_KEY);
      const hub=document.getElementById('fmHub');
      return Boolean(token && hub && hub.children.length);
    },10000);

    if(!ready){
      let token='';
      try{token=localStorage.getItem(PLAYER_KEY)||''}catch{}
      if(!token){
        clearCareerLocal();
        await showEntry();
        return;
      }
      const second=await validate(token);
      if(second.kind==='invalid'){
        clearCareerLocal();
        await showEntry();
        return;
      }
      restoreEntryCopy();
      const eyebrow=document.querySelector('#ceIntro .ce-eyebrow');
      const lines=document.querySelectorAll('#ceIntro .ce-intro-line');
      const foot=document.querySelector('#ceIntro .ce-intro-foot');
      if(eyebrow)eyebrow.textContent='SYSTEM';
      if(lines[0])lines[0].textContent='커리어 화면을 준비하지 못했습니다.';
      if(lines[1])lines[1].textContent='페이지를 다시 열어 주세요.';
      if(lines[2])lines[2].textContent='';
      if(foot)foot.style.visibility='hidden';
      return;
    }

    const brand=document.querySelector('.brand-head');
    if(brand)brand.style.setProperty('display','none','important');
    const home=document.getElementById('homeView');
    const dash=document.getElementById('dashboardPanel');
    if(home)home.classList.remove('hidden');
    if(dash)dash.classList.remove('hidden');
    root.classList.remove('entry-ready');
    root.classList.add('player-ready');
    const entry=document.getElementById('careerEntry');
    const app=document.getElementById('app');
    if(entry)entry.style.display='none';
    if(app)app.style.display='block';

    setInterval(async()=>{
      let token='';
      try{token=localStorage.getItem(PLAYER_KEY)||''}catch{}
      if(!token && root.classList.contains('player-ready')){
        clearCareerLocal();
        await showEntry();
      }
    },700);
  };

  (async()=>{
    let token='';
    try{token=localStorage.getItem(PLAYER_KEY)||''}catch{}
    if(!token){await showEntry();return;}

    setEntryLoading();
    const result=await validate(token);
    if(result.kind==='valid'){
      await showCareer(result.data);
      return;
    }
    if(result.kind==='network'){
      restoreEntryCopy();
      const eyebrow=document.querySelector('#ceIntro .ce-eyebrow');
      const lines=document.querySelectorAll('#ceIntro .ce-intro-line');
      const foot=document.querySelector('#ceIntro .ce-intro-foot');
      if(eyebrow)eyebrow.textContent='CONNECTION';
      if(lines[0])lines[0].textContent='서버 연결을 확인하지 못했습니다.';
      if(lines[1])lines[1].textContent='잠시 후 다시 열어 주세요.';
      if(lines[2])lines[2].textContent='';
      if(foot)foot.style.visibility='hidden';
      return;
    }

    clearCareerLocal();
    await showEntry();
  })();
})();