import React from 'react';
import logoImg from '/media/logo.png';

export default function CategoryPage({ pageKey, title, subtitle, description, videoSrc, highlights = [] }) {
  return (
    <div className={`category-page ${pageKey ? `category-page--${pageKey}` : ''}`}>
      <header className="category-nav">
        <a href="#/" className="category-back-link" aria-label="Back to homepage">
          Home
        </a>
        <img src={logoImg} alt="RMDU Mobile" className="category-nav-logo" />
        <a href="#/" className="category-back-link" aria-label="Go to contact section on homepage">
          Contact
        </a>
      </header>

      <section className="category-hero">
        <video className="category-hero-video" autoPlay loop muted playsInline>
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className="category-hero-overlay" />

        <div className="category-hero-content">
          <p className="category-eyebrow">RMDU Category</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <a href="#/" className="category-cta">
            Explore More Categories
          </a>
        </div>
      </section>

      <section className="category-content-wrap">
        <article className="category-content-card">
          <h2>Why {title}</h2>
          <p>{description}</p>
        </article>

        <article className="category-content-card">
          <h2>What We Evaluate</h2>
          <ul className="category-highlight-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
