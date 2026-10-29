/**
 * Category tiles — the home page's "Explore The Range" grid.
 *
 * Every tile is one `categories` row: name, icon, accent colour, subtitle,
 * hero video, and the first members of its ranking. Publishing a new category
 * therefore adds a tile, and re-ordering `display_order` re-orders the grid,
 * with no frontend change.
 */

import React from 'react';

import { categoryHref } from '../../lib/api';
import DataState, { EmptyState } from '../DataState';

export default function LiveCategories({ categories, loading, error, onRetry, limit = 6 }) {
  const tiles = (categories || []).slice(0, limit);
  const isEmpty = !loading && !error && !tiles.length;

  return (
    <DataState
      loading={loading}
      error={error}
      onRetry={onRetry}
      errorLabel="Categories could not load."
      rows={3}
      label="Loading categories…"
      empty={isEmpty}
      emptyTitle="No categories published yet."
      emptyHint="Add a category in the admin console and its tile appears here on the next visit."
    >
      {tiles.length ? (
        <div className="live-category-grid">
          {tiles.map((category) => {
            const members = category.devices || [];
            return (
              <a
                key={category.id}
                className="live-category-card"
                href={categoryHref(category)}
                style={category.color_hex ? { '--card-accent': category.color_hex } : undefined}
              >
                {category.hero_video_url ? (
                  <div className="live-category-media">
                    <video autoPlay loop muted playsInline poster={category.cover_image_url || undefined}>
                      <source src={category.hero_video_url} type="video/mp4" />
                    </video>
                  </div>
                ) : category.cover_image_url ? (
                  <div className="live-category-media">
                    <img src={category.cover_image_url} alt="" aria-hidden="true" />
                  </div>
                ) : null}

                <div className="live-category-overlay" />

                <div className="live-category-body">
                  <span className="live-category-icon" aria-hidden="true">
                    {category.icon || '•'}
                  </span>
                  <h3 className="live-category-name">{category.name}</h3>

                  {category.subtitle || category.description ? (
                    <p className="live-category-sub">{category.subtitle || category.description}</p>
                  ) : null}

                  {members.length ? (
                    <div className="live-category-members">
                      {members.map((entry) => (
                        <span key={entry.device?.id || entry.device?.name}>
                          {entry.rank ? `#${entry.rank} ` : ''}
                          {entry.device?.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="live-category-meta">
                    <span>
                      {category.device_count ?? 0} {(category.device_count ?? 0) === 1 ? 'device' : 'devices'}
                    </span>
                    <span>Explore →</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <EmptyState />
      )}
    </DataState>
  );
}
