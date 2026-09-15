
  const toggle=document.getElementById('navToggle');
  const nav=document.getElementById('primaryNav');
  if(toggle){
    toggle.addEventListener('click',()=>{nav.classList.toggle('open');toggle.textContent=nav.classList.contains('open')?'FECHAR':'MENU';});
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.textContent='MENU';}));
  }

