(() => {
  const cfg=window.DUGOUT_CONFIG;
  const PLAYER_KEY='dugout-duel-player-token-v2';
  if(!cfg || localStorage.getItem(PLAYER_KEY)) return;

  const state={throwBat:'우투우타',position:'SS',archetype:'balanced',photo:''};
  const teams=['서울 블레이즈','부산 마리너스','인천 웨이브','대전 볼츠','광주 타이탄스','대구 레드폭스','수원 나이츠','창원 레이븐스'];
  const archetypes={
    balanced:{contact:56,power:56,discipline:56,speed:56,defense:56},
    contact:{contact:68,power:44,discipline:60,speed:57,defense:63},
    slugger:{contact:49,power:72,discipline:53,speed:43,defense:49},
    speed:{contact:61,power:44,discipline:54,speed:74,defense:62}
  };

  const root=document.createElement('div');
  root.id='careerEntry';
  root.innerHTML=`<div class="ce-wrap">
    <header class="ce-top"><div class="ce-brand">DUGOUT <b>DUEL</b></div><div class="ce-step" id="ceStep">CAREER MODE</div></header>

    <section class="ce-screen ce-intro active" id="ceIntro">
      <div class="ce-eyebrow">2026 · HIGH SCHOOL FINAL SEASON</div>
      <div class="ce-intro-line">고교야구 마지막 시즌.</div>
      <div class="ce-intro-line">프로 지명까지 <strong>12주</strong>.</div>
      <div class="ce-intro-line">커리어는 여기서 시작된다.</div>
      <div class="ce-intro-foot"><span>선수 등록 후 시즌이 시작됩니다.</span><button class="ce-text-btn" id="ceStart">시작 →</button></div>
    </section>

    <section class="ce-screen ce-create" id="ceCreate">
      <div class="ce-chapter">CHAPTER 01</div>
      <h1 class="ce-title">선수 생성</h1>
      <p class="ce-desc">등록한 선수는 솔로 커리어와 라이벌 매치에서 동일하게 사용됩니다.</p>

      <div class="ce-photo-row">
        <div class="ce-photo" id="cePhoto"><div class="ce-photo-placeholder">PROFILE<br>PHOTO</div></div>
        <div class="ce-photo-actions">
          <input type="file" id="cePhotoInput" accept="image/jpeg,image/png,image/webp" hidden>
          <button type="button" class="primary" id="cePhotoPick">프로필 사진 선택</button>
          <button type="button" id="cePhotoClear">사진 제거</button>
          <div class="ce-photo-hint">JPG · PNG · WEBP / 자동 크롭</div>
        </div>
      </div>

      <form class="ce-form" id="ceForm">
        <div class="ce-two">
          <div class="ce-field"><label>이름</label><input class="ce-input" id="ceName" maxlength="16" autocomplete="off" placeholder="이름 입력" required></div>
          <div class="ce-field"><label>등번호</label><input class="ce-input" id="ceNumber" type="number" min="0" max="99" value="7" required></div>
        </div>

        <div class="ce-field"><div class="ce-section-label">투타 유형</div><div class="ce-choice-row" id="ceThrowBat">
          <button type="button" class="ce-choice active" data-v="우투우타"><b>우투우타</b></button>
          <button type="button" class="ce-choice" data-v="우투좌타"><b>우투좌타</b></button>
          <button type="button" class="ce-choice" data-v="좌투좌타"><b>좌투좌타</b></button>
        </div></div>

        <div class="ce-field"><div class="ce-section-label">포지션</div><div class="ce-position" id="cePosition">
          ${['SS','2B','3B','1B','CF','RF','LF','C'].map((v,i)=>`<button type="button" class="ce-pos ${i===0?'active':''}" data-v="${v}">${v}</button>`).join('')}
        </div></div>

        <div class="ce-field"><label>희망 구단</label><select class="ce-select" id="ceTeam">${teams.map(t=>`<option>${t}</option>`).join('')}</select></div>

        <div class="ce-field"><div class="ce-section-label">플레이 스타일</div><div class="ce-style-list" id="ceStyle">
          <button type="button" class="ce-style active" data-v="balanced"><b>밸런스</b><span>전 능력 균형</span></button>
          <button type="button" class="ce-style" data-v="contact"><b>교타자</b><span>컨택 · 수비</span></button>
          <button type="button" class="ce-style" data-v="slugger"><b>거포</b><span>파워 중심</span></button>
          <button type="button" class="ce-style" data-v="speed"><b>호타준족</b><span>주루 · 컨택</span></button>
        </div></div>

        <div class="ce-two">
          <div class="ce-field"><label>생년월일</label><input class="ce-input" id="ceBirth" type="date" value="2008-03-01"></div>
          <div class="ce-field"><label>출신학교</label><input class="ce-input" id="ceSchool" maxlength="24" placeholder="서울고"></div>
        </div>
        <div class="ce-two">
          <div class="ce-field"><label>키</label><input class="ce-input" id="ceHeight" type="number" min="150" max="210" value="178"></div>
          <div class="ce-field"><label>몸무게</label><input class="ce-input" id="ceWeight" type="number" min="50" max="130" value="75"></div>
        </div>

        <div class="ce-error" id="ceError"></div>
        <button class="ce-submit" id="ceSubmit" type="submit">커리어 시작</button>
        <div class="ce-footnote">선수 기록은 이 기기와 서버에 연결됩니다.</div>
      </form>
    </section>
  </div>`;
  document.body.appendChild(root);
  document.documentElement.classList.add('entry-active');

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  $('#ceStart').onclick=()=>{$('#ceIntro').classList.remove('active');$('#ceCreate').classList.add('active');$('#ceStep').textContent='CHAPTER 01'};
  $$('#ceThrowBat .ce-choice').forEach(b=>b.onclick=()=>{state.throwBat=b.dataset.v;$$('#ceThrowBat .ce-choice').forEach(x=>x.classList.toggle('active',x===b))});
  $$('#cePosition .ce-pos').forEach(b=>b.onclick=()=>{state.position=b.dataset.v;$$('#cePosition .ce-pos').forEach(x=>x.classList.toggle('active',x===b))});
  $$('#ceStyle .ce-style').forEach(b=>b.onclick=()=>{state.archetype=b.dataset.v;$$('#ceStyle .ce-style').forEach(x=>x.classList.toggle('active',x===b))});

  $('#cePhotoPick').onclick=()=>$('#cePhotoInput').click();
  $('#cePhotoClear').onclick=()=>{state.photo='';$('#cePhoto').innerHTML='<div class="ce-photo-placeholder">PROFILE<br>PHOTO</div>'};
  $('#cePhotoInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{state.photo=await cropPhoto(f);$('#cePhoto').innerHTML=`<img src="${state.photo}" alt="프로필 미리보기">`}catch{$('#ceError').textContent='사진을 처리하지 못했습니다.'}};

  $('#ceForm').onsubmit=async e=>{
    e.preventDefault();
    const name=$('#ceName').value.trim();
    if(!name){$('#ceError').textContent='이름을 입력하세요.';return}
    const btn=$('#ceSubmit');btn.disabled=true;btn.textContent='등록 중…';$('#ceError').textContent='';
    const attrs=archetypes[state.archetype];
    const player={
      name,number:Number($('#ceNumber').value||7),position:state.position,throwBat:state.throwBat,
      wishTeam:$('#ceTeam').value,archetype:state.archetype,birthDate:$('#ceBirth').value||'2008-03-01',
      school:$('#ceSchool').value.trim()||'서울고',height:Number($('#ceHeight').value||178),weight:Number($('#ceWeight').value||75),
      origin:'서울',profileImage:state.photo,...attrs
    };
    try{
      const data=await rpc('dugout_create_player',{p_player:player});
      if(!data?.token)throw new Error('TOKEN_MISSING');
      localStorage.setItem(PLAYER_KEY,data.token);
      location.reload();
    }catch(err){
      console.error(err);$('#ceError').textContent='선수 등록에 실패했습니다. 잠시 후 다시 시도하세요.';btn.disabled=false;btn.textContent='커리어 시작';
    }
  };

  async function rpc(name,body){
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const t=await res.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!res.ok)throw new Error(d?.message||String(d||res.statusText));return d;
  }
  function cropPhoto(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const ratio=4/5;let sx=0,sy=0,sw=img.width,sh=img.height;if(sw/sh>ratio){sw=sh*ratio;sx=(img.width-sw)/2}else{sh=sw/ratio;sy=(img.height-sh)/2}const c=document.createElement('canvas');c.width=400;c.height=500;const ctx=c.getContext('2d');ctx.drawImage(img,sx,sy,sw,sh,0,0,400,500);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.76))}catch(e){reject(e)}};img.onerror=reject;img.src=url})}
})();
