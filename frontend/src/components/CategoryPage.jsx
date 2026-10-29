/**
 * Category page — fully data-driven.
 *
 * The page is addressed by whatever slug the URL carries and asks
 * `/site/categories/{slug}` for its header copy and its ranked members. That
 * means a row inserted into `categories` (in SQL or through the console) gets a
 * working page — hero video, highlights, ranked grid — with no code change and
 * no deploy.
 */

import React, { useEffect, useMemo, useState } from 'react';
import logoImg from '/media/logo.png';

import DataState, { EmptyState } from './DataState';
import PhoneCard from './PhoneCard';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 12;

/** `#rrggbb` → `rgba(...)`, so the accent can also be used at partial opacity. */
function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string') return undefined;
  const value = hex.trim().replace(/^#/, '');
  const expanded = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return undefined;
  const int = parseInt(expanded, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CategoryPage({ slug }) {
  const [page, setPage] = useState(1);
  const [ranking, setRanking] = useState('manual');

  /* A new slug is a new page: both controls reset rather than carrying a page
   * number that may not exist in the next category. */
  useEffect(() => {
    setPage(1);
    setRanking('manual');
  }, [slug]);

  const { data, error, loading, refetch } = useApi(`/site/categories/${encodeURIComponent(slug)}`, {
    params: { page, page_size: PAGE_SIZE, ranking },
  });

  const themeVars = useMemo(() => {
    const accent = hexToRgba(data?.color_hex);
    if (!accent) return undefined;
    return {
      '--category-accent': accent,
      '--category-accent-soft': hexToRgba(data.color_hex, 0.6),
      '--category-cta-border': hexToRgba(data.color_hex, 0.45),
    };
  }, [data?.color_hex]);

  const notFound = error?.code === 'category_not_found';
  const members = data?.devices || [];
  const meta = data?.meta;
  const highlights = data?.highlights || [];

  return (
    <div className="category-page" style={themeVars}>
      <header className="category-nav">
        <a href="#/" className="category-back-link" aria-label="Back to homepage">
          Home
        </a>
        <img src={logoImg} alt="RMDU Mobile" className="category-nav-logo" />
        <a href="#/" className="category-back-link" aria-label="Go to contact section on homepage">
          Contact
        </a>
      </header>

      {notFound ? (
        <section className="category-content-wrap">
          <article className="category-content-card">
            <h2>Nothing here yet</h2>
            <p>
              No category matches <strong>{slug}</strong>. It may have been unpublished, or the address
              is mistyped.
            </p>
            <a href="#/" className="category-cta">
              Back to all categories
            </a>
          </article>
        </section>
      ) : (
        <>
          <section className="category-hero">
            {data?.hero_video_url ? (
              <video className="category-hero-video" autoPlay loop muted playsInline poster={data?.cover_image_url || undefined}>
                <source src={data.hero_video_url} type="video/mp4" />
              </video>
            ) : data?.cover_image_url ? (
              <img className="category-hero-video" src={data.cover_image_url} alt="" aria-hidden="true" />
            ) : null}
            <div className="category-hero-overlay" />

            <div className="category-hero-content">
              <p className="category-eyebrow">{data?.icon ? `${data.icon} ` : ''}RMDU Category</p>
              <h1>{data?.name || slug}</h1>
              <p>{data?.subtitle || data?.description || 'Curated by how the phone actually performs.'}</p>
              <a href="#/" className="category-cta">
                Explore More Categories
              </a>
            </div>
          </section>

          {data?.description || highlights.length ? (
            <section className="category-content-wrap">
              {data?.description ? (
                <article className="category-content-card">
                  <h2>Why {data.name}</h2>
                  <p>{data.description}</p>
                </article>
              ) : null}

              {highlights.length ? (
                <article className="category-content-card">
                  <h2>What We Evaluate</h2>
                  <ul className="category-highlight-list">
                    {highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </section>
          ) : null}

          <section className="category-members">
            <div className="category-toolbar">
              <p className="category-toolbar-count">
                {meta ? `${meta.total} ranked ${meta.total === 1 ? 'device' : 'devices'}` : 'Loading members…'}
              </p>
              <div className="category-toolbar-group" role="group" aria-label="Ranking mode">
                <button
                  type="button"
                  className={`category-toggle ${ranking === 'manual' ? 'is-active' : ''}`}
                  onClick={() => {
                    setRanking('manual');
                    setPage(1);
                  }}
                >
                  Editor ranking
                </button>
                <button
                  type="button"
                  className={`category-toggle ${ranking === 'auto' ? 'is-active' : ''}`}
                  onClick={() => {
                    setRanking('auto');
                    setPage(1);
                  }}
                >
                  Score ranking
                </button>
              </div>
            </div>

            <DataState
              loading={loading}
              error={error}
              onRetry={refetch}
              errorLabel="This category could not load."
              rows={4}
              label="Loading ranked devices…"
            >
              {members.length ? (
                <>
                  <div className="phone-grid">
                    {members.map((item) => (
                      <PhoneCard
                        key={item.device?.id || `${item.rank}-${item.device?.name}`}
                        device={{ ...item.device, brand_name: item.device?.brand?.name }}
                        rank={item.rank}
                        secondaryScore={item.category_score}
                      />
                    ))}
                  </div>

                  {meta && meta.total_pages > 1 ? (
                    <nav className="category-pager" aria-label="Category pages">
                      <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                        Previous
                      </button>
                      <span className="category-pager-status">
                        Page {meta.page} / {meta.total_pages}
                      </span>
                      <button type="button" disabled={!meta.has_next} onClick={() => setPage((value) => value + 1)}>
                        Next
                      </button>
                    </nav>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title="No devices ranked here yet."
                  hint="Add members to this category in the admin console and they appear on this page immediately."
                />
              )}
            </DataState>
          </section>
        </>
      )}
    </div>
  );
}
