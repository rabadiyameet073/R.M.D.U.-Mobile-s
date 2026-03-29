import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Hero() {
  const bgRef = useRef(null);
  const title1Ref = useRef(null);
  const title2Ref = useRef(null);
  const descRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    // Parallax background
    gsap.to(bgRef.current, {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: bgRef.current?.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // Intro Animations
    const playIntro = () => {
      const tl = gsap.timeline();
      tl.fromTo(title1Ref.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" })
        .fromTo(title2Ref.current, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" }, "-=0.8")
        .fromTo(descRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.8")
        .fromTo(btnRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.8");
    };

    document.addEventListener('intro-start', playIntro);
    // Fallback if event is missed
    const fallbackTimer = setTimeout(playIntro, 1600);

    return () => {
      document.removeEventListener('intro-start', playIntro);
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <section className="section hero-section" id="hero">
      <div className="hero-bg" ref={bgRef}>
        <video autoPlay loop muted playsInline className="hero-video">
          <source src="/media/bgv2.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-overlay"></div>
      
      <div className="hero-content">
        <p className="hero-subtitle" ref={title1Ref}>Don't Just Upgrade Your Phone</p>
        <h1 className="hero-title" ref={title2Ref}>Upgrade Your<br/>Statement</h1>
        <p className="hero-description" ref={descRef}>The ultimate mobile discovery experience.</p>
        <button className="btn-cta magnetic-btn" ref={btnRef}>
          Explore <span className="arrow">→</span>
        </button>
      </div>
      
      <div className="scroll-indicator">
        <span>Scroll</span>
        <div className="scroll-line"></div>
      </div>
    </section>
  );
}
