// Мягкий снег на canvas
(() => {
  const canvas = document.getElementById('snow');
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, dpr = 1;
  let flakes = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(220, (w * h) / 6500));
    flakes = Array.from({ length: count }, () => makeFlake(true));
  }

  function makeFlake(randomY) {
    // z — «глубина»: дальние снежинки мельче, медленнее и тусклее
    const z = Math.random();
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : -10,
      r: 0.6 + z * 2.6,
      speed: 0.25 + z * 1.1,
      alpha: 0.18 + z * 0.62,
      drift: Math.random() * Math.PI * 2,
      sway: 0.2 + Math.random() * 0.6,
    };
  }

  let wind = 0;
  window.addEventListener('mousemove', (e) => {
    wind = (e.clientX / w - 0.5) * 0.8;
  });

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.drift += 0.012;
      f.y += f.speed;
      f.x += Math.sin(f.drift) * f.sway + wind * f.speed;

      if (f.y > h + 10) Object.assign(f, makeFlake(false), { x: Math.random() * w });
      if (f.x > w + 10) f.x = -10;
      if (f.x < -10) f.x = w + 10;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${f.alpha})`;
      ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  frame();
})();
