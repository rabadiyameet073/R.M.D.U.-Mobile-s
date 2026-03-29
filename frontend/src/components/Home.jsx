import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

import logoImg from '/media/logo.png';
import logo2Img from '../../assets/logo_2_bg_fornav.png';
import bgv5 from '/media/bgv5.mp4';
import bgv3 from '/media/bgv3.mp4';
import bgv4 from '/media/bgv4.mp4';
import bgv2 from '/media/bgv2.mp4';
import offerVid from '/media/offer.mp4';
import budgetkillerVid from '/media/budgetkiller.mp4';
import gamingguruVid from '/media/gaming guru.mp4';
import cameraVid from '/media/camera.mp4';
import battryVid from '/media/battry.mp4';
import goatVid from '/media/goat.mp4';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  /* ── Refs ── */
  const preloaderRef = useRef(null);
  const preloaderLogoRef = useRef(null);
  const preloaderBarRef = useRef(null);
  const preloaderTagRef = useRef(null);
  const headerRef = useRef(null);
  const navLogoImgRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const menuToggleRef = useRef(null);
  const navOverlayRef = useRef(null);
  const menuTextRef = useRef(null);
  const sectionDotsRef = useRef(null);
  const searchToggleRef = useRef(null);
  const searchPanelRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchAnimationRef = useRef(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    /* ══════════════════════════════════════════════════════════
       PRELOADER → NAVBAR LOGO TRANSITION
       ══════════════════════════════════════════════════════════ */
    const preloader = preloaderRef.current;
    const preloaderLogo = preloaderLogoRef.current;
    const preloaderBar = preloaderBarRef.current;
    const preloaderTag = preloaderTagRef.current;
    const header = headerRef.current;
    const navLogoImg = navLogoImgRef.current;
    const forceNavbarVisibleTimer = setTimeout(() => {
      if (header) header.classList.add('visible');
    }, 1800);

    if (preloader && preloaderLogo && navLogoImg && header) {
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
        .to({}, { duration: 1.0 });

      introTL.add(() => {
        header.style.visibility = 'hidden';
        header.style.opacity = '1';
        const navRect = navLogoImg.getBoundingClientRect();
        header.style.opacity = '0';
        header.style.visibility = '';

        const preloaderRect = preloaderLogo.getBoundingClientRect();
        const deltaX = navRect.left + navRect.width / 2 - (preloaderRect.left + preloaderRect.width / 2);
        const deltaY = navRect.top + navRect.height / 2 - (preloaderRect.top + preloaderRect.height / 2);
        const targetScale = navRect.height / preloaderRect.height;

        const flyTL = gsap.timeline();

        flyTL
          .to([preloaderBar, preloaderTag], {
            opacity: 0,
            y: -10,
            duration: 0.4,
            ease: 'power2.in',
            stagger: 0.05,
          })
          .to(preloaderLogo, {
            x: deltaX,
            y: deltaY,
            scale: targetScale,
            duration: 1.0,
            ease: 'power3.inOut',
          })
          .to(preloader, {
            backgroundColor: 'transparent',
            duration: 0.6,
            ease: 'power2.out',
          }, '-=0.5')
          .to(preloaderLogo, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
          }, '-=0.3')
          .add(() => {
            header.classList.add('visible');
            preloader.style.pointerEvents = 'none';
            // Show section dots after intro
            if (sectionDotsRef.current) {
              sectionDotsRef.current.classList.add('visible');
            }
          })
          .fromTo(header, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.3')
          .add(() => {
            preloader.style.display = 'none';
            document.dispatchEvent(new CustomEvent('intro-start'));
          });
      });
    } else if (header) {
      header.classList.add('visible');
    }

    /* ── Custom Cursor — RR Style with ring ── */
    const cursorDot = cursorDotRef.current;
    const cursorRing = cursorRingRef.current;
    let cursorAnimId;

    if (cursorDot && cursorRing && window.matchMedia('(pointer: fine)').matches) {
      let mouseX = window.innerWidth / 2;
      let mouseY = window.innerHeight / 2;
      let ringX = mouseX;
      let ringY = mouseY;
      const delay = 0.15;

      const onMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
      };
      window.addEventListener('mousemove', onMouseMove);

      const animateCursor = () => {
        ringX += (mouseX - ringX) * delay;
        ringY += (mouseY - ringY) * delay;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
        cursorAnimId = requestAnimationFrame(animateCursor);
      };
      animateCursor();

      const handleEnter = () => {
        cursorRing.classList.add('hovered');
        cursorDot.style.opacity = '0';
      };
      const handleLeave = () => {
        cursorRing.classList.remove('hovered');
        cursorDot.style.opacity = '1';
      };

      const addHoverListeners = () => {
        document.querySelectorAll('a, button, .magnetic-btn, .section-dot, .menu-btn, .nav-left, .nav-center, .nav-right, .close-btn, .sidebar-menu a, .search-toggle, .nav-search-submit').forEach((el) => {
          el.addEventListener('mouseenter', handleEnter);
          el.addEventListener('mouseleave', handleLeave);
        });
      };
      addHoverListeners();
      const observer = new MutationObserver(addHoverListeners);
      observer.observe(document.body, { childList: true, subtree: true });

      const handleMouseLeaveWindow = () => {
        cursorDot.style.display = 'none';
        cursorRing.style.display = 'none';
      };
      const handleMouseEnterWindow = () => {
        cursorDot.style.display = 'block';
        cursorRing.style.display = 'flex';
      };
      document.addEventListener('mouseleave', handleMouseLeaveWindow);
      document.addEventListener('mouseenter', handleMouseEnterWindow);

      window.__rmduCursorCleanup = () => {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeaveWindow);
        document.removeEventListener('mouseenter', handleMouseEnterWindow);
        cancelAnimationFrame(cursorAnimId);
        observer.disconnect();
      };
    }

    /* ── Header Scroll Effect — RR shrink on scroll ── */
    if (header) {
      const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
      };
      window.addEventListener('scroll', onScroll);
    }

    /* ── Section Dots — Active state tracking ── */
    const sectionIds = ['hero', 'problem', 'categories', 'trust', 'offers'];
    sectionIds.forEach((id, index) => {
      const section = document.getElementById(id);
      if (!section) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          updateActiveDot(index);
        },
        onEnterBack: () => {
          updateActiveDot(index);
        }
      });
    });

    function updateActiveDot(activeIndex) {
      const dots = document.querySelectorAll('.rrmc-carousel-nav-item button');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
      });
    }

    const setActiveDotFromViewport = () => {
      const viewportCenter = window.innerHeight * 0.5;
      let matchedIndex = 0;

      sectionIds.forEach((id, index) => {
        const section = document.getElementById(id);
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
          matchedIndex = index;
        }
      });

      updateActiveDot(matchedIndex);
    };

    setTimeout(setActiveDotFromViewport, 0);
    window.addEventListener('resize', setActiveDotFromViewport);

    /* ── Hero Intro Animations — Premium timing ── */
    const playIntro = () => {
      const tl = gsap.timeline();
      tl.fromTo('.hero-subtitle', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' })
        .fromTo('.hero-title', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.4, ease: 'power3.out' }, '-=0.9')
        .fromTo('.hero-description', { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' }, '-=0.9')
        .fromTo('.hero-content .btn-cta', { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' }, '-=0.8')
        .fromTo('.scroll-indicator', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.5');
    };
    document.addEventListener('intro-start', playIntro);
    const fallbackTimer = setTimeout(playIntro, 5000);

    /* ── Parallax Backgrounds ── */
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

    /* ── Scroll Reveals — full-page smooth system ── */
    document.querySelectorAll('.reveal').forEach((el) => {
      const delayClass = Array.from(el.classList).find((cls) => cls.startsWith('reveal-delay-'));
      const delayIndex = delayClass ? Number(delayClass.replace('reveal-delay-', '')) || 0 : 0;
      const revealDelay = Math.min(delayIndex * 0.08, 0.5);

      gsap.set(el, { autoAlpha: 0, y: 30, filter: 'blur(7px)' });
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          end: 'bottom 18%',
          toggleActions: 'play none none reverse',
        },
        y: 0,
        autoAlpha: 1,
        filter: 'blur(0px)',
        delay: revealDelay,
        duration: 1.05,
        ease: 'power3.out',
      });
    });

    /* ── Cards — flat style, no 3D tilt (RR aesthetic) ── */

    /* ── Number Counters ── */
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

    /* ── Footer reveal animation ── */
    const footerFeatures = document.querySelectorAll('.footer-feature-card');
    if (footerFeatures.length) {
      gsap.fromTo(footerFeatures,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: {
            trigger: '.footer-features',
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }

    /* ── Cleanup ── */
    return () => {
      clearTimeout(forceNavbarVisibleTimer);
      document.removeEventListener('intro-start', playIntro);
      clearTimeout(fallbackTimer);
      window.removeEventListener('resize', setActiveDotFromViewport);
      if (window.__rmduCursorCleanup) window.__rmduCursorCleanup();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  /* ── Menu Toggle Handler ── */
  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleSearchToggle = () => {
    setIsSearchActive((prev) => !prev);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    window.location.hash = `#/search/${encodeURIComponent(query)}`;
    setIsSearchActive(false);
  };

  useEffect(() => {
    if (isMenuOpen) {
      setIsSearchActive(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const panel = searchPanelRef.current;
    if (!panel) return;

    const form = panel.querySelector('.nav-search-form');
    const input = panel.querySelector('.nav-search-input');
    const submit = panel.querySelector('.nav-search-submit');

    if (searchAnimationRef.current) {
      searchAnimationRef.current.kill();
      searchAnimationRef.current = null;
    }

    if (isSearchActive) {
      const focusTimer = setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 260);

      const toggleRect = searchToggleRef.current?.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const startScaleX = toggleRect && panelRect.width ? Math.max(0.32, toggleRect.width / panelRect.width) : 0.36;
      const startScaleY = toggleRect && panelRect.height ? Math.max(0.2, toggleRect.height / panelRect.height) : 0.24;
      const startX = toggleRect ? (toggleRect.right - panelRect.right) : 0;
      const startY = toggleRect ? (toggleRect.top - panelRect.top) : -18;

      gsap.set(panel, { pointerEvents: 'auto' });
      searchAnimationRef.current = gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(panel,
          {
            autoAlpha: 0,
            x: startX,
            y: startY,
            scaleX: startScaleX,
            scaleY: startScaleY,
            rotationX: 7,
            filter: 'blur(2px)',
            clipPath: 'inset(0% 0% 100% 0%)'
          },
          {
            autoAlpha: 1,
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotationX: 0,
            filter: 'blur(0px)',
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.78,
            ease: 'expo.out'
          }
        )
        .fromTo(form,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.45 },
          '-=0.42'
        )
        .fromTo([input, submit],
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07 },
          '-=0.28'
        );

      const handleOutsideClick = (event) => {
        const target = event.target;
        if (
          searchPanelRef.current &&
          searchToggleRef.current &&
          !searchPanelRef.current.contains(target) &&
          !searchToggleRef.current.contains(target)
        ) {
          setIsSearchActive(false);
        }
      };

      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          setIsSearchActive(false);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);

      return () => {
        clearTimeout(focusTimer);
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }

    searchAnimationRef.current = gsap.timeline()
      .to([submit, input], {
        autoAlpha: 0,
        y: 8,
        duration: 0.22,
        stagger: 0.03,
        ease: 'power2.in'
      })
      .to(form, {
        autoAlpha: 0,
        y: 8,
        duration: 0.2,
        ease: 'power2.in'
      }, '-=0.18')
      .to(panel, {
        x: searchToggleRef.current ? (searchToggleRef.current.getBoundingClientRect().right - panel.getBoundingClientRect().right) : 0,
        autoAlpha: 0,
        y: searchToggleRef.current ? (searchToggleRef.current.getBoundingClientRect().top - panel.getBoundingClientRect().top) : -14,
        scaleX: searchToggleRef.current ? Math.max(0.32, searchToggleRef.current.getBoundingClientRect().width / panel.getBoundingClientRect().width) : 0.36,
        scaleY: searchToggleRef.current ? Math.max(0.2, searchToggleRef.current.getBoundingClientRect().height / panel.getBoundingClientRect().height) : 0.24,
        rotationX: 6,
        filter: 'blur(1.5px)',
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.4,
        ease: 'power3.in',
        onComplete: () => gsap.set(panel, { pointerEvents: 'none' })
      }, '-=0.1');
  }, [isSearchActive]);

  const menuLinks = [
    { label: 'Budget Killer', href: '#/budget-killer', tag: 'Value' },
    { label: 'Gaming Guru', href: '#/gaming-guru', tag: 'Performance' },
    { label: 'Camera Champ', href: '#/camera-champ', tag: 'Imaging' },
    { label: 'Battery Boss', href: '#/battery-boss', tag: 'Endurance' },
    { label: 'G.O.A.T', href: '#/goat', tag: 'Flagship' },
    { label: 'Contact Us', href: '#footer', tag: 'Support' },
  ];

  const handleNavLinkClick = () => {
    setIsMenuOpen(false);
  };

  /* ── Section dot click handler ── */
  const sectionIds = ['hero', 'problem', 'categories', 'trust', 'offers'];
  const handleDotClick = (index) => {
    const section = document.getElementById(sectionIds[index]);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Film Grain */}
      <div className="film-grain" aria-hidden="true"></div>

      {/* ═══ Preloader ═══ */}
      <div className="preloader" id="preloader" ref={preloaderRef}>
        <img src={logoImg} alt="RMDU" className="preloader-logo-img" id="preloader-logo" ref={preloaderLogoRef} />
        <div className="preloader-bar" id="preloader-bar" ref={preloaderBarRef}></div>
        <p className="preloader-tagline" id="preloader-tagline" ref={preloaderTagRef}>Upgrade Your Statement</p>
      </div>

      {/* ═══ Custom Cursor — RR Style ═══ */}
      <div className="cursor-dot" id="cursor-dot" ref={cursorDotRef}></div>
      <div className="cursor-ring" id="cursor-ring" ref={cursorRingRef}></div>

      {/* ═══ Section Dots — RR Side Navigation ═══ */}
      <ul className="rrmc-carousel-pagination" id="section-dots" ref={sectionDotsRef}>
        {sectionIds.map((id, index) => (
          <li key={id} className="rrmc-carousel-nav-item">
            <button
              className={index === 0 ? 'active' : ''}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to ${id} section`}
            />
          </li>
        ))}
      </ul>

      {/* ═══ Animated Navbar ═══ */}
      <nav className={`rr-navbar ${isSearchActive ? 'search-active' : ''}`} id="navbar" ref={headerRef}>
        {/* Left: Menu */}
        <div className="nav-left" onClick={handleMenuToggle} style={{ cursor: 'pointer' }}>
          {/* Premium Animated Hamburger */}
          <div className={`premium-hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span className="line top"></span>
            <span className="line mid"></span>
            <span className="line bot"></span>
          </div>
          <span className="menu-text-wrapper">
            <span className="menu-text" ref={menuTextRef}>
              {isMenuOpen ? 'CLOSE' : 'MENU'}
            </span>
          </span>
        </div>

        {/* Center: Logos */}
        <div className="nav-center" style={{ cursor: 'pointer' }} onClick={() => { const section = document.getElementById('hero'); if (section) section.scrollIntoView({ behavior: 'smooth' }); }}>
          <div className="logo-slicer" ref={navLogoImgRef}>
            {/* Primary Logo Slices */}
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={`p-${i}`}
                className={`logo-slice primary-slice slice-${i}`}
                style={{ 
                  clipPath: `inset(${i * 20}% 0 ${100 - (i + 1) * 20}% 0)`,
                  backgroundImage: `url(${logoImg})`
                }}
              />
            ))}
            
            {/* Secondary Logo Slices */}
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={`s-${i}`}
                className={`logo-slice secondary-slice slice-${i}`}
                style={{ 
                  clipPath: `inset(${i * 20}% 0 ${100 - (i + 1) * 20}% 0)`,
                  backgroundImage: `url(${logo2Img})`
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: Animated Search */}
        <div className={`nav-right ${isSearchActive ? 'active' : ''}`}>
          <button
            type="button"
            className="search-toggle"
            onClick={handleSearchToggle}
            aria-label={isSearchActive ? 'Close Search' : 'Open Search'}
            aria-expanded={isSearchActive}
            aria-controls="nav-search-panel"
            ref={searchToggleRef}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="square" />
            </svg>
            <span className="search-label-switch" aria-hidden="true">
              <span className="search-label search-label-open">Search</span>
              <span className="search-label search-label-close">Close Search</span>
            </span>
          </button>
        </div>

        <div
          id="nav-search-panel"
          className={`nav-search-panel ${isSearchActive ? 'active' : ''}`}
          ref={searchPanelRef}
        >
          <form className="nav-search-form" onSubmit={handleSearchSubmit}>
            <label htmlFor="nav-search-input" className="sr-only">Search phones</label>
            <input
              id="nav-search-input"
              className="nav-search-input"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by model, category, battery, camera..."
              autoComplete="off"
            />
            <button type="submit" className="nav-search-submit">Find</button>
          </form>
        </div>
      </nav>

      {/* ═══ Transparent Black Overlay ═══ */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} id="overlay" onClick={handleMenuToggle}></div>

      {/* ═══ Sliding Sidebar ═══ */}
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`} id="sidebar">
        {/* Header area for the CLOSE button */}
        <div className="sidebar-header">
          <div className="sidebar-eyebrow">RMDU Navigation</div>
          <div className="close-btn" id="closeMenu" onClick={handleMenuToggle}>
            <span className="close-icon">&#10005;</span>
            <span>Close</span>
          </div>
        </div>

        {/* The Menu Links */}
        <ul className="sidebar-menu">
          {menuLinks.map((item, index) => (
            <li key={item.label}>
              <a href={item.href} onClick={handleNavLinkClick}>
                <span className="sidebar-item-meta">{String(index + 1).padStart(2, '0')} • {item.tag}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer-note">Curated guides with zero-bias recommendations.</div>
      </aside>

      {/* ═══ Main Content ═══ */}
      <main id="main-content" className="main-content">

        {/* ─── SECTION 1: HERO ─── */}
        <section className="section hero-section" id="hero">
          <div className="hero-bg">
            <video autoPlay loop muted playsInline className="section-video">
              <source src={bgv5} type="video/mp4" />
            </video>
          </div>
          <div className="section-overlay hero-gradient"></div>

          <div className="hero-content">
            <p className="hero-subtitle">Don't Just Upgrade Your Phone</p>
            <h1 className="hero-title">Upgrade Your<br />Statement</h1>
            <p className="hero-description">Honest guidance. Full transparency. Zero bias.</p>
            <a href="#problem" className="btn-cta magnetic-btn">
              Discover More <span className="arrow">→</span>
            </a>
          </div>

          <div className="scroll-indicator">
            <span>Scroll</span>
            <div className="scroll-line"></div>
          </div>
        </section>

        {/* ─── SECTION 2: THE PROBLEM ─── */}
        <section className="section" id="problem">
          <div className="section-bg">
            <video autoPlay loop muted playsInline className="section-video">
              <source src={bgv3} type="video/mp4" />
            </video>
          </div>
          <div className="section-overlay dark-gradient"></div>

          <div className="section-content text-left pl-lg">
            <p className="section-label reveal">The Problem</p>
            <h2 className="section-title reveal reveal-delay-1">
              Mobile Buying Is<br /><span className="highlight">Broken</span>
            </h2>
            <div className="divider-line reveal reveal-delay-2"></div>
            <p className="section-description reveal reveal-delay-3">
              Shopkeepers push phones with the highest margins, not the best fit for you. Specs are confusing, reviews are paid, and real-world performance rarely matches marketing claims.
            </p>
            <p className="section-description reveal reveal-delay-4 mt-sm">
              RMDU cuts through the noise with benchmark-driven, zero-bias recommendations — so you get the right phone, not the most profitable one.
            </p>
          </div>
        </section>

        {/* ─── SECTION 3: CATEGORIES ─── */}
        <section className="section section-categories" id="categories">
          <div className="section-bg">
            <video autoPlay loop muted playsInline className="section-video">
              <source src={bgv4} type="video/mp4" />
            </video>
          </div>
          <div className="section-overlay dark-gradient"></div>

          <div className="section-content full-width text-center">
            <p className="section-label reveal">The Collection</p>
            <h2 className="section-title reveal reveal-delay-1">Explore The Range</h2>
            <div className="title-underline center reveal reveal-delay-1"></div>

            <div className="card-grid mt-md">
              {/* Budget Killer */}
              <div className="tilt-card reveal reveal-delay-2">
                <div className="card-inner">
                  <div className="card-video-bg">
                    <video autoPlay loop muted playsInline>
                      <source src={budgetkillerVid} type="video/mp4" />
                    </video>
                  </div>
                  <div className="card-overlay"></div>
                  <div className="card-content">
                    <div className="card-icon">💸</div>
                    <h3 className="card-title">Budget Killer</h3>
                    <p className="card-desc">Maximum value under ₹15K.</p>
                    <a href="#/budget-killer" className="card-cta">Explore →</a>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </div>
              {/* Gaming Guru */}
              <div className="tilt-card reveal reveal-delay-3">
                <div className="card-inner">
                  <div className="card-video-bg">
                    <video autoPlay loop muted playsInline>
                      <source src={gamingguruVid} type="video/mp4" />
                    </video>
                  </div>
                  <div className="card-overlay"></div>
                  <div className="card-content">
                    <div className="card-icon">🎮</div>
                    <h3 className="card-title">Gaming Guru</h3>
                    <p className="card-desc">Unthrottled frame rates. Elite cooling.</p>
                    <a href="#/gaming-guru" className="card-cta">Explore →</a>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </div>
              {/* Camera Champ */}
              <div className="tilt-card reveal reveal-delay-4">
                <div className="card-inner">
                  <div className="card-video-bg">
                    <video autoPlay loop muted playsInline>
                      <source src={cameraVid} type="video/mp4" />
                    </video>
                  </div>
                  <div className="card-overlay"></div>
                  <div className="card-content">
                    <div className="card-icon">📸</div>
                    <h3 className="card-title">Camera Champ</h3>
                    <p className="card-desc">Studio-grade optics in your pocket.</p>
                    <a href="#/camera-champ" className="card-cta">Explore →</a>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </div>
              {/* Battery Boss */}
              <div className="tilt-card reveal reveal-delay-2">
                <div className="card-inner">
                  <div className="card-video-bg">
                    <video autoPlay loop muted playsInline>
                      <source src={battryVid} type="video/mp4" />
                    </video>
                  </div>
                  <div className="card-overlay"></div>
                  <div className="card-content">
                    <div className="card-icon">🔋</div>
                    <h3 className="card-title">Battery Boss</h3>
                    <p className="card-desc">All-day power. Zero compromise.</p>
                    <a href="#/battery-boss" className="card-cta">Explore →</a>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </div>
              {/* G.O.A.T */}
              <div className="tilt-card reveal reveal-delay-3">
                <div className="card-inner">
                  <div className="card-video-bg">
                    <video autoPlay loop muted playsInline>
                      <source src={goatVid} type="video/mp4" />
                    </video>
                  </div>
                  <div className="card-overlay"></div>
                  <div className="card-content">
                    <div className="card-icon">👑</div>
                    <h3 className="card-title">G.O.A.T</h3>
                    <p className="card-desc">The absolute best. No limits.</p>
                    <a href="#/goat" className="card-cta">Explore →</a>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* ─── SECTION 4: TRUST ─── */}
        <section className="section" id="trust">
          <div className="section-bg">
            <video autoPlay loop muted playsInline className="section-video">
              <source src={bgv2} type="video/mp4" />
            </video>
          </div>
          <div className="section-overlay dark-gradient"></div>

          <div className="section-content text-center" style={{ margin: '0 auto' }}>
            <p className="section-label reveal">Why RMDU</p>
            <h2 className="section-title reveal reveal-delay-1">100% Data. 0% Bias.</h2>
            <div className="title-underline center reveal reveal-delay-1"></div>

            <div className="trust-features mt-md">
              <div className="trust-feature reveal reveal-delay-2">
                <span className="trust-feature-icon">🔬</span>
                <h4>Benchmark-Driven</h4>
                <p>Real-world tests, not marketing specs.</p>
              </div>
              <div className="trust-feature reveal reveal-delay-3">
                <span className="trust-feature-icon">⚖️</span>
                <h4>Zero Brand Partnerships</h4>
                <p>We don't take money from brands. Ever.</p>
              </div>
              <div className="trust-feature reveal reveal-delay-4">
                <span className="trust-feature-icon">🎯</span>
                <h4>Tailored For You</h4>
                <p>Matched to how you actually use your phone.</p>
              </div>
            </div>

            <div className="mt-lg reveal reveal-delay-4">
              <a href="#categories" className="btn-cta magnetic-btn" style={{ opacity: 1 }}>
                Discover More <span className="arrow">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* ─── SECTION 5: OFFERS ─── */}
        <section className="section" id="offers">
          <div className="section-bg">
            <video autoPlay loop muted playsInline className="section-video">
              <source src={offerVid} type="video/mp4" />
            </video>
          </div>
          <div className="section-overlay radial-gradient"></div>

          <div className="section-content text-center" style={{ margin: '0 auto' }}>
            <p className="section-label reveal">Exclusive</p>
            <h2 className="section-title reveal reveal-delay-1">Offers &amp; Deals</h2>
            <div className="title-underline center reveal reveal-delay-1"></div>
            <p className="section-description reveal reveal-delay-2" style={{ margin: '0 auto', textAlign: 'center' }}>
              The best prices curated by RMDU — no hidden commissions.
            </p>
            <div className="mt-lg reveal reveal-delay-3">
              <button className="btn-cta-outline magnetic-btn">
                Coming Soon <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* The invisible spacer for the fixed revealing footer */}
      <div className="footer-spacer" aria-hidden="true"></div>

      {/* ═══ Footer — Rolls-Royce Style ═══ */}
      <footer className="footer" id="footer">
        {/* Feature cards row */}
        <div className="footer-features">
          <div className="footer-feature-card">
            <h3>Data-Backed Buying Advice</h3>
            <p>Every recommendation is based on practical testing, performance benchmarks, and transparent evaluation criteria.</p>
          </div>
          <div className="footer-feature-card">
            <h3>Category-Specific Expertise</h3>
            <p>From value devices to flagship performers, we map each model to real user needs and budgets.</p>
          </div>
          <div className="footer-feature-card">
            <h3>Independent & Transparent</h3>
            <p>No paid rankings, no hidden influence. Just clear, unbiased guidance to help you buy with confidence.</p>
          </div>
        </div>

        {/* Centered logo */}
        <div className="footer-logo-section">
          <img src={logoImg} alt="RMDU Mobile" className="footer-logo" />
          <p className="footer-tagline">Independent Mobile Intelligence</p>
        </div>

        {/* Link rows */}
        <div className="footer-link-rows">
          <a href="#/budget-killer">Budget Killer</a>
          <a href="#/gaming-guru">Gaming Guru</a>
          <a href="#/camera-champ">Camera Champ</a>
          <a href="#/battery-boss">Battery Boss</a>
          <a href="#/goat">G.O.A.T</a>
          <a href="#trust">About Us</a>
          <a href="mailto:contact@rmdumobile.com">Contact</a>
          <a href="#footer">Business Enquiries</a>
          <a href="#offers">Offers</a>
        </div>

        {/* Social icons */}
        <div className="footer-social">
          <a href="#" aria-label="YouTube">
            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
          </a>
          <a href="#" aria-label="Instagram">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
          </a>
          <a href="#" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
          <a href="#" aria-label="X (Twitter)">
            <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} RMDU Mobile. All rights reserved. Built on integrity, clarity, and performance insight.</p>
        </div>
      </footer>
    </>
  );
}
