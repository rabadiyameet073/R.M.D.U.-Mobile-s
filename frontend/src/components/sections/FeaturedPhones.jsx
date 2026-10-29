/**
 * Featured device grid.
 *
 * Fed by `site.featured` (admin-flagged devices, newest first as a fallback), so
 * flagging a device in the console — or writing the row in SQL — puts it here.
 */

import React from 'react';

import DataState, { EmptyState } from '../DataState';
import PhoneCard from '../PhoneCard';

export default function FeaturedPhones({
  devices,
  loading,
  error,
  onRetry,
  eyebrow = 'Live from the catalog',
  title = 'Trending picks',
  subtitle,
  action,
  columns = 'three',
}) {
  const items = devices || [];
  const isEmpty = !loading && !error && !items.length;
  const gridClass = columns === 'four' ? 'phone-grid phone-grid--wide' : 'phone-grid';

  return (
    <section className="live-section">
      <div className="live-section-head">
        <div>
          <p className="live-section-eyebrow">{eyebrow}</p>
          <h2 className="live-section-title">{title}</h2>
          {subtitle ? <p className="live-section-sub">{subtitle}</p> : null}
        </div>
        {action ? (
          <a className="live-section-link" href={action.href}>
            {action.label}
          </a>
        ) : null}
      </div>

      <DataState
        loading={loading}
        error={error}
        onRetry={onRetry}
        errorLabel="Featured devices could not load."
        rows={3}
        label="Loading devices…"
        empty={isEmpty}
        emptyTitle="No devices published yet."
        emptyHint="Devices marked as featured in the admin console appear here."
      >
        {items.length ? (
          <div className={gridClass}>
            {items.map((device) => (
              <PhoneCard key={device.id} device={device} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </DataState>
    </section>
  );
}
