window.DUGOUT_CONFIG = {
  supabaseUrl: 'https://nwenbkthlpzlpfklgonb.supabase.co',
  publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZW5ia3RobHB6bHBma2xnb25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTA5MjMsImV4cCI6MjA5NTY4NjkyM30.PHojgVx7Yn1lUl88w_FtiMRwHBdLmVxkcUNBUBJILMU'
};

// FM-style career layer. Core multiplayer remains in app.js.
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './fm.css?v=1';
  document.head.appendChild(css);
  window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = './fm.js?v=1';
    document.body.appendChild(script);
  }, { once: true });
})();
