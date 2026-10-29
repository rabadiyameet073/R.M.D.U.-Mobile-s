/**
 * Loading / error / empty states for API-backed sections.
 *
 * A page that renders live data has three states besides success, and all three
 * must say something true: the request is running, the server refused (show the
 * server's own message and a retry), or there is genuinely nothing published
 * yet (which is a valid state for a fresh database, not a bug).
 */

import React from 'react';

export function LoadingState({ label = 'Loading the live catalog…', rows = 3 }) {
  return (
    <div className="data-state" role="status" aria-live="polite">
      <div className="data-state-skeleton" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <span key={index} className="data-state-skeleton-bar" style={{ animationDelay: `${index * 0.12}s` }} />
        ))}
      </div>
      <p className="data-state-label">{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry, label = 'This section could not load.' }) {
  return (
    <div className="data-state data-state--error" role="alert">
      <p className="data-state-title">{label}</p>
      <p className="data-state-message">{error?.message || 'The catalog service did not respond.'}</p>
      {error?.code ? <p className="data-state-code">{error.code}</p> : null}
      {onRetry ? (
        <button type="button" className="data-state-retry" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = 'Nothing published here yet.', hint }) {
  return (
    <div className="data-state data-state--empty">
      <p className="data-state-title">{title}</p>
      {hint ? <p className="data-state-message">{hint}</p> : null}
    </div>
  );
}

/**
 * Renders `children` only once there is data, so a section never has to repeat
 * the three guards. `empty` is caller-defined because "empty" differs: a list
 * has no items, a category has no members, a page has no payload.
 */
export default function DataState({ loading, error, empty, onRetry, children, ...rest }) {
  if (loading) return <LoadingState rows={rest.rows} label={rest.label} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} label={rest.errorLabel} />;
  if (empty) return <EmptyState title={rest.emptyTitle} hint={rest.emptyHint} />;
  return children;
}
