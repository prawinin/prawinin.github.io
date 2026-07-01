(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', startPrawinPortfolio);

  function startPrawinPortfolio() {
    setupNavigation();
    initCursorInteraction();
    initBackgroundGrid();
    initProjectTilt();
    initScrollFade();
  }

  function setupNavigation() {
    const panels = Array.from(document.querySelectorAll('.page-panel'));
    const navLinks = Array.from(document.querySelectorAll('.nav-link[data-view]'));
    const allTriggers = Array.from(document.querySelectorAll('[data-view]'));

    let current = 0;
    let inMotion = false;
    let scrollAccum = 0;
    const SCROLL_THRESHOLD = 70;

    function showPanel(idx) {
      if (inMotion || idx === current || idx < 0 || idx >= panels.length) return;
      inMotion = true;
      scrollAccum = 0;

      const prev = current;
      current = idx;

      panels[prev].classList.remove('active');
      panels[prev].classList.add('exit');
      panels[idx].classList.add('active');

      navLinks.forEach((link, i) => link.classList.toggle('active', i === idx));
      revealPanel(panels[idx]);

      setTimeout(() => {
        panels[prev].classList.remove('exit');
        inMotion = false;
      }, 900);
    }

    window.addEventListener('wheel', (e) => {
      if (inMotion) return;
      const activePanel = panels[current];
      const atTop = activePanel.scrollTop <= 0;
      const atBottom = Math.ceil(activePanel.scrollTop + activePanel.clientHeight) >= activePanel.scrollHeight - 2;

      if (e.deltaY > 0 && !atBottom) return;
      if (e.deltaY < 0 && !atTop) return;

      scrollAccum += e.deltaY;
      if (scrollAccum > SCROLL_THRESHOLD) showPanel(current + 1);
      if (scrollAccum < -SCROLL_THRESHOLD) showPanel(current - 1);
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') showPanel(current + 1);
      if (e.key === 'ArrowUp' || e.key === 'PageUp') showPanel(current - 1);
    });

    allTriggers.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.view, 10);
        if (!isNaN(idx)) showPanel(idx);
      });
    });

    navLinks.forEach((link, i) => link.classList.toggle('active', i === current));
  }

  function initCursorInteraction() {
    const canvas = document.getElementById('cursor-glow');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    let targetMx = -9999;
    let targetMy = -9999;

    class CursorEntity {
      constructor(bx, by) {
        this.bx = bx;
        this.by = by;

        this.bx += (Math.random() - 0.5) * 20;
        this.by += (Math.random() - 0.5) * 20;

        this.x = this.bx;
        this.y = this.by;
        this.vx = 0;
        this.vy = 0;

        const colors = [
          'rgba(66, 133, 244, ',  
          'rgba(139, 92, 246, ',  
          'rgba(234, 67, 53, ',   
          'rgba(251, 188, 5, ',   
          'rgba(244, 63, 94, '    
        ];

        this.colorPrefix = colors[Math.floor(Math.random() * colors.length)];

        this.size = Math.random() * 2 + 1.2;
        this.friction = 0.88 + Math.random() * 0.06;
        this.spring = 0.02 + Math.random() * 0.02;
        this.wanderAngle = Math.random() * Math.PI * 2;

        this.currentAlpha = 0;
        this.isSleeping = false;
      }

      update() {
        let dxMouse = targetMx - this.bx;
        let dyMouse = targetMy - this.by;
        let distMouse = Math.sqrt(dxMouse*dxMouse + dyMouse*dyMouse);

        let targetAlpha = 0;
        let targetX = this.bx;
        let targetY = this.by;

        if (distMouse < 450) {
           targetAlpha = (450 - distMouse) / 450;

           this.wanderAngle += 0.008;
           targetX += Math.cos(this.wanderAngle) * 25 * targetAlpha;
           targetY += Math.sin(this.wanderAngle) * 25 * targetAlpha;

           let pull = Math.min((450 - distMouse) * 0.015, 3.0); 
           if (distMouse > 0.1) {
               targetX += (dxMouse / distMouse) * pull;
               targetY += (dyMouse / distMouse) * pull;
           }
        }

        let dx = targetX - this.x;
        let dy = targetY - this.y;

        this.vx += dx * this.spring;
        this.vy += dy * this.spring;

        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;

        this.currentAlpha += (targetAlpha - this.currentAlpha) * 0.08;

        if (this.currentAlpha < 0.005 && distMouse > 450 && Math.abs(this.vx) < 0.1 && Math.abs(this.x - this.bx) < 0.5) {
           this.currentAlpha = 0;
           this.isSleeping = true;
           return;
        } else {
           this.isSleeping = false;
        }
      }

      draw() {
        if (this.isSleeping || this.currentAlpha <= 0.005) return;

        let speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        let angle = Math.atan2(this.vy, this.vx);

        let stretch = Math.max(1, speed * 0.8); 

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.beginPath();
        if (ctx.ellipse) {
           ctx.ellipse(0, 0, this.size * stretch, this.size, 0, 0, Math.PI * 2);
        } else {
           ctx.scale(stretch, 1);
           ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        }

        ctx.fillStyle = this.colorPrefix + (this.currentAlpha * 0.22).toFixed(3) + ')';
        ctx.fill();
        ctx.restore();
      }
    }

    let particles = [];

    function initParticles() {
       particles = [];
       const spacing = 16;
       const cols = Math.ceil(width / spacing);
       const rows = Math.ceil(height / spacing);

       for (let i = -1; i <= cols + 1; i++) {
         for (let j = -1; j <= rows + 1; j++) {
           particles.push(new CursorEntity(i * spacing, j * spacing));
         }
       }
    }

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      initParticles();
    }

    canvas.parentElement.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      targetMx = e.clientX - rect.left;
      targetMy = e.clientY - rect.top;
    });

    canvas.parentElement.addEventListener('mouseleave', () => {
      targetMx = -9999;
      targetMy = -9999;
    });

    window.addEventListener('resize', debounce(resize, 150));
    resize();

    function render() {
      ctx.clearRect(0, 0, width, height);

      for (let p of particles) {
        p.update();
        p.draw();
      }

      requestAnimationFrame(render);
    }

    render();
  }

  function initBackgroundGrid() {
    const canvas = document.getElementById('grid-backdrop');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, time = 0;

    const SPACING = 38;
    const DOT_RADIUS = 1.7;
    const WAVE_SPEED = 0.018;
    const WAVE_STRENGTH = 0.5;

    function render() {
      ctx.clearRect(0, 0, width, height);
      time += WAVE_SPEED;

      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * SPACING;
          const y = row * SPACING;

          const dx = x - width / 2;
          const dy = y - height / 2;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const wave = Math.sin(distance * 0.015 - time);
          const alpha = 0.16 + wave * WAVE_STRENGTH * 0.18;

          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(37, 99, 235, ${Math.max(0.05, alpha)})`;
          ctx.fill();
        }
      }

      requestAnimationFrame(render);
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', debounce(resize, 150));
    resize();
    render();
  }

  function initProjectTilt() {
    const projectsPanel = document.getElementById('panel-projects');
    const surface = document.getElementById('tilt-surface');
    if (!projectsPanel || !surface) return;
    if (window.matchMedia('(max-width: 1024px)').matches) return;

    const headings = surface.querySelectorAll('.project-heading');
    const infoBlocks = surface.querySelectorAll('.project-entry-info');
    const previews = surface.querySelectorAll('.project-preview img');

    let targetTiltY = 0, targetTiltX = 0, tiltY = 0, tiltX = 0;
    let targetHeadingScale = 1, headingScale = 1;
    let targetInfoScale = 1, infoScale = 1;

    const BASE_HEADING_SIZE = 2.75;
    const BASE_INFO_SIZE = 0.9375;

    projectsPanel.addEventListener('mousemove', (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;

      targetTiltY = nx * 3.5;
      targetTiltX = -ny * 2.0;

      const strength = Math.abs(nx);
      if (nx < 0) {
        targetHeadingScale = 1 + strength * 0.55;
        targetInfoScale = 1 - strength * 0.06;
      } else {
        targetInfoScale = 1 + strength * 0.25;
        targetHeadingScale = 1 - strength * 0.06;
      }
    });

    projectsPanel.addEventListener('mouseleave', () => {
      targetTiltX = 0; targetTiltY = 0;
      targetHeadingScale = 1;
      targetInfoScale = 1;
    });

    function animate() {
      tiltX += (targetTiltX - tiltX) * 0.07;
      tiltY += (targetTiltY - tiltY) * 0.07;
      headingScale += (targetHeadingScale - headingScale) * 0.07;
      infoScale += (targetInfoScale - infoScale) * 0.07;

      surface.style.transform = `perspective(1600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

      headings.forEach(h => {
        h.style.fontSize = `${BASE_HEADING_SIZE * headingScale}rem`;
      });

      infoBlocks.forEach(block => {
        const summary = block.querySelector('.project-summary');
        if (summary) summary.style.fontSize = `${BASE_INFO_SIZE * infoScale}rem`;
      });

      previews.forEach(img => {
        img.style.transform = `scale(${1 + (headingScale - 1) * 0.08 + (infoScale - 1) * 0.05})`;
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  function initScrollFade() {
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  function revealPanel(panel) {
    panel.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

})();