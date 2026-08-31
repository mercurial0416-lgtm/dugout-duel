window.DUGOUT_CONFIG = {
  supabaseUrl: 'https://nwenbkthlpzlpfklgonb.supabase.co',
  // Browser-safe legacy anon JWT. Never put service_role/secret keys here.
  // Replace with the current client auth pattern when this prototype is moved to its own Supabase project.
  publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZW5ia3RobHB6bHBma2xnb25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTA5MjMsImV4cCI6MjA5NTY4NjkyM30.PHojgVx7Yn1lUl88w_FtiMRwHBdLmVxkcUNBUBJILMU'
};

// Premium visual/profile layer. Loaded after the core game so multiplayer logic stays isolated.
(() => {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './premium.css?v=5';
  document.head.appendChild(css);
  window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = './premium.js?v=5';
    document.body.appendChild(script);
  }, { once: true });
})();
