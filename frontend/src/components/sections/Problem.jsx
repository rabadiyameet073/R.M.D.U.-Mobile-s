import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Problem() {
  const sectionRef = useRef(null);
  const bgRef = useRef(null);

  useEffect(() => {
    // Parallax video
    gsap.to(bgRef.current, {
      yPercent: 20,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });

    // Reveal texts
    const reveals = sectionRef.current.querySelectorAll('.reveal');
    reveals.forEach(elem => {
      gsap.to(elem, {
        scrollTrigger: {
          trigger: elem,
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
      });
    });

  }, []);

  return (
    <section className="section section-problem" id="problem" ref={sectionRef}>
      <div className="section-bg" ref={bgRef}>
        <video autoPlay loop muted playsInline className="section-video">
          <source src="/media/bgv4.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-overlay"></div>
      
      <div className="section-content text-left pl-lg">
        <p className="section-label reveal">The Problem We Solve</p>
        <h2 className="section-title reveal reveal-delay-1">
          The Mobile Buying Experience<br/>Is <span className="highlight">Broken</span>
        </h2>
        <div className="divider-line reveal reveal-delay-2"></div>
        <p className="section-description reveal reveal-delay-3">
          Shopkeepers prioritize profit margins over your needs. You're sold features you'll never use, premium features you don't need, and phones that drain your wallet.
        </p>
        <p className="section-description reveal reveal-delay-4 mt-sm">
          It's time for transparency. True clarity, driven by real independent benchmarks, not commission.
        </p>
      </div>
    </section>
  );
}
