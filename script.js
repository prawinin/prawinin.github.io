/* ═══════════════════════════════════════════════════════════════
   PRAWIN — Portfolio Interactions
   Particle canvas, scroll reveals, 3D tilt, smooth navigation
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Wait for DOM ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    // Remove loading class after a tick
    requestAnimationFrame(() => {
      document.body.classList.remove('page-loading');
    });

    initParticleCanvas();
    initNavScroll();
    initMobileNav();
    initIntroReveal();
    initWordReveal();
    initScrollReveal();
    initProjectTilt();
    initSmoothLinks();
  }







  // ── INTRO SCROLL REVEAL ────────────────────────────────────
  function initIntroReveal() {
    const section = document.querySelector('.intro-section');
    const bg = document.getElementById('intro-bg');
    if (!section || !bg) return;

    function updateScroll() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // enterProgress: 0 when top is at bottom of viewport, 1 when top is at top of viewport
      const enterProgress = Math.max(0, Math.min(1, (vh - rect.top) / vh));
      // exitProgress: 0 when bottom is at viewport top, 1 when fully above viewport
      const exitProgress = Math.max(0, Math.min(1, -rect.bottom / vh));

      let radius = 0;
      if (rect.top < vh && rect.bottom > 0) {
        if (exitProgress > 0) {
          // Scrolling out: contract from 75% to 0%
          radius = Math.max(0, 75 * (1 - exitProgress * 2));
        } else {
          // Scrolling in: expand from 0% to 75%
          radius = enterProgress * 75;
        }
      }

      bg.style.clipPath = `circle(${radius}% at 50% 50%)`;

      // Update text opacity and subtle translate
      const inner = section.querySelector('.intro-section-inner');
      if (inner) {
        let textOpacity = 0;
        if (radius > 20) {
          // Scale from 0 to 1 as radius goes from 20% to 50%
          textOpacity = Math.max(0, Math.min(1, (radius - 20) / 30));
        }
        inner.style.opacity = textOpacity;
        const translateY = (1 - textOpacity) * 20;
        inner.style.transform = `translateY(${translateY}px)`;
      }

      requestAnimationFrame(updateScroll);
    }

    requestAnimationFrame(updateScroll);
  }


  // ── WORD-BY-WORD REVEAL ────────────────────────────────────
  function initWordReveal() {
    const elements = document.querySelectorAll('.word-reveal');
    if (!elements.length) return;

    // Helper to recursively wrap words in text nodes while preserving tags like strong/em/a
    function wrapWords(parent) {
      const childNodes = Array.from(parent.childNodes);
      childNodes.forEach(node => {
        if (node.nodeType === 3) { // Node.TEXT_NODE
          const text = node.textContent;
          if (!text.trim()) return;

          // Split by spacing to keep layout formatting exact
          const tokens = text.split(/(\s+)/);
          const fragment = document.createDocumentFragment();

          tokens.forEach(token => {
            if (/\s+/.test(token)) {
              fragment.appendChild(document.createTextNode(token));
            } else if (token.length > 0) {
              const span = document.createElement('span');
              span.className = 'word';
              span.textContent = token;
              fragment.appendChild(span);
            }
          });

          parent.replaceChild(fragment, node);
        } else if (node.nodeType === 1) { // Node.ELEMENT_NODE
          wrapWords(node);
        }
      });
    }

    elements.forEach(el => {
      // Split text into wrapped words preserving original markup
      wrapWords(el);

      // Stagger transitions by setting transitionDelay on each word
      const words = el.querySelectorAll('.word');
      words.forEach((word, index) => {
        word.style.transitionDelay = `${index * 25}ms`;
      });
    });

    // Use IntersectionObserver to trigger the reveal when scroll enters viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(el => observer.observe(el));
  }


  // ── PARTICLE CONSTELLATION CANVAS ──────────────────────────
  function initParticleCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: -1000, y: -1000 };
    let animationId;
    let scrollVelocity = 0;
    let lastScrollY = window.scrollY;
    let scrollPhase = 0; // Accumulated scroll for wave

    const CONFIG = {
      particleCount: getParticleCount(),
      connectionDistance: 140,
      mouseRadius: 180,
      baseSpeed: 0.3,
      particleSize: 1.2,
      lineOpacity: 0.32,
      particleOpacity: 0.70,
      accentColor: { r: 14, g: 116, b: 144 },
      baseColor: { r: 65, g: 65, b: 80 },
    };

    function getParticleCount() {
      const w = window.innerWidth;
      if (w < 480) return 30;
      if (w < 768) return 50;
      if (w < 1200) return 80;
      return 120;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * CONFIG.baseSpeed;
        this.vy = (Math.random() - 0.5) * CONFIG.baseSpeed;
        this.size = Math.random() * CONFIG.particleSize + 0.5;
        this.opacity = Math.random() * CONFIG.particleOpacity + 0.1;
        this.layer = Math.random(); // 0 = far, 1 = near (for parallax depth)
      }

      update() {
        // Mouse interaction
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.mouseRadius) {
          const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
          const angle = Math.atan2(dy, dx);
          // Gentle attraction
          this.vx += Math.cos(angle) * force * 0.015;
          this.vy += Math.sin(angle) * force * 0.015;
        }

        // Damping
        this.vx *= 0.995;
        this.vy *= 0.995;

        // Ensure minimum velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < CONFIG.baseSpeed * 0.3) {
          this.vx += (Math.random() - 0.5) * 0.02;
          this.vy += (Math.random() - 0.5) * 0.02;
        }

        // Scroll flow effect — particles drift with scroll momentum
        const scrollForce = scrollVelocity * this.layer * 0.12;
        this.vy -= scrollForce;

        // Wave effect — sinusoidal displacement based on particle position
        const waveAmplitude = Math.abs(scrollVelocity) * 0.3;
        const waveFreq = 0.008;
        const waveX = Math.sin(this.x * waveFreq + scrollPhase) * waveAmplitude * this.layer;
        const waveY = Math.cos(this.y * waveFreq * 0.7 + scrollPhase * 1.3) * waveAmplitude * this.layer * 0.5;
        this.vx += waveX * 0.02;
        this.vy += waveY * 0.02;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < -10) this.x = width + 10;
        if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        if (this.y > height + 10) this.y = -10;
      }

      draw() {
        // Depth-based opacity
        const depthOpacity = 0.3 + this.layer * 0.7;
        const finalOpacity = this.opacity * depthOpacity;

        // Color blend based on mouse proximity
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = Math.max(0, 1 - dist / (CONFIG.mouseRadius * 1.5));

        const r = Math.round(CONFIG.baseColor.r + (CONFIG.accentColor.r - CONFIG.baseColor.r) * mouseInfluence);
        const g = Math.round(CONFIG.baseColor.g + (CONFIG.accentColor.g - CONFIG.baseColor.g) * mouseInfluence);
        const b = Math.round(CONFIG.baseColor.b + (CONFIG.accentColor.b - CONFIG.baseColor.b) * mouseInfluence);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.8 + this.layer * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
        ctx.fill();
      }
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < CONFIG.particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.connectionDistance) {
            const opacity = (1 - dist / CONFIG.connectionDistance) * CONFIG.lineOpacity;

            // Mouse proximity boost
            const midX = (particles[i].x + particles[j].x) / 2;
            const midY = (particles[i].y + particles[j].y) / 2;
            const mouseDist = Math.sqrt(
              (mouse.x - midX) ** 2 + (mouse.y - midY) ** 2
            );
            const mouseBoost = Math.max(0, 1 - mouseDist / CONFIG.mouseRadius) * 0.3;

            const c = CONFIG.accentColor;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${opacity + mouseBoost})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Decay scroll velocity and advance wave phase
      scrollVelocity *= 0.92;
      scrollPhase += scrollVelocity * 0.01;

      particles.forEach(p => {
        p.update();
        p.draw();
      });

      drawConnections();
      animationId = requestAnimationFrame(animate);
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      CONFIG.particleCount = getParticleCount();
      createParticles();
    }

    // Throttled mouse tracking
    let mouseThrottle = false;
    document.addEventListener('mousemove', (e) => {
      if (mouseThrottle) return;
      mouseThrottle = true;
      requestAnimationFrame(() => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouseThrottle = false;
      });
    });

    document.addEventListener('mouseleave', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    // Touch support
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      mouse.x = -1000;
      mouse.y = -1000;
    });

    window.addEventListener('resize', debounce(resize, 200));

    // Track scroll velocity for flow effect
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      scrollVelocity = (currentScrollY - lastScrollY) * 0.15;
      lastScrollY = currentScrollY;
    }, { passive: true });

    resize();
    animate();

    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animate();
      }
    });
  }


  // ── NAV SCROLL EFFECT ──────────────────────────────────────
  function initNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      nav.classList.toggle('scrolled', scrollY > 50);
      lastScroll = scrollY;
    }, { passive: true });
  }


  // ── MOBILE NAV ─────────────────────────────────────────────
  function initMobileNav() {
    const hamburger = document.querySelector('.nav-hamburger');
    const mobileNav = document.querySelector('.nav-mobile');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }


  // ── SCROLL REVEAL ──────────────────────────────────────────
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Only unobserve non-stagger elements, or stagger after animation
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    reveals.forEach(el => observer.observe(el));
  }


  // ── 3D TILT EFFECT ON PROJECT CARDS ────────────────────────
  function initProjectTilt() {
    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    // Don't enable on mobile
    if (window.matchMedia('(max-width: 768px)').matches) return;

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => {
          card.style.transition = '';
        }, 500);
      });

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
      });
    });
  }


  // ── SMOOTH SCROLL FOR ANCHOR LINKS ─────────────────────────
  function initSmoothLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  }


  // ── UTILITY ────────────────────────────────────────────────
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

})();
