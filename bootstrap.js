(() => {
  const PLAYER_KEY = 'dugout-duel-player-token-v2';
  const hasPlayer = Boolean(localStorage.getItem(PLAYER_KEY));
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });

  if (hasPlayer) {
    document.documentElement.classList.remove('entry-active');
    loadScript('./fm.js?v=4').catch((e) => console.error('FM UI load failed', e));
  } else {
    document.documentElement.classList.add('entry-active');
    loadScript('./entry.js?v=3').catch((e) => {
      console.error('Career entry load failed', e);
      const app = document.getElementById('app');
      if (app) app.innerHTML = '<main style="max-width:460px;margin:0 auto;padding:48px 22px;color:#fff;font-family:system-ui"><h2>화면을 불러오지 못했습니다.</h2><button onclick="location.reload()" style="margin-top:16px;padding:14px 18px">다시 불러오기</button></main>';
      document.documentElement.classList.remove('entry-active');
    });
  }
})();
