/**
 * Search page — `#/search/<query>`.
 *
 * The header search box already navigates here; this page turns that URL into a
 * `/devices` query (`q`, `sort`, `page`), so results come from the same rows the
 * admin console edits. An empty query lists the whole active catalog rather
 * than an empty screen.
 */

import React, { useEffect, useState } from 'react';
import logoImg from '/media/logo.png';

import DataState, { EmptyState } from './DataState';
import PhoneCard from './PhoneCard';
import { useApi } from '../lib/useApi';

const PAGE_SIZE = 12;

const SORTS = [
  ['relevance', 'Relevance'],
  ['newest', 'Newest'],
  ['price_asc', 'Price ↑'],
  ['price_desc', 'Price ↓'],
  ['score_desc', 'Top rated'],
];

export default function SearchPage({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [draft, setDraft] = useState(initialQuery);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);

  /* The URL is the source of truth: back/forward and an in-page submit both
   * land here through this effect, so there is one code path for "run a new
   * search". */
  useEffect(() => {
    setQuery(initialQuery);
    setDraft(initialQuery);
    setPage(1);
  }, [initialQuery]);

  const { data, error, loading, refetch } = useApi('/devices', {
    params: {
      q: query || undefined,
      sort,
      page,
      page_size: PAGE_SIZE,
    },
  });

  const items = data?.items || [];
  const meta = data?.meta;

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = draft.trim();
    window.location.hash = next ? `#/search/${encodeURIComponent(next)}` : '#/search/';
  };

  return (
    <div className="search-page">
      <header className="category-nav">
        <a href="#/" className="category-back-link" aria-label="Back to homepage">
          Home
        </a>
        <img src={logoImg} alt="RMDU Mobile" className="category-nav-logo" />
        <a href="#/" className="category-back-link" aria-label="Go to contact section on homepage">
          Contact
        </a>
      </header>

      <div className="search-wrap">
        <form className="search-form" onSubmit={handleSubmit} role="search">
          <input
            type="search"
            className="search-input"
            placeholder="Search a phone, e.g. Pixel 8a"
            value={draft}
            maxLength={80}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Search devices"
          />
          <button type="submit" className="search-submit">
            Search
          </button>
        </form>

        <div className="search-meta">
          <span>
            {meta
              ? `${meta.total} ${meta.total === 1 ? 'result' : 'results'}${query ? ` for "${query}"` : ' in the catalog'}`
              : 'Searching the live catalog…'}
          </span>
          <span className="category-toolbar-group">
            {SORTS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`category-toggle ${sort === value ? 'is-active' : ''}`}
                onClick={() => {
                  setSort(value);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </span>
        </div>

        <DataState
          loading={loading}
          error={error}
          onRetry={refetch}
          errorLabel="Search could not run."
          rows={4}
          label="Searching…"
        >
          {items.length ? (
            <>
              <div className="phone-grid">
                {items.map((device) => (
                  <PhoneCard key={device.id} device={{ ...device, brand_name: device.brand?.name }} />
                ))}
              </div>

              {meta && meta.total_pages > 1 ? (
                <nav className="category-pager" aria-label="Search pages">
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
              title={query ? `No phone matches "${query}".` : 'The catalog is empty.'}
              hint={
                query
                  ? 'Try a shorter term, or browse a category from the home page.'
                  : 'Publish devices in the admin console and they appear here immediately.'
              }
            />
          )}
        </DataState>
      </div>
    </div>
  );
}
