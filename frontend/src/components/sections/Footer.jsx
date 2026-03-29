import React from 'react';

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h2>RMDU MOBILE</h2>
          <p>Upgrade Your Statement.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Explore</h4>
            <a href="#">Budget Killer</a>
            <a href="#">Gaming Guru</a>
            <a href="#">Camera Champ</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} RMDU Mobile. Inspired by Excellence.</p>
      </div>
    </footer>
  );
}
