import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Trust() {
  const sectionRef = useRef(null);
  const bgRef = useRef(null);
  const num1Ref = useRef(null);
  const num2Ref = useRef(null);

  useEffect(() => {
    // Parallax background
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

    // Counting Animations
    const animateNumber = (ref, targetVal, format) => {
      let startVal = { val: 0 };
      gsap.to(startVal, {
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          toggleActions: "play none none none"
        },
        val: targetVal,
        duration: 2,
        ease: "power2.out",
        onUpdate: () => {
          if (ref.current) {
             ref.current.innerText = Math.floor(startVal.val) + format;
          }
        }
      });
    };

    if (num1Ref.current) animateNumber(num1Ref, 100, "%");
    if (num2Ref.current) animateNumber(num2Ref, 0, "");
    
  }, []);

  return (
    <section className="section section-trust" id="trust" ref={sectionRef}>
      <div className="section-bg" ref={bgRef}>
        <video autoPlay loop muted playsInline className="section-video">
          <source src="/media/bgv1.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="hero-overlay"></div>
      
      <div className="section-content text-center">
        <h2 className="section-title reveal">Built on Transparency & Trust</h2>
        
        <div className="trust-grid mt-lg">
          <div className="trust-item reveal reveal-delay-1">
            <div className="trust-number" ref={num1Ref}>0%</div>
            <div className="trust-label">Unbiased Data</div>
          </div>
          <div className="trust-item reveal reveal-delay-2">
            <div className="trust-number" ref={num2Ref}>0</div>
            <div className="trust-label">Brand Bias</div>
          </div>
        </div>

        <div className="mt-xl reveal reveal-delay-3">
          <button className="btn-cta magnetic-btn">
            Find Your Perfect Phone <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
