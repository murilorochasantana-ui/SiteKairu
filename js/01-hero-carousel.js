/* ===== Carrossel da colagem do Hero (Página 1) ===== */
(function(){
  const API_BASE = '';

  function setHeroBackground(image){
    const hero = document.querySelector('.hero');
    if (!hero || !image || !image.url) return;
    hero.style.setProperty('--hero-bg', `url("${image.url}")`);
  }

  const collage = document.querySelector('.hero-collage');
  if(!collage) {
    fetch(`${API_BASE}/api/images`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHeroBackground(data && data.heroBackground))
      .catch(() => {});
    return;
  }

  const hcLeft = collage.querySelector('.hc1');
  const hcCenter = collage.querySelector('.hc2');
  const hcRight = collage.querySelector('.hc3');
  const dotsWrap = document.querySelector('.hero-dots');
  let dots = dotsWrap ? Array.from(dotsWrap.children) : [];

  // Fallback (usado só se o backend de imagens estiver fora do ar).
  let slides = [
    { src: hcCenter.getAttribute('src'), alt: hcCenter.getAttribute('alt') || '' },
    { src: hcRight.getAttribute('src'), alt: hcRight.getAttribute('alt') || '' },
    { src: hcLeft.getAttribute('src'), alt: hcLeft.getAttribute('alt') || '' }
  ];

  const AUTOPLAY_MS = 4500;
  const SLIDE_MS = 420;      // duração da transição de troca
  const SLIDE_DIST = 26;     // distância (px) do leve deslize durante a troca
  const SIDE_DIM = 0.55;     // brilho das imagens fora de evidência (0 a 1)

  let index = 0;
  let timer = null;
  let isAnimating = false;

  function renderDots(){
    if (!dotsWrap) return;
    dotsWrap.replaceChildren();
    slides.forEach(() => {
      const dot = document.createElement('span');
      dotsWrap.appendChild(dot);
    });
    dots = Array.from(dotsWrap.children);
    bindDots();
  }

  // Fotos fora do centro ficam permanentemente "apagadas";
  // a de centro sempre em brilho total.
  function setupStaticStyles(){
    [hcLeft, hcCenter, hcRight].forEach((img) => {
      img.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`;
      img.style.willChange = 'transform, opacity, filter';
    });
    hcCenter.style.filter = 'brightness(1)';
    hcLeft.style.filter = `brightness(${SIDE_DIM})`;
    hcRight.style.filter = `brightness(${SIDE_DIM})`;
  }

  function applyFrame(centerI){
    if (!slides.length) {
      collage.hidden = true;
      if (dotsWrap) dotsWrap.hidden = true;
      return;
    }

    collage.hidden = false;
    if (dotsWrap) dotsWrap.hidden = false;

    const leftI = (centerI + slides.length - 1) % slides.length;
    const rightI = (centerI + 1) % slides.length;
    hcCenter.src = slides[centerI].src; hcCenter.alt = slides[centerI].alt;
    hcLeft.src = slides[leftI].src;     hcLeft.alt = slides[leftI].alt;
    hcRight.src = slides[rightI].src;   hcRight.alt = slides[rightI].alt;
    dots.forEach((d, i) => d.classList.toggle('active', i === centerI));
  }

  // dir: 1 = avança (próxima foto entra pela direita), -1 = volta
  function goTo(newIndex, dir){
    if (slides.length < 2) return;
    if (isAnimating) return;
    const target = ((newIndex % slides.length) + slides.length) % slides.length;
    if (target === index && dir === undefined) return;
    isAnimating = true;

    const direction = dir || (target > index ? 1 : -1);
    const imgs = [hcLeft, hcCenter, hcRight];

    // 1) desliza levemente para "fora", com fade parcial (nunca some de vez)
    imgs.forEach((img) => {
      img.style.transform = `translateX(${-direction * SLIDE_DIST}px)`;
      img.style.opacity = '0.25';
    });

    window.setTimeout(() => {
      index = target;
      applyFrame(index);

      // 2) reposiciona instantaneamente do lado oposto (sem transição)...
      imgs.forEach((img) => { img.style.transition = 'none'; });
      imgs.forEach((img) => { img.style.transform = `translateX(${direction * SLIDE_DIST}px)`; });

      // ...força reflow e volta suavemente ao lugar (com transição de novo)
      void collage.offsetWidth;
      imgs.forEach((img) => {
        img.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease, filter ${SLIDE_MS}ms ease`;
      });
      requestAnimationFrame(() => {
        hcCenter.style.transform = 'translateX(0)';
        hcLeft.style.transform = 'translateX(0)';
        hcRight.style.transform = 'translateX(0)';
        hcCenter.style.opacity = '1';
        hcLeft.style.opacity = '1';
        hcRight.style.opacity = '1';
        hcCenter.style.filter = 'brightness(1)';
        hcLeft.style.filter = `brightness(${SIDE_DIM})`;
        hcRight.style.filter = `brightness(${SIDE_DIM})`;
      });

      window.setTimeout(() => { isAnimating = false; }, SLIDE_MS);
    }, SLIDE_MS);
  }

  function next(){ goTo(index + 1, 1); }
  function prev(){ goTo(index - 1, -1); }

  function startAutoplay(){
    stopAutoplay();
    if (slides.length < 2) return;
    timer = window.setInterval(next, AUTOPLAY_MS);
  }
  function stopAutoplay(){
    if (timer) window.clearInterval(timer);
  }

  function bindDots(){
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        const dir = i === index ? undefined : (i > index ? 1 : -1);
        goTo(i, dir);
        startAutoplay();
      });
    });
  }

  // Passar o mouse na foto da esquerda ou da direita traz ela para o centro
  hcLeft.addEventListener('mouseenter', () => { prev(); startAutoplay(); });
  hcRight.addEventListener('mouseenter', () => { next(); startAutoplay(); });

  collage.addEventListener('mouseenter', stopAutoplay);
  collage.addEventListener('mouseleave', startAutoplay);

  // Swipe no touch (celular/tablet)
  let touchStartX = null;
  collage.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  collage.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); startAutoplay(); }
    touchStartX = null;
  });

  async function loadSlidesFromBackend(){
    try {
      const res = await fetch(`${API_BASE}/api/images`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao buscar imagens.');
      const data = await res.json();
      setHeroBackground(data.heroBackground);
      if (Array.isArray(data.hero)) {
        slides = data.hero.map((img) => ({ src: img.url, alt: img.alt || '' }));
      }
    } catch (err) {
      // Sem backend: mantém as fotos padrão já definidas acima.
    }
  }

  loadSlidesFromBackend().finally(() => {
    renderDots();
    applyFrame(0);
    setupStaticStyles();
    startAutoplay();
  });
})();
