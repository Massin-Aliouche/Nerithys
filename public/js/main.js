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
});
