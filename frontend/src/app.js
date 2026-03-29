/* ===========================================================
   RMDU MOBILE — App Logic
   Smooth scrolling, preloader → logo transition, custom cursor,
   GSAP animations
   =========================================================== */

(function () {
  'use strict';

  // Register GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  /* ── Lenis Smooth Scroll ──────────────────────────────── */
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ══════════════════════════════════════════════════════════
     PRELOADER  →  NAVBAR LOGO  TRANSITION
     The preloader logo starts centered, then:
       1. Tagline fades in
       2. Progress bar fills
       3. Logo shrinks & flies up to the exact navbar position
       4. Preloader background fades out
       5. Navbar appears with the logo already in place
     ══════════════════════════════════════════════════════════ */

  const preloader      = document.getElementById('preloader');
  const preloaderLogo  = document.getElementById('preloader-logo');
  const preloaderBar   = document.getElementById('preloader-bar');
  const preloaderTag   = document.getElementById('preloader-tagline');
  const header         = document.getElementById('site-header');
  const navLogoImg     = document.getElementById('nav-logo-img');

  if (preloader && preloaderLogo && navLogoImg && header) {

    // Phase 1: Initial entrance — fade in tagline
    const introTL = gsap.timeline();

    introTL
      .fromTo(preloaderLogo,
        { scale: 0.7, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'power3.out' }
      )
      .fromTo(preloaderTag,
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
        '-=0.3'
      )
      .to({}, { duration: 1.0 }); // Hold for a beat

    // Phase 2: After intro, animate logo to navbar position
    introTL.add(() => {
      // Get the target position (where the nav logo will be)
      // Temporarily show header to measure
      header.style.visibility = 'hidden';
      header.style.opacity = '1';
      const navRect = navLogoImg.getBoundingClientRect();
      header.style.opacity = '0';
      header.style.visibility = '';

      const preloaderRect = preloaderLogo.getBoundingClientRect();

      // Calculate the delta to fly the logo to the nav position
      const deltaX = navRect.left + navRect.width / 2 - (preloaderRect.left + preloaderRect.width / 2);
      const deltaY = navRect.top + navRect.height / 2 - (preloaderRect.top + preloaderRect.height / 2);
      const targetScale = navRect.height / preloaderRect.height;

      // Animate bar + tagline out
      const flyTL = gsap.timeline();

      flyTL
        .to([preloaderBar, preloaderTag], {
          opacity: 0,
          y: -10,
          duration: 0.4,
          ease: 'power2.in',
          stagger: 0.05,
        })
        // Fly the logo to its navbar destination
        .to(preloaderLogo, {
          x: deltaX,
          y: deltaY,
          scale: targetScale,
          duration: 1.0,
          ease: 'power3.inOut',
        })
        // Simultaneously fade out the preloader background
        .to(preloader, {
          backgroundColor: 'transparent',
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.5')
        // Hide preloader logo (nav logo takes over)
        .to(preloaderLogo, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
        }, '-=0.3')
        // Reveal the header with the nav logo
        .add(() => {
          header.classList.add('visible');
          preloader.style.pointerEvents = 'none';
        })
        .fromTo(header, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.3')
        .add(() => {
          preloader.style.display = 'none';
          document.dispatchEvent(new CustomEvent('intro-start'));
        });
    });
  }

  /* ── Custom Cursor ────────────────────────────────────── */
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');

  if (cursorDot && cursorRing && window.matchMedia('(pointer: fine)').matches) {
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: mouse.x, y: mouse.y };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursorDot.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;
    });

    function animateCursor() {
      ringPos.x += (mouse.x - ringPos.x) * 0.15;
      ringPos.y += (mouse.y - ringPos.y) * 0.15;
      cursorRing.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Hover detection for interactive elements
    const addHoverListeners = () => {
      document.querySelectorAll('a, button, .magnetic-btn').forEach((el) => {
        el.addEventListener('mouseenter', () => {
          cursorDot.classList.add('hover');
          cursorRing.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
          cursorDot.classList.remove('hover');
          cursorRing.classList.remove('hover');
        });
      });
    };

    addHoverListeners();
    const observer = new MutationObserver(addHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ── Header Scroll Effect ─────────────────────────────── */
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  /* ── Menu Toggle ──────────────────────────────────────── */
  const menuToggle = document.getElementById('menu-toggle');
  const navOverlay = document.getElementById('nav-overlay');
  const menuText = document.getElementById('menu-text');

  if (menuToggle && navOverlay) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navOverlay.classList.toggle('active');
      menuToggle.classList.toggle('active', isOpen);
      if (menuText) menuText.textContent = isOpen ? 'Close' : 'Menu';
    });

    navOverlay.querySelectorAll('.nav-overlay-link').forEach((link) => {
      link.addEventListener('click', () => {
        navOverlay.classList.remove('active');
        menuToggle.classList.remove('active');
        if (menuText) menuText.textContent = 'Menu';
      });
    });
  }

  /* ── Hero Intro Animations ────────────────────────────── */
  const playIntro = () => {
    const tl = gsap.timeline();
    tl.fromTo('.hero-subtitle', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' })
      .fromTo('.hero-title', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' }, '-=0.8')
      .fromTo('.hero-description', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, '-=0.8')
      .fromTo('.hero-content .btn-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, '-=0.8');
  };

  document.addEventListener('intro-start', playIntro);
  // Fallback if something goes wrong
  setTimeout(playIntro, 5000);

  /* ── Parallax Backgrounds ─────────────────────────────── */
  document.querySelectorAll('.hero-bg, .section-bg').forEach((bg) => {
    gsap.to(bg, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: bg.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  /* ── Scroll Reveals ───────────────────────────────────── */
  document.querySelectorAll('.reveal').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
      y: 0,
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
    });
  });

  /* ── 3D Tilt Cards ────────────────────────────────────── */
  document.querySelectorAll('.tilt-card').forEach((card) => {
    const inner = card.querySelector('.card-inner');
    if (!inner) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;

      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      inner.style.boxShadow = `${-rotateY}px ${rotateX}px 30px rgba(0,0,0,0.5)`;
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      inner.style.boxShadow = 'none';
    });
  });

  /* ── Number Counters ───────────────────────────────────── */
  document.querySelectorAll('.trust-number').forEach((el) => {
    const target = parseInt(el.dataset.target, 10);
    const format = el.dataset.format || '';
    const obj = { val: 0 };

    gsap.to(obj, {
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      val: target,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.floor(obj.val) + format;
      },
    });
  });

})();
