/* ===== Grade + Lightbox do Portfólio (Página 3) ===== */
(function(){
  const API_BASE = '';

  const grid = document.getElementById('pfGrid');
  if (!grid) return;

  // Fallback (usado só se o backend de imagens estiver fora do ar).
  const FALLBACK_PROJECTS = [
    { title: 'Casa com piscina e vista', photos: [{ url: 'imagens/portfolio-1-casa-piscina-vista.jpg', alt: 'Projeto Kairu — casa com piscina e vista' }] },
    { title: 'Casa em madeira', photos: [{ url: 'imagens/portfolio-2-casa-madeira.jpg', alt: 'Projeto Kairu — casa em madeira' }] },
    { title: 'Casa ao entardecer', photos: [{ url: 'imagens/portfolio-3-casa-entardecer.jpg', alt: 'Projeto Kairu — casa contemporânea ao entardecer' }] },
    { title: 'Área de piscina', photos: [{ url: 'imagens/portfolio-4-area-piscina.jpg', alt: 'Projeto Kairu — área de piscina' }] },
    { title: 'Fachada em concreto', photos: [{ url: 'imagens/portfolio-5-fachada-concreto.jpg', alt: 'Projeto Kairu — fachada em concreto' }] }
  ];

  async function loadProjects(){
    try {
      const res = await fetch(`${API_BASE}/api/images`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar imagens.');
      const data = await res.json();
      if (Array.isArray(data.portfolio) && data.portfolio.length) {
        return data.portfolio.map((project) => ({
          title: project.title || '',
          photos: project.photos.map((photo) => ({ url: photo.url, alt: photo.alt || '' }))
        }));
      }
      return FALLBACK_PROJECTS;
    } catch (err) {
      return FALLBACK_PROJECTS;
    }
  }

  function renderGrid(projectList){
    grid.innerHTML = '';
    projectList.forEach((project) => {
      const cover = project.photos[0];
      if (!cover) return;

      const item = document.createElement('div');
      item.className = 'pf-item';

      const img = document.createElement('img');
      img.src = cover.url;
      img.alt = cover.alt || project.title;
      item.appendChild(img);

      if (project.title) {
        const title = document.createElement('div');
        title.className = 'pf-item-title';
        title.textContent = project.title;
        item.appendChild(title);
      }

      if (project.photos.length > 1) {
        const badge = document.createElement('div');
        badge.className = 'pf-item-badge';
        badge.textContent = `${project.photos.length} fotos`;
        item.appendChild(badge);
      }

      grid.appendChild(item);
    });
  }

  /* --- lightbox (navega pelas fotos do projeto selecionado) --- */
  let projects = [];
  let currentProject = 0;
  let currentPhoto = 0;
  let isOpen = false;

  const style = document.createElement('style');
  style.textContent = `
    .pf-lightbox{
      position:fixed; inset:0; z-index:1000;
      background:rgba(17,22,28,.92);
      display:flex; align-items:center; justify-content:center;
      opacity:0; visibility:hidden;
      transition:opacity .25s ease, visibility 0s linear .25s;
      padding:40px;
    }
    .pf-lightbox.is-open{
      opacity:1; visibility:visible;
      transition:opacity .25s ease, visibility 0s linear 0s;
    }
    .pf-lightbox-figure{
      position:relative; max-width:min(90vw,1100px); max-height:85vh;
      display:flex; flex-direction:column; align-items:center; gap:14px;
    }
    .pf-lightbox-img{
      max-width:100%; max-height:74vh; object-fit:contain;
      border-radius:6px; box-shadow:0 30px 80px rgba(0,0,0,.5);
      transform:scale(.96); opacity:0;
      transition:transform .25s ease, opacity .25s ease;
    }
    .pf-lightbox.is-open .pf-lightbox-img{ transform:scale(1); opacity:1; }
    .pf-lightbox-title{ color:#feb161; font-size:1rem; font-weight:600; text-align:center; }
    .pf-lightbox-caption{ color:#f7f3f2; font-size:.9rem; opacity:.75; text-align:center; }
    .pf-lightbox-counter{ color:#feb161; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; }
    .pf-lightbox-close, .pf-lightbox-prev, .pf-lightbox-next{
      position:fixed; background:rgba(247,243,242,.08); color:#f7f3f2;
      border:1px solid rgba(247,243,242,.35); border-radius:50%;
      width:46px; height:46px; display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:1.3rem; line-height:1; user-select:none;
      transition:background-color .2s ease;
    }
    .pf-lightbox-close:hover, .pf-lightbox-prev:hover, .pf-lightbox-next:hover{
      background:rgba(247,243,242,.22);
    }
    .pf-lightbox-close{ top:24px; right:24px; }
    .pf-lightbox-prev{ left:24px; top:50%; transform:translateY(-50%); }
    .pf-lightbox-next{ right:24px; top:50%; transform:translateY(-50%); }
    .pf-lightbox-prev[hidden], .pf-lightbox-next[hidden]{ display:none; }
    @media (max-width:640px){
      .pf-lightbox{ padding:16px; }
      .pf-lightbox-close{ top:12px; right:12px; width:40px; height:40px; }
      .pf-lightbox-prev{ left:8px; width:40px; height:40px; }
      .pf-lightbox-next{ right:8px; width:40px; height:40px; }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'pf-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <button class="pf-lightbox-close" type="button" aria-label="Fechar">&times;</button>
    <button class="pf-lightbox-prev" type="button" aria-label="Foto anterior">&#8249;</button>
    <button class="pf-lightbox-next" type="button" aria-label="Próxima foto">&#8250;</button>
    <figure class="pf-lightbox-figure">
      <div class="pf-lightbox-title"></div>
      <div class="pf-lightbox-counter"></div>
      <img class="pf-lightbox-img" src="" alt="">
      <figcaption class="pf-lightbox-caption"></figcaption>
    </figure>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector('.pf-lightbox-img');
  const titleEl = overlay.querySelector('.pf-lightbox-title');
  const captionEl = overlay.querySelector('.pf-lightbox-caption');
  const counterEl = overlay.querySelector('.pf-lightbox-counter');
  const btnClose = overlay.querySelector('.pf-lightbox-close');
  const btnPrev = overlay.querySelector('.pf-lightbox-prev');
  const btnNext = overlay.querySelector('.pf-lightbox-next');

  function render(){
    const project = projects[currentProject];
    const photo = project.photos[currentPhoto];
    imgEl.src = photo.url;
    imgEl.alt = photo.alt;
    titleEl.textContent = project.title || '';
    titleEl.hidden = !project.title;
    captionEl.textContent = photo.alt;

    const hasMultiple = project.photos.length > 1;
    counterEl.hidden = !hasMultiple;
    counterEl.textContent = `Foto ${currentPhoto + 1} de ${project.photos.length}`;
    btnPrev.hidden = !hasMultiple;
    btnNext.hidden = !hasMultiple;
  }

  function open(projectIndex){
    currentProject = projectIndex;
    currentPhoto = 0;
    render();
    overlay.classList.add('is-open');
    isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function close(){
    overlay.classList.remove('is-open');
    isOpen = false;
    document.body.style.overflow = '';
  }

  function next(){
    const photos = projects[currentProject].photos;
    currentPhoto = (currentPhoto + 1) % photos.length;
    render();
  }

  function prev(){
    const photos = projects[currentProject].photos;
    currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
    render();
  }

  btnClose.addEventListener('click', close);
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  loadProjects().then((loaded) => {
    projects = loaded.filter((project) => project.photos.length > 0);
    renderGrid(projects);
    Array.from(grid.querySelectorAll('.pf-item')).forEach((el, i) => {
      const img = el.querySelector('img');
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => open(i));
    });
  });
})();
