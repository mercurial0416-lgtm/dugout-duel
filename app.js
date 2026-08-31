(() => {
  const cfg = window.DUGOUT_CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const playerTokenKey = 'dugout-duel-player-token-v2';
  const roomSessionKey = 'dugout-duel-room-v2';

  let selectedArch = 'balanced';
  let playerToken = localStorage.getItem(playerTokenKey) || null;
  let playerState = null;
  let roomSession = readJson(roomSessionKey);
  let room = null;
  let pollTimer = null;
  let busy = false;

  const archetypes = {
    balanced: { contact: 56, power: 56, discipline: 56, speed: 56, defense: 56 },
    contact: { contact: 68, power: 44, discipline: 60, speed: 57, defense: 63 },
    slugger: { contact: 49, power: 72, discipline: 53, speed: 43, defense: 49 },
    speed: { contact: 61, power: 44, discipline: 54, speed: 74, defense: 62 }
  };

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); }
    catch { return null; }
  }

  function esc(v = '') {
    return String(v).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2100);
  }

  function show(id) {
    ['#homeView','#createView','#gameView'].forEach((v) => $(v).classList.add('hidden'));
    $(id).classList.remove('hidden');
  }

  async function rpc(name, body) {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const raw = data?.message || data?.hint || String(data || res.statusText);
      throw new Error(raw);
    }
    return data;
  }

  function setBusy(next) {
    busy = next;
    $$('#soloActionGrid button, #hostRoomBtn, #joinRoomBtn, #createPlayerBtn').forEach((b) => {
      if (b) b.disabled = next;
    });
    if (room && !$('#gameView').classList.contains('hidden')) renderRoom();
  }

  function playerFromForm() {
    return {
      name: $('#playerName').value.trim(),
      number: Number($('#playerNumber').value || 7),
      position: $('#playerPosition').value,
      archetype: selectedArch,
      wishTeam: $('#wishTeam').value,
      ...archetypes[selectedArch]
    };
  }

  function avg(stats) {
    const pa = Number(stats?.pa || 0);
    const h = Number(stats?.h || 0);
    return pa ? (h / pa).toFixed(3).replace(/^0/, '') : '.000';
  }

  function stageLabel(player) {
    if (player.stage === 'HIGH_SCHOOL') return '고3 · 드래프트 쇼케이스';
    return `${esc(player.team || player.wishTeam || '프로')} · PRO ${Number(player.proYear || 1)}년차`;
  }

  function playerCard(player, { mine = false, career = null } = {}) {
    if (!player) return '';
    const st = player.seasonStats || {};
    const attrs = [
      ['CON', player.contact], ['POW', player.power], ['DISC', player.discipline],
      ['SPD', player.speed], ['DEF', player.defense], ['COND', player.condition]
    ];
    const games = Number(player.duelGames || 0);
    const wins = Number(player.duelWins || 0);
    const losses = Number(player.duelLosses || 0);
    const careerText = career ? ` · S${Number(career.season || 1)} W${Number(career.week || 1)}` : '';
    const draft = player.draft ? ` · ${esc(player.draft)}` : '';
    return `<article class="player-card ${mine ? 'me' : ''}">
      <div class="tag">${mine ? 'MY PLAYER' : 'RIVAL'} · #${Number(player.number || 0)} ${esc(player.position)}${careerText}</div>
      <h3>${esc(player.name)}</h3>
      <div class="sub">${stageLabel(player)}${draft}</div>
      <div class="big-stat"><div class="avg">${avg(st)}</div><div class="war">SEASON WAR <b>${Number(st.war || 0).toFixed(2)}</b><br>DUEL ${wins}승 ${losses}패 / ${games}G</div></div>
      <div class="stat-row">
        <div class="mini-stat"><span>HR</span><b>${Number(st.hr || 0)}</b></div>
        <div class="mini-stat"><span>RBI</span><b>${Number(st.rbi || 0)}</b></div>
        <div class="mini-stat"><span>H</span><b>${Number(st.h || 0)}</b></div>
        <div class="mini-stat"><span>G</span><b>${Number(st.g || 0)}</b></div>
      </div>
      <div class="bars">${attrs.map(([k,v]) => `<div class="bar"><span>${k}</span><div class="track"><div class="fill" style="width:${Math.max(0,Math.min(100,Number(v||0)))}%"></div></div><b>${Number(v||0)}</b></div>`).join('')}</div>
    </article>`;
  }

  function renderHome() {
    show('#homeView');
    const hasPlayer = Boolean(playerState?.player && playerToken);
    $('#onboardingPanel').classList.toggle('hidden', hasPlayer);
    $('#dashboardPanel').classList.toggle('hidden', !hasPlayer);
    if (!hasPlayer) return;

    const p = playerState.player;
    $('#careerSeason').textContent = p.stage === 'HIGH_SCHOOL' ? 'HIGH SCHOOL' : `CAREER SEASON ${playerState.season}`;
    $('#careerWeek').textContent = `WEEK ${playerState.week} / 12`;
    $('#myPlayerCard').innerHTML = playerCard(p, { mine: true, career: playerState });
    $('#resumeRoomBtn').classList.toggle('hidden', !roomSession?.code || !roomSession?.roomToken);
  }

  async function refreshPlayer(silent = true) {
    if (!playerToken) return false;
    try {
      playerState = await rpc('dugout_get_player', { p_token: playerToken });
      if (!$('#homeView').classList.contains('hidden')) renderHome();
      return true;
    } catch (e) {
      localStorage.removeItem(playerTokenKey);
      playerToken = null;
      playerState = null;
      if (!silent) toast('선수 연결을 찾지 못했음');
      return false;
    }
  }

  async function createPlayer(e) {
    e.preventDefault();
    if (busy) return;
    const player = playerFromForm();
    if (!player.name) return toast('선수 이름부터 써라');
    let pendingInvite = '';
    setBusy(true);
    try {
      const data = await rpc('dugout_create_player', { p_player: player });
      playerToken = data.token;
      localStorage.setItem(playerTokenKey, playerToken);
      playerState = { player: data.player, season: data.season, week: data.week };
      pendingInvite = inviteCode();
      renderHome();
      toast('내 선수 생성 완료');
    } catch (e2) {
      toast(normalizeError(e2.message));
    } finally {
      setBusy(false);
    }
    if (pendingInvite) await joinRoom(pendingInvite, true);
  }

  async function soloAction(action) {
    if (!playerToken || busy) return;
    const beforeSeason = Number(playerState?.season || 1);
    const beforeWeek = Number(playerState?.week || 1);
    setBusy(true);
    try {
      const data = await rpc('dugout_solo_action', { p_token: playerToken, p_action: action });
      playerState = data;
      renderHome();
      if (Number(data.season) !== beforeSeason) {
        const draft = data.player?.draft ? ` · ${data.player.draft}` : '';
        toast(`시즌 종료${draft} · 다음 시즌 시작`);
      } else {
        toast(`W${beforeWeek} 완료 · SCORE ${Number(data.player?.lastWeekScore || 0)}`);
      }
    } catch (e) {
      toast(normalizeError(e.message));
    } finally {
      setBusy(false);
    }
  }

  function saveRoomSession(next) {
    roomSession = next;
    localStorage.setItem(roomSessionKey, JSON.stringify(next));
  }

  function clearRoomSession() {
    localStorage.removeItem(roomSessionKey);
    roomSession = null;
    room = null;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  async function hostRoom() {
    if (!playerToken || busy) return;
    setBusy(true);
    try {
      const data = await rpc('dugout_create_room_v2', { p_player_token: playerToken });
      saveRoomSession({ code: data.code, roomToken: data.roomToken, slot: 'host' });
      room = data.room;
      openRoom();
    } catch (e) {
      toast(normalizeError(e.message));
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(codeInput, automatic = false) {
    if (!playerToken || busy) return;
    const code = String(codeInput || $('#joinCode').value || '').trim().toUpperCase();
    if (code.length < 8) return toast('방 코드 확인해라');
    if (roomSession?.code === code && roomSession?.roomToken) return resumeRoom();
    setBusy(true);
    try {
      const data = await rpc('dugout_join_room_v2', { p_code: code, p_player_token: playerToken });
      saveRoomSession({ code: data.code, roomToken: data.roomToken, slot: 'guest' });
      room = data.room;
      openRoom();
      if (!automatic) toast('내 선수 그대로 입장 완료');
    } catch (e) {
      toast(normalizeError(e.message));
    } finally {
      setBusy(false);
    }
  }

  function openRoom() {
    if (!room || !roomSession) return;
    show('#gameView');
    renderRoom();
    startPolling();
    history.replaceState({}, '', `${location.pathname}?room=${roomSession.code}`);
  }

  function renderRoom() {
    if (!room || !roomSession) return;
    $('#roomCodeBtn').textContent = roomSession.code;
    $('#roundLabel').textContent = `ROUND ${Number(room.round || 1)}`;

    const waiting = room.phase === 'waiting' || !room.guest;
    $('#waitingPanel').classList.toggle('hidden', !waiting);
    $('#matchPanel').classList.toggle('hidden', waiting);
    $('#inviteCode').textContent = roomSession.code;
    if (waiting) return;

    $('#versusCards').innerHTML = `${playerCard(room.host, { mine: roomSession.slot === 'host', career: room.hostCareer })}<div class="vs-mark">VS</div>${playerCard(room.guest, { mine: roomSession.slot === 'guest', career: room.guestCareer })}`;

    const myReady = roomSession.slot === 'host' ? room.hostReady : room.guestReady;
    const rivalReady = roomSession.slot === 'host' ? room.guestReady : room.hostReady;
    $('#readyState').innerHTML = `나 ${myReady ? '✓ 제출완료' : '● 선택 대기'}<br>상대 ${rivalReady ? '✓ 제출완료' : '● 선택 대기'}`;
    $$('#actionGrid button').forEach((b) => b.disabled = Boolean(myReady || busy));

    const feed = Array.isArray(room.feed) ? room.feed.slice(-12).reverse() : [];
    $('#feed').innerHTML = feed.length
      ? feed.map((f) => `<div class="feed-line"><span>${esc(f.msg || '')}</span><small>${formatTime(f.t)}</small></div>`).join('')
      : '<div class="feed-line"><span>아직 기록 없음</span></div>';
  }

  async function refreshRoom(silent = true) {
    if (!roomSession || busy) return;
    try {
      const oldRound = Number(room?.round || 0);
      const next = await rpc('dugout_get_room_v2', { p_code: roomSession.code, p_room_token: roomSession.roomToken });
      room = next;
      renderRoom();
      if (oldRound && Number(next.round) > oldRound) {
        await refreshPlayer(true);
        if (!silent) toast('맞다이 결과 · 내 커리어 반영 완료');
      }
    } catch (e) {
      if (!silent) toast(normalizeError(e.message));
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => refreshRoom(false), 1800);
  }

  async function submitAction(action) {
    if (!roomSession || busy) return;
    const beforeRound = Number(room?.round || 0);
    setBusy(true);
    try {
      room = await rpc('dugout_submit_action_v2', {
        p_code: roomSession.code,
        p_room_token: roomSession.roomToken,
        p_action: action
      });
      renderRoom();
      if (Number(room.round) > beforeRound) {
        await refreshPlayer(true);
        toast('승부 완료 · 원래 선수에 그대로 반영됨');
      } else {
        toast('제출 완료 · 친구 선택 기다리는 중');
      }
    } catch (e) {
      toast(normalizeError(e.message));
    } finally {
      setBusy(false);
    }
  }

  async function resumeRoom() {
    if (!roomSession?.code || !roomSession?.roomToken || busy) return;
    setBusy(true);
    try {
      room = await rpc('dugout_get_room_v2', { p_code: roomSession.code, p_room_token: roomSession.roomToken });
      openRoom();
    } catch (e) {
      clearRoomSession();
      renderHome();
      toast('저장된 방 연결이 만료됐음');
    } finally {
      setBusy(false);
    }
  }

  async function backToCareer() {
    clearInterval(pollTimer);
    pollTimer = null;
    history.replaceState({}, '', location.pathname);
    await refreshPlayer(true);
    renderHome();
  }

  function formatTime(epoch) {
    if (!epoch) return '';
    const d = new Date(Number(epoch) * 1000);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  async function copyInvite() {
    if (!roomSession) return;
    const url = `${location.origin}${location.pathname}?room=${roomSession.code}`;
    try { await navigator.clipboard.writeText(url); toast('초대 링크 복사됨'); }
    catch { prompt('이 링크 복사', url); }
  }

  function inviteCode() {
    return (new URLSearchParams(location.search).get('room') || '').trim().toUpperCase().slice(0, 10);
  }

  function normalizeError(msg = '') {
    if (msg.includes('PLAYER_DENIED')) return '내 선수 연결을 다시 확인해야 함';
    if (msg.includes('ROOM_NOT_FOUND')) return '방 코드를 확인해라';
    if (msg.includes('ROOM_FULL')) return '이미 2명 꽉 찬 방임';
    if (msg.includes('SAME_PLAYER')) return '같은 선수로 자기 방에는 못 들어감';
    if (msg.includes('ROOM_DENIED')) return '이 기기의 방 참가 정보가 유효하지 않음';
    if (msg.includes('ALREADY_SUBMITTED')) return '이번 라운드는 이미 제출함';
    if (msg.includes('ROOM_NOT_PLAYING')) return '아직 친구가 안 들어왔음';
    if (msg.includes('BAD_ACTION') || msg.includes('invalid action')) return '훈련 선택 오류';
    return '처리 실패: ' + msg.slice(0, 90);
  }

  function bind() {
    $('#newPlayerBtn').addEventListener('click', () => show('#createView'));
    $('#cancelCreateBtn').addEventListener('click', renderHome);
    $('#playerForm').addEventListener('submit', createPlayer);

    $$('#archetypeChoices .choice').forEach((b) => b.addEventListener('click', () => {
      selectedArch = b.dataset.arch;
      $$('#archetypeChoices .choice').forEach((x) => x.classList.toggle('selected', x === b));
    }));

    $$('#soloActionGrid button').forEach((b) => b.addEventListener('click', () => soloAction(b.dataset.soloAction)));
    $('#hostRoomBtn').addEventListener('click', hostRoom);
    $('#joinRoomBtn').addEventListener('click', () => joinRoom());
    $('#joinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });
    $('#resumeRoomBtn').addEventListener('click', resumeRoom);

    $$('#actionGrid button').forEach((b) => b.addEventListener('click', () => submitAction(b.dataset.action)));
    $('#shareBtn').addEventListener('click', copyInvite);
    $('#inviteCode').addEventListener('click', copyInvite);
    $('#roomCodeBtn').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(roomSession.code); toast('방 코드 복사됨'); } catch {}
    });
    $('#careerBackBtn').addEventListener('click', backToCareer);
    $('#leaveRoomBtn').addEventListener('click', async () => {
      clearRoomSession();
      history.replaceState({}, '', location.pathname);
      await refreshPlayer(true);
      renderHome();
      toast('방 연결만 지웠음 · 선수는 그대로');
    });

    $('#resetPlayerBtn').addEventListener('click', () => {
      if (!confirm('이 기기에서 선수 연결만 초기화할까? 서버 선수 데이터는 삭제되지 않음.')) return;
      clearRoomSession();
      localStorage.removeItem(playerTokenKey);
      playerToken = null;
      playerState = null;
      history.replaceState({}, '', location.pathname);
      renderHome();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (!$('#gameView').classList.contains('hidden')) refreshRoom(true);
      else refreshPlayer(true);
    });
  }

  async function boot() {
    bind();
    if (!playerToken) {
      renderHome();
      if (inviteCode()) toast('선수 만든 뒤 초대방에 바로 들어감');
      return;
    }

    const ok = await refreshPlayer(false);
    renderHome();
    if (!ok) return;

    const invited = inviteCode();
    if (invited) {
      if (roomSession?.code === invited && roomSession?.roomToken) await resumeRoom();
      else await joinRoom(invited, true);
    }
  }

  boot();
})();
