(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#field'),ctx=canvas.getContext('2d');
const SAVE='dugout-rush-v35';
const names=['민준','현우','도윤','시우','준호','지훈','성민','태윤','건우'];
const hitters=[
 {role:'LEADOFF',name:'김민준',con:1.10,pow:.82,spd:1.15},
 {role:'CONTACT',name:'박현우',con:1.17,pow:.86,spd:1.00},
 {role:'CLEANUP',name:'이도윤',con:.92,pow:1.25,spd:.82},
 {role:'CLUTCH',name:'최시우',con:1.02,pow:1.08,spd:.95},
 {role:'ROOKIE',name:'정준호',con:.96,pow:.95,spd:1.05}
];
const pitchers=[
 {name:'장태성',tag:'FIREBALLER',velo:1.00,break:.55,control:.70,color:'#ff765f'},
 {name:'오지환',tag:'BREAK MASTER',velo:.92,break:1.15,control:.78,color:'#7fb7ff'},
 {name:'서강민',tag:'CLOSER',velo:1.12,break:1.08,control:.88,color:'#f4ce5d'}
];
let save=loadSave(), game=null, raf=0, last=0;
function loadSave(){try{return Object.assign({level:1,xp:0,fans:0,wins:0,bestCombo:0,totalHR:0,perks:[]},JSON.parse(localStorage.getItem(SAVE)||'{}'))}catch{return{level:1,xp:0,fans:0,wins:0,bestCombo:0,totalHR:0,perks:[]}}}
function store(){localStorage.setItem(SAVE,JSON.stringify(save))}
function show(id){$$('.screen').forEach(x=>x.classList.remove('on'));$('#'+id).classList.add('on');$('#controls').classList.toggle('show',id==='game');window.scrollTo(0,0)}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1400)}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);ctx.setTransform(d,0,0,d,0,0)}
new ResizeObserver(resize).observe(canvas);
function rand(a,b){return a+Math.random()*(b-a)}
function choice(a){return a[Math.floor(Math.random()*a.length)]}
function weighted(items){let sum=items.reduce((s,x)=>s+x[1],0),r=Math.random()*sum;for(const x of items){r-=x[1];if(r<=0)return x[0]}return items.at(-1)[0]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function startGame(){
 game={inning:7,half:'bottom',outs:0,strikes:0,balls:0,bases:[false,false,false],us:0,them:2,hitterIndex:0,pitch:null,state:'idle',nextPitchAt:0,combo:0,heat:0,hits:0,hr:0,runs:0,pa:0,walks:0,perfects:0,log:[],upgrades:[],mods:{contact:1,power:1,eye:1,heatGain:1,clutch:1,runner:1},won:false,extra:false};
 $('#callout').className='callout';
 show('game');
 renderHUD();
 queuePitch(650);
 cancelAnimationFrame(raf); last=performance.now(); raf=requestAnimationFrame(loop);
}
function currentHitter(){return hitters[game.hitterIndex%hitters.length]}
function currentPitcher(){return pitchers[Math.min(2,game.inning-7)]||pitchers[2]}
function queuePitch(delay=500){if(!game||game.state==='ended')return;game.pitch=null;game.state='waiting';game.nextPitchAt=performance.now()+delay;renderHUD()}
function makePitch(now){const p=currentPitcher();const type=weighted([['4SEAM',p.velo*1.2],['SLIDER',p.break],['CURVE',p.break*.65],['CHANGE',.75]]);let dur=type==='4SEAM'?rand(720,890):type==='CHANGE'?rand(980,1180):rand(880,1070);dur/=p.velo;if(game.heat>=100)dur*=1.16;const inZone=Math.random()<(0.67*p.control+0.14*game.mods.eye);const zx=inZone?rand(.33,.67):choice([rand(.18,.30),rand(.70,.82),rand(.30,.70)]);const zy=inZone?rand(.46,.68):choice([rand(.31,.42),rand(.71,.82),rand(.42,.72)]);game.pitch={type,start:now,dur,zx,zy,inZone,swung:false,resolved:false,spin:Math.random()*Math.PI*2};game.state='pitching';renderHUD()}
function loop(now){if(!game)return;const dt=Math.min(32,now-last);last=now;if(game.state==='waiting'&&now>=game.nextPitchAt)makePitch(now);if(game.state==='pitching'&&game.pitch&&!game.pitch.resolved){const t=(now-game.pitch.start)/game.pitch.dur;if(t>=1.08&&!game.pitch.swung)takePitch();}draw(now,dt);raf=requestAnimationFrame(loop)}
function draw(now){const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 const grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,'#09150d');grd.addColorStop(1,'#041009');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#0a0d0e';ctx.fillRect(0,0,w,h*.18);for(let i=0;i<58;i++){ctx.fillStyle=i%5===0?'#d7ff45':'#283136';ctx.globalAlpha=.32;ctx.fillRect((i*37)%w,10+(i*19)%(h*.14),2,2)}ctx.globalAlpha=1;
 ctx.strokeStyle='rgba(220,240,225,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.5,h*.89);ctx.lineTo(w*.12,h*.20);ctx.moveTo(w*.5,h*.89);ctx.lineTo(w*.88,h*.20);ctx.stroke();
 ctx.strokeStyle='rgba(255,255,255,.05)';for(let r=.18;r<.55;r+=.10){ctx.beginPath();ctx.arc(w*.5,h*.86,w*r,Math.PI*1.15,Math.PI*1.85);ctx.stroke()}
 ctx.save();ctx.translate(w*.5,h*.74);ctx.rotate(Math.PI/4);ctx.fillStyle='#54422e';ctx.fillRect(-36,-36,72,72);ctx.restore();
 ctx.fillStyle='#7f6b50';ctx.beginPath();ctx.ellipse(w*.5,h*.34,28,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=currentPitcher().color;ctx.beginPath();ctx.arc(w*.5,h*.315,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8ecee';ctx.fillRect(w*.5-4,h*.326,8,21);
 ctx.fillStyle='#dce2e3';ctx.beginPath();ctx.arc(w*.39,h*.79,7,0,Math.PI*2);ctx.fill();ctx.fillRect(w*.385,h*.80,10,27);ctx.strokeStyle='#dce2e3';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.39,h*.81);ctx.lineTo(w*.34,h*.77);ctx.stroke();
 const zx=w*.5,zy=h*.79,zw=w*.23,zh=h*.17;ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=1;ctx.strokeRect(zx-zw/2,zy-zh/2,zw,zh);ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(zx-zw/2,zy);ctx.lineTo(zx+zw/2,zy);ctx.moveTo(zx,zy-zh/2);ctx.lineTo(zx,zy+zh/2);ctx.stroke();
 if(game.pitch){const p=game.pitch,t=clamp((now-p.start)/p.dur,0,1.2);let ease=t*t*(3-2*Math.min(1,t));const startX=w*.5,startY=h*.34;const endX=w*(p.zx),endY=h*(p.zy+.13);let bend=0;if(p.type==='SLIDER')bend=Math.sin(Math.PI*Math.min(1,t))*w*.08*(p.zx<.5?-1:1);if(p.type==='CURVE')bend=Math.sin(Math.PI*Math.min(1,t))*h*.06;const x=startX+(endX-startX)*ease+(p.type==='SLIDER'?bend:0),y=startY+(endY-startY)*ease+(p.type==='CURVE'?bend:0);const r=3+11*Math.min(1,t);ctx.fillStyle='rgba(255,255,255,.15)';for(let i=3;i>0;i--){ctx.beginPath();ctx.arc(x-(endX-startX)*.012*i,y-(endY-startY)*.012*i,r*(1-i*.15),0,Math.PI*2);ctx.fill()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e55454';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,r*.6,p.spin+t*8,p.spin+t*8+1.2);ctx.stroke();}
}
function swing(mode){if(!game||game.state!=='pitching'||!game.pitch||game.pitch.resolved)return;const p=game.pitch,t=(performance.now()-p.start)/p.dur;p.swung=true;game.pa++;
 const h=currentHitter(), zonePenalty=p.inZone?1:(mode==='contact'?.68:.45);const ideal=.93;const err=Math.abs(t-ideal);const timing=clamp(1-err/(mode==='contact'?.19:.145),0,1);const hitterSkill=mode==='contact'?h.con*game.mods.contact:h.pow*game.mods.power;const clutch=(game.inning>=9?game.mods.clutch:1),heatBoost=1+game.heat*.0016;const quality=clamp(timing*hitterSkill*zonePenalty*clutch*heatBoost*(.93+Math.random()*.14),0,1.22);
 if(quality<.23){resolveSwing('MISS',0,quality,mode,err);return}
 let out;if(mode==='power')out=weighted([['OUT',Math.max(.12,.56-quality*.42)],['1B',.18+quality*.12],['2B',.12+quality*.13],['3B',.015*h.spd],['HR',Math.max(.02,(quality-.48)*.68*game.mods.power)]]);else out=weighted([['OUT',Math.max(.10,.48-quality*.42)],['1B',.30+quality*.18],['2B',.10+quality*.08],['3B',.025*h.spd],['HR',Math.max(.005,(quality-.72)*.20)]]);
 if(err<.045&&p.inZone){game.perfects++;quality=1.1;if(mode==='power'&&Math.random()<.72)out='HR';else if(out==='OUT')out='2B'}
 resolveSwing(out,0,quality,mode,err);
}
function resolveSwing(outcome,_runs,quality,mode,err){game.pitch.resolved=true;game.state='resolved';if(outcome==='MISS'){game.strikes++;game.combo=0;game.heat=Math.max(0,game.heat-8);flash(err<.08?'FOUL?':'WHIFF','bad');if(game.strikes>=3){recordOut('삼진');nextBatter()}else queuePitch(520);renderHUD();return}
 if(outcome==='OUT'){game.combo=0;game.heat=Math.max(0,game.heat-5);recordOut(quality>.72?'강한 타구 아웃':'범타');nextBatter();flash(quality>.72?'잘 맞았지만 OUT':'OUT','bad');renderHUD();return}
 let runs=advanceBases(outcome);game.hits++;game.combo++;game.heat=clamp(game.heat+(outcome==='HR'?34:outcome==='3B'?25:outcome==='2B'?19:13)*game.mods.heatGain,0,100);if(outcome==='HR'){game.hr++;save.totalHR++;document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),240)}game.us+=runs;game.runs+=runs;save.bestCombo=Math.max(save.bestCombo,game.combo);if(game.heat>=100)flash('LOCKED IN','hr');else flash(outcome==='HR'?'HOME RUN!':outcome==='3B'?'TRIPLE!':outcome==='2B'?'DOUBLE!':'BASE HIT',outcome==='HR'?'hr':'good');logPlay(`${currentHitter().name} · ${ko(outcome)}`,`${runs?runs+'득점 · ':''}${timingText(err)} ${mode==='power'?'강공':'컨택'}`);nextBatter(false);renderHUD();if(game.inning>=9&&game.us>game.them){setTimeout(()=>finish(true),outcome==='HR'?1000:650);return}setTimeout(()=>queuePitch(650),outcome==='HR'?1100:650)}
function takePitch(){if(!game.pitch||game.pitch.resolved)return;game.pitch.resolved=true;game.state='resolved';if(game.pitch.inZone){game.strikes++;flash('STRIKE','bad');logPlay('루킹 스트라이크',game.pitch.type);if(game.strikes>=3){recordOut('루킹 삼진');nextBatter()}else queuePitch(480)}else{game.balls++;flash('BALL','good');if(game.balls>=4){game.walks++;const runs=advanceBases('BB');game.us+=runs;game.runs+=runs;game.combo++;game.heat=clamp(game.heat+8*game.mods.heatGain,0,100);logPlay(`${currentHitter().name} · 볼넷`,runs?`${runs}득점`:'출루');nextBatter(false);if(game.inning>=9&&game.us>game.them){renderHUD();setTimeout(()=>finish(true),650);return}queuePitch(620)}else queuePitch(480)}renderHUD()}
function recordOut(label){game.outs++;logPlay(`${currentHitter().name} · ${label}`,`${game.outs}아웃`);if(game.outs>=3){endHalf()}}
function nextBatter(reset=true){game.hitterIndex++;game.strikes=0;game.balls=0;if(game.outs>=3)return;if(reset)queuePitch(580)}
function advanceBases(kind){let [b1,b2,b3]=game.bases,r=0;if(kind==='BB'){if(b1&&b2&&b3)r++;if(b2&&b1)b3=true;if(b1)b2=true;b1=true}else if(kind==='1B'){if(b3)r++;if(b2)r++;b3=b1;b2=false;b1=true;if(game.mods.runner>1&&b3&&Math.random()<.24*(game.mods.runner-1)){r++;b3=false}}else if(kind==='2B'){if(b3)r++;if(b2)r++;if(b1)r++;b3=false;b2=true;b1=false}else if(kind==='3B'){r+=(b1?1:0)+(b2?1:0)+(b3?1:0);b1=b2=false;b3=true}else if(kind==='HR'){r=1+(b1?1:0)+(b2?1:0)+(b3?1:0);b1=b2=b3=false}game.bases=[b1,b2,b3];return r}
function endHalf(){game.state='between';game.pitch=null;renderHUD();if(game.inning>=9&&!game.extra){if(game.us>game.them){finish(true);return}if(game.us===game.them){game.extra=true;game.inning=10;game.outs=0;game.balls=game.strikes=0;game.bases=[false,true,false];showBetween(true);return}finish(false);return}
 if(game.inning>=10){if(game.us!==game.them){finish(game.us>game.them);return}game.inning++;game.outs=0;game.balls=game.strikes=0;game.bases=[false,true,false];showBetween(true);return}
 game.inning++;simulateOpponent();game.outs=0;game.balls=game.strikes=0;game.bases=[false,false,false];if(game.inning===9&&game.us>game.them){finish(true);return}showBetween(false)}
function simulateOpponent(){let add=weighted([[0,.52],[1,.30],[2,.13],[3,.05]]);if(game.inning===9)add=Math.max(0,add-1);game.them+=add;if(add)logPlay(`상대 ${add}득점`,`${game.inning}회초 종료`)}
function showBetween(extra){show('between');$('#betweenEyebrow').textContent=extra?'EXTRA INNING':'DUGOUT';$('#betweenTitle').textContent=extra?'승부는 아직 안 끝났다.':`${game.inning}회말 시작.`;$('#betweenCopy').textContent=extra?`승부치기 주자 2루. 한 점이 경기의 전부다.`:`현재 ${game.us}:${game.them}. 다음 투수는 ${currentPitcher().name} · ${currentPitcher().tag}. 하나를 골라 강화한다.`;const cards=makeCards();$('#upgradeCards').innerHTML=cards.map((c,i)=>`<button class="upgrade ${c.rarity}" data-up="${i}"><div><h3>${c.title}</h3><p>${c.body}</p></div><div class="rarity">${c.rarity.toUpperCase()}</div></button>`).join('');$$('[data-up]').forEach(b=>b.onclick=()=>{const c=cards[+b.dataset.up];applyUpgrade(c);game.upgrades.push(c.title);show('game');renderHUD();queuePitch(750)})}
function makeCards(){const pool=[
 {title:'배트 스피드 +',body:'컨택 타이밍 판정이 넓어진다.',rarity:'normal',apply:()=>game.mods.contact*=1.10},
 {title:'풀스윙',body:'강공 장타 확률이 크게 오른다.',rarity:'normal',apply:()=>game.mods.power*=1.12},
 {title:'독수리 눈',body:'볼을 골라내기 쉬워진다.',rarity:'normal',apply:()=>game.mods.eye*=1.14},
 {title:'주루 압박',body:'단타에서 추가 진루 확률이 생긴다.',rarity:'normal',apply:()=>game.mods.runner*=1.25},
 {title:'연속 타격',body:'HEAT 획득량이 35% 증가한다.',rarity:'epic',apply:()=>game.mods.heatGain*=1.35},
 {title:'클러치 DNA',body:'9회 이후 모든 타격 판정이 강화된다.',rarity:'epic',apply:()=>game.mods.clutch*=1.18},
 {title:'ZONE BREAKER',body:'강공 파워가 25% 증가한다.',rarity:'legend',apply:()=>game.mods.power*=1.25},
 {title:'LOCKED IN',body:'컨택과 선구가 동시에 크게 오른다.',rarity:'legend',apply:()=>{game.mods.contact*=1.18;game.mods.eye*=1.18}}
 ];const picked=[];while(picked.length<3){let c=choice(pool);let rarityRoll=Math.random();if(c.rarity==='legend'&&rarityRoll>.22)continue;if(c.rarity==='epic'&&rarityRoll>.58)continue;if(!picked.includes(c))picked.push(c)}return picked}
function applyUpgrade(c){c.apply();toast(c.title+' 획득')}
function finish(won){game.state='ended';game.won=won;cancelAnimationFrame(raf);save.fans+=won?120+game.runs*12:35+game.runs*8;save.xp+=won?75+game.hits*4:30+game.hits*3;if(won)save.wins++;while(save.xp>=xpNeed(save.level)){save.xp-=xpNeed(save.level);save.level++;save.fans+=150}store();$('#finalResult').textContent=won?'COMEBACK COMPLETE':'GAME OVER';$('#finalScore').textContent=`${game.us} : ${game.them}`;$('#finalTitle').textContent=won?(game.inning>=9&&game.us-game.them===1?'끝내기 승리.':'역전 성공.'):'한 점이 모자랐다.';$('#finalCopy').textContent=`${game.inning}회까지 ${game.hits}안타 ${game.hr}홈런 · 최고 콤보 ${save.bestCombo}.`;$('#finalGrid').innerHTML=`<div><small>FANS</small><b>${save.fans}</b></div><div><small>LEVEL</small><b>${save.level}</b></div><div><small>WINS</small><b>${save.wins}</b></div>`;$('#xpFill').style.width=`${Math.min(100,save.xp/xpNeed(save.level)*100)}%`;$('#achievements').innerHTML=achievements().map(x=>`<div class="ach"><b>${x[0]}</b> · ${x[1]}</div>`).join('');show('final')}
function achievements(){const a=[];if(game.hr>=2)a.push(['멀티 홈런','한 경기 2홈런']);if(game.perfects>=2)a.push(['배럴 머신','PERFECT 2회']);if(game.us>=6)a.push(['빅 이닝','6득점 이상']);if(game.inning>=10)a.push(['연장 혈투','승부치기 진입']);if(!a.length)a.push(['다시 한 판','다음 판엔 더 세게']);return a}
function xpNeed(l){return 120+Math.floor(l*28)}
function renderHUD(){if(!game)return;$('#inning').textContent=game.inning>=10?`${game.inning}회말 · 승부치기`:`${game.inning}회말`;$('#score').innerHTML=`${game.us} <small>:</small> ${game.them}`;$('#outs').textContent=`OUT ${'●'.repeat(game.outs)}${'○'.repeat(Math.max(0,3-game.outs))}`;$('#strikeLights').innerHTML=Array.from({length:2},(_,i)=>`<i class="light strike ${i<game.strikes?'on':''}"></i>`).join('');$('#ballLights').innerHTML=Array.from({length:3},(_,i)=>`<i class="light ball ${i<game.balls?'on':''}"></i>`).join('');$('#b1').classList.toggle('on',!!game.bases[0]);$('#b2').classList.toggle('on',!!game.bases[1]);$('#b3').classList.toggle('on',!!game.bases[2]);const h=currentHitter(),p=currentPitcher();$('#hitterName').textContent=h.name;$('#hitterMeta').textContent=`${h.role} · ${game.combo?game.combo+'타석 연속 출루':''}`;$('#pitcherName').textContent=p.name;$('#pitcherTag').textContent=p.tag;$('#heatFill').style.width=game.heat+'%';$('#heatValue').textContent=Math.round(game.heat)+'%';$('#combo').textContent='x'+game.combo;$('#runs').textContent=game.runs;$('#hits').textContent=game.hits;$('#log').innerHTML=game.log.slice(-5).reverse().map(x=>`<div class="logline"><span>${x.inning}회</span><b>${x.a}</b><span>${x.b}</span></div>`).join('');const dis=game.state!=='pitching';$$('.swing').forEach(b=>b.disabled=dis)}
function logPlay(a,b){game.log.push({inning:game.inning,a,b})}
function flash(text,type){const e=$('#callout');e.textContent=text;e.className='callout show '+type;clearTimeout(e._t);e._t=setTimeout(()=>e.className='callout',620)}
function ko(x){return({HR:'홈런','3B':'3루타','2B':'2루타','1B':'안타',BB:'볼넷'})[x]||x}
function timingText(e){return e<.045?'PERFECT':e<.10?'GOOD':e<.16?'LATE/EARLY':'CONTACT'}
function renderHome(){$('#homeLevel').textContent=save.level;$('#homeFans').textContent=save.fans;$('#homeWins').textContent=save.wins;show('intro')}
$('#startGame').onclick=startGame;$('#retryGame').onclick=startGame;$('#homeBtn').onclick=renderHome;$('#contactSwing').onclick=()=>swing('contact');$('#powerSwing').onclick=()=>swing('power');canvas.addEventListener('pointerdown',e=>{if(game?.state==='pitching')swing(e.clientX>innerWidth/2?'power':'contact')});document.addEventListener('keydown',e=>{if(e.code==='Space')swing('contact');if(e.code==='ShiftLeft'||e.code==='ShiftRight')swing('power')});
renderHome();resize();
})();