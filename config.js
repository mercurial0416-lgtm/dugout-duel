window.DUGOUT_CONFIG = {
  supabaseUrl: 'https://nwenbkthlpzlpfklgonb.supabase.co',
  publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZW5ia3RobHB6bHBma2xnb25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTA5MjMsImV4cCI6MjA5NTY4NjkyM30.PHojgVx7Yn1lUl88w_FtiMRwHBdLmVxkcUNBUBJILMU'
};

(() => {
  const playerKey = 'dugout-duel-player-token-v2';
  const hasPlayer = Boolean(localStorage.getItem(playerKey));
  if (!hasPlayer) document.documentElement.classList.add('entry-active');

  const fmCss = document.createElement('link');
  fmCss.rel = 'stylesheet';
  fmCss.href = './fm.css?v=2';
  document.head.appendChild(fmCss);

  const entryCss = document.createElement('link');
  entryCss.rel = 'stylesheet';
  entryCss.href = './entry.css?v=1';
  document.head.appendChild(entryCss);

  window.addEventListener('load', () => {
    if (hasPlayer) {
      const fm = document.createElement('script');
      fm.src = './fm.js?v=2';
      document.body.appendChild(fm);
    } else {
      const entry = document.createElement('script');
      entry.src = './entry.js?v=1';
      document.body.appendChild(entry);
    }
  }, { once: true });
})();
