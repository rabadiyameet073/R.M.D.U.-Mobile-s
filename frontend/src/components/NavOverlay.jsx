import React from 'react';

export default function NavOverlay({ isMenuOpen, setIsMenuOpen }) {
  const links = [
    { name: 'Budget Killer', href: '#' },
    { name: 'Gaming Guru', href: '#' },
    { name: 'Camera Champ', href: '#' },
    { name: 'Battery Boss', href: '#' },
    { name: 'G.O.A.T', href: '#' },
    { name: 'Contact Us', href: '#' },
  ];

  return (
    <nav className={`nav-overlay ${isMenuOpen ? 'active' : ''}`} id="navOverlay">
      <div className="nav-overlay-content">
        <ul className="nav-overlay-links">
          {links.map((link, index) => (
            <li key={index}>
              <a 
                href={link.href} 
                className="nav-overlay-link"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
