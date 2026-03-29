import React, { useEffect, useState } from 'react';

export default function Header({ isMenuOpen, setIsMenuOpen }) {
  useEffect(() => {
    // Scroll animation removed - navbar stays same throughout
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-toggle" 
          aria-label="Toggle Menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="menu-text">{isMenuOpen ? 'Close' : 'Menu'}</span>
        </button>
      </div>
      
      <div className="header-center">
        <a href="#" className="logo">RMDU Mobile</a>
      </div>
      
      <div className="header-right">
        <a href="#" className="header-link">Discover</a>
        <a href="#" className="header-link">Join RMDU</a>
      </div>
    </header>
  );
}
