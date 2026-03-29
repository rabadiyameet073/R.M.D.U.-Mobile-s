import React, { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const requestRef = useRef();

  // We use references to mutable values to calculate lerp
  const mouse = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const ring = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    // Only apply custom cursor on fine pointers
    const matchMedia = window.matchMedia('(pointer: fine)');
    if (!matchMedia.matches) return;

    const handleMouseMove = (e) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x}px, ${mouse.current.y}px) translate(-50%, -50%)`;
      }
    };

    const handleMouseEnterInteractable = () => {
      if (dotRef.current) dotRef.current.classList.add('hover');
      if (ringRef.current) ringRef.current.classList.add('hover');
    };

    const handleMouseLeaveInteractable = () => {
      if (dotRef.current) dotRef.current.classList.remove('hover');
      if (ringRef.current) ringRef.current.classList.remove('hover');
    };

    const animate = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.15;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.15;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    requestRef.current = requestAnimationFrame(animate);

    // Global mutation observer to attach hover events to interactive elements
    const observer = new MutationObserver(() => {
       const interactables = document.querySelectorAll('a, button, .magnetic-btn');
       interactables.forEach(el => {
           el.removeEventListener('mouseenter', handleMouseEnterInteractable);
           el.removeEventListener('mouseleave', handleMouseLeaveInteractable);
           el.addEventListener('mouseenter', handleMouseEnterInteractable);
           el.addEventListener('mouseleave', handleMouseLeaveInteractable);
       });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dotRef}></div>
      <div className="cursor-ring" ref={ringRef}></div>
    </>
  );
}
