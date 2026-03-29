import React, { useRef } from 'react';

const Card = ({ icon, title, desc }) => {
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current || !innerRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -15; 
    const rotateY = ((x - centerX) / centerX) * 15;
    
    // Apply transform and smooth shadow tracking
    innerRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    innerRef.current.style.boxShadow = `${-rotateY}px ${rotateX}px 30px rgba(0,0,0,0.5)`;
  };

  const handleMouseLeave = () => {
    if (!innerRef.current) return;
    innerRef.current.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    innerRef.current.style.boxShadow = `none`;
  };

  return (
    <div 
      className="tilt-card reveal" 
      ref={cardRef} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-inner" ref={innerRef}>
        <div className="card-icon">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{desc}</p>
      </div>
    </div>
  );
};

export default function Categories() {
  const categories = [
    { id: 1, icon: '💸', title: 'Budget Killer', desc: 'Maximum value. Uncompromised performance.' },
    { id: 2, icon: '🎮', title: 'Gaming Guru', desc: 'Unthrottled frame rates. Elite cooling.' },
    { id: 3, icon: '📸', title: 'Camera Champ', desc: 'Studio-grade optics in your pocket.' },
  ];

  return (
    <section className="section category-section" id="categories">
      <div className="section-content full-width text-center">
        <p className="section-label reveal">The Collection</p>
        <h2 className="section-title reveal reveal-delay-1">Curated Excellence</h2>
        
        <div className="card-grid mt-lg">
          {categories.map((cat, i) => (
            <Card key={cat.id} icon={cat.icon} title={cat.title} desc={cat.desc} delay={i + 2}/>
          ))}
        </div>
      </div>
    </section>
  );
}
