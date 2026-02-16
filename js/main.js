document.addEventListener('DOMContentLoaded', function(){
  const toggle = document.querySelector('.nav-toggle');
  const list = document.querySelector('.nav-list');
  if(toggle && list){
    toggle.addEventListener('click', function(){
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      list.style.display = expanded ? '' : 'flex';
    });
  }

  const cta = document.querySelector('.cta');
  if(cta){
    cta.addEventListener('click', function(e){
      e.preventDefault();
      const target = document.querySelector('.features');
      if(target) window.scrollTo({top: target.offsetTop - 20, behavior: 'smooth'});
    });
  }

  // theme toggle (dark mode)
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(t){
    if(t === 'dark') document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    try{ localStorage.setItem('theme', t) }catch(e){ void e; }
  }
  const stored = (function(){ try{return localStorage.getItem('theme')}catch(e){return null} })();
  if(stored) applyTheme(stored);
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
  if(themeToggle){ themeToggle.addEventListener('click', ()=>{ const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'; applyTheme(next); }); }
});
