/**
 * Overview: the console's landing screen.
 *
 * Reads `GET /admin/stats`, which already parallelises one count per table, so
 * this screen shows the database's own numbers rather than a guess.
 */

import React from 'react';

import { api } from '../api';
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  SectionHeader,
  formatDate,
  useApi,
} from '../ui';

const TILES = [
  { key: 'devices', label: 'Devices', hint: 'all rows, drafts included' },
  { key: 'device_specs', label: 'Spec sheets', hint: 'devices with specs' },
  { key: 'device_scores', label: 'Scored devices', hint: 'editorial scores' },
  { key: 'device_pros_cons', label: 'Pros & cons', hint: 'curated rows' },
  { key: 'device_features', label: 'Feature cards', hint: 'highlight rows' },
  { key: 'device_ussd_codes', label: 'USSD codes', hint: 'per-device codes' },
  { key: 'reviews', label: 'Reviews', hint: 'user submissions' },
  { key: 'users', label: 'Users', hint: 'registered accounts' },
];

export default function OverviewSection({ navigate }) {
  const stats = useApi(() => api('/admin/stats', { admin: true }), []);
  const audit = useApi(
    () => api('/admin/audit-log', { admin: true, params: { page: 1, page_size: 6 } }),
    [],
  );

  if (stats.loading) return <Loading label="Reading catalog health…" />;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />;

  const { counts = {}, catalog = {} } = stats.data || {};
  const activeDevices = catalog.active_devices ?? 0;
  const categories = catalog.categories || [];
  const emptyCatalog = (counts.devices ?? 0) === 0;

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow={`snapshot ${formatDate(stats.data?.generated_at)}`}
        title="Catalog health"
        description="Live row counts straight from the database. Everything below is editable from the Products screen."
        actions={
          <>
            <Button onClick={() => navigate('products/new')}>Add a product</Button>
            <Button variant="ghost" onClick={() => navigate('products')}>
              Browse products
            </Button>
          </>
        }
      />

      {emptyCatalog ? (
        <div className="adm-notice adm-notice--warn">
          <div className="adm-notice__body">
            <strong>The catalog is empty.</strong>
            <div>
              No device rows exist yet, so the storefront category pages have nothing to rank. Start
              with <button type="button" className="adm-link" onClick={() => navigate('products/new')}>
                Add a product
              </button>{' '}
              — one submission fills the device row, its 40 spec fields, scores, pros/cons, features,
              USSD codes and category ranks.
            </div>
          </div>
        </div>
      ) : null}

      <div className="adm-tiles">
        <article className="adm-tile adm-tile--accent">
          <span className="adm-tile__label">Published</span>
          <strong className="adm-tile__value">{activeDevices}</strong>
          <span className="adm-tile__hint">
            {Math.max((counts.devices ?? 0) - activeDevices, 0)} draft / inactive
          </span>
        </article>
        <article className="adm-tile">
          <span className="adm-tile__label">Featured</span>
          <strong className="adm-tile__value">{catalog.featured_devices ?? 0}</strong>
          <span className="adm-tile__hint">pinned on the home page</span>
        </article>
        <article className="adm-tile">
          <span className="adm-tile__label">Categories</span>
          <strong className="adm-tile__value">{counts.categories ?? 0}</strong>
          <span className="adm-tile__hint">public + hidden</span>
        </article>
        <article className="adm-tile">
          <span className="adm-tile__label">Brands</span>
          <strong className="adm-tile__value">{counts.brands ?? 0}</strong>
          <span className="adm-tile__hint">{counts.device_embeddings ?? 0} embedded</span>
        </article>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <h3>Catalog tables</h3>
          <div className="adm-metrics">
            {TILES.map((tile) => (
              <div key={tile.key} className="adm-metric">
                <span className="adm-metric__label">{tile.label}</span>
                <strong className="adm-metric__value">{counts[tile.key] ?? 0}</strong>
                <span className="adm-metric__hint">{tile.hint}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="adm-card">
          <h3>Category ranking load</h3>
          {categories.length === 0 ? (
            <EmptyState title="No categories">
              The schema seeds its category rows; if this list is empty the database seed has not been
              applied.
            </EmptyState>
          ) : (
            <table className="adm-table adm-table--compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th className="adm-num">Devices</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>
                      <code>{category.slug}</code>
                    </td>
                    <td className="adm-num">
                      {category.device_count === 0 ? (
                        <span className="adm-muted">empty</span>
                      ) : (
                        category.device_count
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button variant="ghost" size="sm" onClick={() => navigate('categories')}>
            Manage ranking
          </Button>
        </section>
      </div>

      <section className="adm-card">
        <h3>Recent admin activity</h3>
        {audit.loading ? <Loading label="Reading audit log…" /> : null}
        {audit.error ? <ErrorState error={audit.error} onRetry={audit.reload} /> : null}
        {audit.data ? (
          audit.data.items.length === 0 ? (
            <EmptyState title="No writes recorded yet">
              Every mutation on this surface is audited; the first save will appear here.
            </EmptyState>
          ) : (
            <table className="adm-table adm-table--compact">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>
                      <code>{entry.action}</code>
                    </td>
                    <td>
                      {entry.target_type || '—'}
                      {entry.target_id ? (
                        <span className="adm-muted"> · {String(entry.target_id).slice(0, 8)}</span>
                      ) : null}
                    </td>
                    <td className="adm-muted">{entry.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </section>
    </div>
  );
}
