import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Preloader() {
  const preloaderRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      gsap.to(preloaderRef.current, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: () => {
          if (preloaderRef.current) {
            preloaderRef.current.style.display = 'none';
          }
          // Optionally emit a global event that intro animations can listen to
          document.dispatchEvent(new CustomEvent('intro-start'));
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="preloader" ref={preloaderRef}>
      <div className="preloader-logo">RMDU</div>
      <div className="preloader-bar"></div>
    </div>
  );
}
