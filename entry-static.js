(() => {
  const cfg = window.DUGOUT_CONFIG;
  const PLAYER_KEY = 'dugout-duel-player-token-v2';
  if (!cfg || localStorage.getItem(PLAYER_KEY)) return;

  const state = { throwBat:'우투우타', position:'SS', archetype:'balanced', photo:'' };
  const archetypes = {
    balanced:{contact:56,power:56,discipline:56,speed:56,defense:56},
    contact:{contact:68,power:44,discipline:60,speed:57,defense:63},
    slugger:{contact:49,power:72,discipline:53,speed:43,defense:49},
    speed:{contact:61,power:44,discipline:54,speed:74,defense:62}
  };
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];

  const intro=$('#ceIntro'), create=$('#ceCreate');
  if(!intro || !create) return;

  $('#ceStart').addEventListener('click',()=>{
    intro.classList.remove('active');
    create.classList.add('active');
    $('#ceStep').textContent='CHAPTER 01';
    window.scrollTo({top:0,behavior:'smooth'});
  });

  $$('#ceThrowBat .ce-choice').forEach(b=>b.addEventListener('click',()=>{
    state.throwBat=b.dataset.v;
    $$('#ceThrowBat .ce-choice').forEach(x=>x.classList.toggle('active',x===b));
  }));
  $$('#cePosition .ce-pos').forEach(b=>b.addEventListener('click',()=>{
    state.position=b.dataset.v;
    $$('#cePosition .ce-pos').forEach(x=>x.classList.toggle('active',x===b));
  }));
  $$('#ceStyle .ce-style').forEach(b=>b.addEventListener('click',()=>{
    state.archetype=b.dataset.v;
    $$('#ceStyle .ce-style').forEach(x=>x.classList.toggle('active',x===b));
  }));

  $('#cePhotoPick').addEventListener('click',()=>$('#cePhotoInput').click());
  $('#cePhotoClear').addEventListener('click',()=>{
    state.photo='';
    $('#cePhoto').innerHTML='<div class="ce-photo-placeholder">PROFILE<br>PHOTO</div>';
  });
  $('#cePhotoInput').addEventListener('change',async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      state.photo=await cropPhoto(f);
      $('#cePhoto').innerHTML=`<img src="${state.photo}" alt="프로필 미리보기">`;
      $('#ceError').textContent='';
    }catch(err){
      console.error(err);
      $('#ceError').textContent='사진을 처리하지 못했습니다.';
    }
  });

  $('#ceForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('#ceName').value.trim();
    if(!name){ $('#ceError').textContent='이름을 입력하세요.'; return; }
    const btn=$('#ceSubmit');
    btn.disabled=true; btn.textContent='등록 중…'; $('#ceError').textContent='';
    const attrs=archetypes[state.archetype];
    const player={
      name,
      number:Number($('#ceNumber').value||7),
      position:state.position,
      throwBat:state.throwBat,
      wishTeam:$('#ceTeam').value,
      archetype:state.archetype,
      birthDate:$('#ceBirth').value||'2008-03-01',
      school:$('#ceSchool').value.trim()||'서울고',
      height:Number($('#ceHeight').value||178),
      weight:Number($('#ceWeight').value||75),
      origin:'서울',
      profileImage:state.photo,
      ...attrs
    };
    try{
      const data=await rpc('dugout_create_player',{p_player:player});
      if(!data?.token) throw new Error('TOKEN_MISSING');
      localStorage.setItem(PLAYER_KEY,data.token);
      location.replace(location.pathname+'?career=1&t='+Date.now());
    }catch(err){
      console.error(err);
      $('#ceError').textContent='선수 등록에 실패했습니다. 다시 시도하세요.';
      btn.disabled=false; btn.textContent='커리어 시작';
    }
  });

  async function rpc(name,body){
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`,{
      method:'POST',
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const text=await res.text(); let data;
    try{data=text?JSON.parse(text):null}catch{data=text}
    if(!res.ok) throw new Error(data?.message||String(data||res.statusText));
    return data;
  }

  function cropPhoto(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{
        try{
          const ratio=4/5; let sx=0,sy=0,sw=img.width,sh=img.height;
          if(sw/sh>ratio){sw=sh*ratio;sx=(img.width-sw)/2}else{sh=sw/ratio;sy=(img.height-sh)/2}
          const c=document.createElement('canvas'); c.width=400; c.height=500;
          const ctx=c.getContext('2d'); ctx.drawImage(img,sx,sy,sw,sh,0,0,400,500);
          URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg',.76));
        }catch(e){reject(e)}
      };
      img.onerror=reject; img.src=url;
    });
  }
})();
