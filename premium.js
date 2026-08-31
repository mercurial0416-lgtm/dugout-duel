(() => {
  const cfg = window.DUGOUT_CONFIG;
  if (!cfg) return;
  const PLAYER_TOKEN_KEY = 'dugout-duel-player-token-v2';
  let playerState = null;
  let resultWatch = 0;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  async function rpc(name, body) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
      method:'POST',
      headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const text=await res.text();
    let data; try{data=text?JSON.parse(text):null}catch{data=text}
    if(!res.ok) throw new Error(data?.message||String(data||res.statusText));
    return data;
  }

  function token(){return localStorage.getItem(PLAYER_TOKEN_KEY)||''}
  function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function pval(p,k,f=''){const v=p?.[k];return v===undefined||v===null||v===''?f:v}
  function avg(st){const pa=Number(st?.pa||0),h=Number(st?.h||0);return pa?(h/pa).toFixed(3).replace(/^0/,''):'.000'}

  function avatarSvg(p={},accent='#d7f52f'){
    const skin=pval(p,'skinTone','medium');
    const skinColor=skin==='light'?'#efc49d':skin==='tan'?'#b9794d':'#d49a70';
    const num=esc(pval(p,'number',7)), initial=esc(String(pval(p,'name','R')).slice(0,1));
    const pose=pval(p,'avatarPreset','rookie');
    const arm=pose==='slugger'
      ? `<path d="M40 160Q12 142 10 100M130 158Q158 138 160 96" stroke="#101820" stroke-width="22" stroke-linecap="round"/>`
      : pose==='speedster'
      ? `<path d="M40 160Q17 177 8 211M130 158Q153 171 164 198" stroke="#101820" stroke-width="22" stroke-linecap="round"/>`
      : `<path d="M40 160Q24 181 22 220M130 158Q148 182 150 220" stroke="#101820" stroke-width="22" stroke-linecap="round"/>`;
    const stripes=pval(p,'uniformStyle','classic')==='stripe'?`<path d="M52 148v96M77 138v108M103 138v108M128 148v96" stroke="#344149" stroke-width="2"/>`:'';
    return `<svg viewBox="0 0 170 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="170" height="260" fill="#070b0e"/><path d="M-20 228L184 18" stroke="${accent}" stroke-width="30" opacity=".15"/>${arm}<path d="M37 150Q85 122 133 150L150 260H20Z" fill="#0e151a" stroke="#2d3941" stroke-width="2"/>${stripes}<path d="M38 151Q85 181 132 151" fill="none" stroke="${accent}" stroke-width="3"/><ellipse cx="85" cy="94" rx="37" ry="45" fill="${skinColor}"/><path d="M48 80Q57 40 101 43Q132 45 141 76L127 74Q115 56 87 56Q62 58 53 82Z" fill="#05080a"/><path d="M45 76Q84 57 142 76L137 87Q84 75 45 88Z" fill="#0b0f12" stroke="#26333b"/><circle cx="70" cy="94" r="3" fill="#151515"/><circle cx="100" cy="94" r="3" fill="#151515"/><path d="M54 103h18M99 103h18" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M70 116Q85 124 101 115" stroke="#815b45" stroke-width="2" fill="none"/><circle cx="85" cy="158" r="22" fill="#0b1014"/><text x="85" y="166" text-anchor="middle" font-size="21" font-weight="900" fill="${accent}">${num}</text><text x="84" y="216" text-anchor="middle" font-size="31" font-weight="950" fill="${accent}">${initial}</text></svg>`;
  }

  function parseCard(card){
    const tag=card.querySelector('.tag')?.textContent||'';
    const m=tag.match(/#(\d+)/);
    return {name:card.querySelector('h3')?.textContent?.trim()||'ROOKIE',number:m?Number(m[1]):7,position:(tag.match(/\b(SS|2B|3B|1B|CF|RF|LF|C)\b/)||[])[1]||'SS'};
  }

  function decorateCard(card){
    if(!card||card.querySelector('.premium-art'))return;
    const mine=card.classList.contains('me');
    const parsed=parseCard(card);
    const p=mine&&playerState?.player?{...parsed,...playerState.player}:parsed;
    const art=document.createElement('div');art.className='premium-art'+(mine?'':' rival');art.innerHTML=avatarSvg(p,mine?'#d7f52f':'#71aef2');card.prepend(art);card.classList.add('premium-card');
    if(mine&&playerState?.player){
      const mp=playerState.player;
      const meta=document.createElement('div');meta.className='premium-profile-meta';
      meta.innerHTML=`<span>투/타 <b>${esc(pval(mp,'throwBat','우투우타'))}</b></span><span>신체 <b>${esc(pval(mp,'height',178))}cm · ${esc(pval(mp,'weight',75))}kg</b></span><span>출신 <b>${esc(pval(mp,'origin','서울'))}</b></span><span>별명 <b>${esc(pval(mp,'nickname','—'))}</b></span><span class="wide">${esc(pval(mp,'bio','내 야구 커리어'))}</span>`;
      const sub=card.querySelector('.sub');if(sub)sub.insertAdjacentElement('afterend',meta);else card.append(meta);
    }
  }

  function decorateAll(){
    $$('.player-card').forEach(decorateCard);
    ensureProfileButton();
  }

  function ensureProfileButton(){
    if(!token()||$('#premiumProfileBtn'))return;
    const dashboard=$('#dashboardPanel');if(!dashboard||dashboard.classList.contains('hidden'))return;
    const card=$('#myPlayerCard');if(!card)return;
    const bar=document.createElement('div');bar.className='premium-toolbar';bar.id='premiumToolbar';
    bar.innerHTML=`<button class="premium-profile-btn" id="premiumProfileBtn">프로필 편집 · 외형/투타/소개</button>`;
    card.insertAdjacentElement('afterend',bar);$('#premiumProfileBtn').addEventListener('click',openProfile);
  }

  async function refresh(){
    const t=token();if(!t){playerState=null;return}
    try{playerState=await rpc('dugout_get_player',{p_token:t});decorateAll()}catch{}
  }

  function profileDefaults(p={}){
    return {name:pval(p,'name','ROOKIE'),number:Number(pval(p,'number',7)),position:pval(p,'position','SS'),throwBat:pval(p,'throwBat','우투우타'),wishTeam:pval(p,'wishTeam','서울 블레이즈'),archetype:pval(p,'archetype','balanced'),nickname:pval(p,'nickname',''),bio:pval(p,'bio',''),height:Number(pval(p,'height',178)),weight:Number(pval(p,'weight',75)),origin:pval(p,'origin','서울'),hair:pval(p,'hair','short'),skinTone:pval(p,'skinTone','medium'),uniformStyle:pval(p,'uniformStyle','classic'),gloveColor:pval(p,'gloveColor','lime'),batColor:pval(p,'batColor','black'),avatarPreset:pval(p,'avatarPreset','rookie')};
  }

  function injectModal(){
    if($('#premiumProfileModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="premium-modal" id="premiumProfileModal"><section class="premium-modal-shell"><header class="premium-modal-head"><div><div class="kicker">PLAYER PROFILE</div><h2>내 선수 커스터마이즈</h2></div><button class="premium-close" data-close-profile>✕</button></header><div class="premium-profile-layout"><div class="premium-profile-preview" id="premiumProfilePreview"><div class="premium-preview-caption"><small>MY CAREER</small><b id="premiumPreviewName">ROOKIE</b><span id="premiumPreviewMeta">#7 · SS · 우투우타</span></div></div><form class="premium-form" id="premiumProfileForm"><div class="premium-form-grid"><label>이름<input name="name" maxlength="16" required></label><label>등번호<input name="number" type="number" min="0" max="99" required></label></div><div class="premium-form-grid"><label>포지션<select name="position"><option>SS</option><option>2B</option><option>3B</option><option>1B</option><option>CF</option><option>RF</option><option>LF</option><option>C</option></select></label><label>투 / 타<select name="throwBat"><option>우투우타</option><option>우투좌타</option><option>좌투좌타</option><option>좌투우타</option></select></label></div><div class="premium-form-grid"><label>희망 구단<select name="wishTeam"><option>서울 블레이즈</option><option>부산 마리너스</option><option>인천 웨이브</option><option>대전 볼츠</option><option>광주 타이탄스</option><option>대구 레드폭스</option><option>수원 나이츠</option><option>창원 레이븐스</option></select></label><label>플레이스타일<select name="archetype"><option value="balanced">밸런스</option><option value="contact">교타자</option><option value="slugger">거포</option><option value="speed">호타준족</option></select></label></div><div class="premium-form-grid"><label>별명<input name="nickname" maxlength="16"></label><label>출신지<input name="origin" maxlength="16"></label></div><label>한줄소개<input name="bio" maxlength="48"></label><div class="premium-form-grid"><label>키(cm)<input name="height" type="number" min="150" max="210"></label><label>몸무게(kg)<input name="weight" type="number" min="50" max="130"></label></div><div class="premium-form-grid"><label>헤어<select name="hair"><option value="short">숏컷</option><option value="two_block">투블럭</option><option value="wave">웨이브</option></select></label><label>피부톤<select name="skinTone"><option value="light">밝음</option><option value="medium">보통</option><option value="tan">구릿빛</option></select></label></div><div class="premium-form-grid"><label>유니폼<select name="uniformStyle"><option value="classic">클래식</option><option value="stripe">핀스트라이프</option><option value="modern">모던</option></select></label><label>장갑 컬러<select name="gloveColor"><option value="lime">네온그린</option><option value="black">블랙</option><option value="white">화이트</option></select></label></div><div class="premium-form-grid"><label>배트 컬러<select name="batColor"><option value="black">블랙</option><option value="wood">우드</option><option value="white">화이트</option></select></label><label>포즈<select name="avatarPreset"><option value="rookie">루키</option><option value="slugger">타자</option><option value="speedster">주자</option></select></label></div><button class="premium-save" type="submit">프로필 저장</button></form></div></section></div>`);
    $('#premiumProfileModal').addEventListener('click',e=>{if(e.target.id==='premiumProfileModal'||e.target.closest('[data-close-profile]'))closeProfile()});
    $('#premiumProfileForm').addEventListener('input',renderProfilePreview);
    $('#premiumProfileForm').addEventListener('submit',saveProfile);
  }

  function fillForm(p){const form=$('#premiumProfileForm'),data=profileDefaults(p);Object.entries(data).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=v})}
  function formData(){const form=$('#premiumProfileForm'),o={};new FormData(form).forEach((v,k)=>o[k]=v);o.number=Number(o.number||7);o.height=Number(o.height||178);o.weight=Number(o.weight||75);return o}
  function renderProfilePreview(){const p={...(playerState?.player||{}),...formData()},box=$('#premiumProfilePreview');if(!box)return;box.querySelector('svg')?.remove();box.insertAdjacentHTML('afterbegin',avatarSvg(p));$('#premiumPreviewName').textContent=p.name||'ROOKIE';$('#premiumPreviewMeta').textContent=`#${p.number||7} · ${p.position||'SS'} · ${p.throwBat||'우투우타'}`}
  function openProfile(){injectModal();fillForm(playerState?.player||{});renderProfilePreview();$('#premiumProfileModal').classList.add('open')}
  function closeProfile(){$('#premiumProfileModal')?.classList.remove('open')}
  async function saveProfile(e){e.preventDefault();const t=token();if(!t)return;const btn=$('.premium-save');btn.disabled=true;btn.textContent='저장 중...';try{playerState=await rpc('dugout_update_player_profile',{p_token:t,p_profile:formData()});closeProfile();location.reload()}catch(err){alert('프로필 저장 실패: '+err.message)}finally{btn.disabled=false;btn.textContent='프로필 저장'}}

  function snap(p){return p?{contact:+p.contact||0,power:+p.power||0,discipline:+p.discipline||0,speed:+p.speed||0,defense:+p.defense||0,condition:+p.condition||0,st:{...(p.seasonStats||{})},week:+playerState?.week||0,season:+playerState?.season||0}:null}
  function delta(before,after,k){return(+after[k]||0)-(+before[k]||0)}

  function injectResult(){
    if($('#premiumResultModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="premium-modal" id="premiumResultModal"><section class="premium-result-shell"><div class="premium-result-hero"><div class="premium-result-art" id="premiumResultArt"></div><div class="premium-result-copy"><div class="kicker">WEEK RESULT</div><h2 id="premiumResultTitle">좋은 한 주였다.</h2><div class="premium-result-list" id="premiumResultList"></div></div></div><div class="premium-deltas" id="premiumDeltas"></div><div class="premium-result-actions"><button class="premium-result-continue" id="premiumResultContinue">다음으로</button><button class="premium-result-profile" id="premiumResultProfile">내 프로필 보기</button></div></section></div>`);
    $('#premiumResultContinue').addEventListener('click',()=>$('#premiumResultModal').classList.remove('open'));
    $('#premiumResultProfile').addEventListener('click',()=>{$('#premiumResultModal').classList.remove('open');openProfile()});
  }

  function showResult(before,after,mode){
    injectResult();const p=after.player||after,st0=before.st||{},st1=p.seasonStats||{};
    $('#premiumResultArt').innerHTML=avatarSvg(p);const score=Number(p.lastWeekScore||0);
    $('#premiumResultTitle').textContent=mode==='duel'?(score>=140?'라이벌전, 제대로 붙었다.':'다음 맞대결을 노리자.'):(score>=170?'이번 주, 제대로 터졌다.':score>=120?'좋은 한 주였다.':'다음 주에 뒤집으면 된다.');
    const g=(+st1.g||0)-(+st0.g||0),h=(+st1.h||0)-(+st0.h||0),hr=(+st1.hr||0)-(+st0.hr||0),rbi=(+st1.rbi||0)-(+st0.rbi||0),war=(+st1.war||0)-(+st0.war||0);
    $('#premiumResultList').innerHTML=`<div class="premium-result-row"><span>이번 주 기록</span><b>${g}G · ${h}H · ${hr}HR · ${rbi}RBI</b></div><div class="premium-result-row"><span>WAR</span><b class="hot">${war>=0?'+':''}${war.toFixed(2)}</b></div><div class="premium-result-row"><span>주간 SCORE</span><b>${score}</b></div><div class="premium-result-row"><span>현재 타율</span><b>${avg(st1)}</b></div>`;
    const labs=[['CON','contact'],['POW','power'],['DISC','discipline'],['SPD','speed'],['DEF','defense'],['COND','condition']];
    $('#premiumDeltas').innerHTML=labs.map(([lab,k])=>{const d=delta(before,p,k);return`<div class="premium-delta ${d>0?'up':d<0?'down':''}"><small>${lab}</small><b>${d>0?'+':''}${d}</b></div>`}).join('');
    $('#premiumResultModal').classList.add('open');
  }

  async function watchPlayerChange(before,mode){
    const my=++resultWatch,t=token();if(!t||!before)return;
    for(let i=0;i<(mode==='duel'?180:15);i++){
      if(my!==resultWatch)return;
      await new Promise(r=>setTimeout(r,mode==='duel'?1800:450));
      try{const next=await rpc('dugout_get_player',{p_token:t});if(next.week!==before.week||next.season!==before.season){playerState=next;showResult(before,next,mode);decorateAll();return}}catch{}
    }
  }

  function bindResultWatch(){
    document.addEventListener('click',e=>{
      const solo=e.target.closest('#soloActionGrid button[data-solo-action]');
      const duel=e.target.closest('#actionGrid button[data-action]');
      if(!solo&&!duel)return;if(!playerState?.player)return;
      const before=snap(playerState.player);watchPlayerChange(before,duel?'duel':'solo');
    },true);
  }

  function observe(){const obs=new MutationObserver(()=>decorateAll());const app=$('#app');if(app)obs.observe(app,{childList:true,subtree:true})}
  async function boot(){injectModal();injectResult();observe();bindResultWatch();await refresh();decorateAll();setInterval(()=>{if(token())refresh()},5000)}
  boot();
})();
