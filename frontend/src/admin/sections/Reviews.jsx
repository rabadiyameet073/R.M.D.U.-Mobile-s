/**
 * Reviews: the moderation queue.
 *
 * The storefront only renders approved reviews, so an unmoderated row is invisible
 * rather than hidden by the client. Rejecting keeps the row for audit; deleting is
 * the explicit destructive action.
 */

import React, { useState } from 'react';

import { api } from '../api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Pager,
  SectionHeader,
  Select,
  formatDate,
  useApi,
} from '../ui';

const FILTERS = [
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'any', label: 'All reviews' },
];

export default function ReviewsSection({ notify }) {
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const list = useApi(
    () =>
      api('/admin/reviews', {
        admin: true,
        params: {
          is_approved: filter === 'any' ? undefined : filter === 'approved',
          page,
          page_size: 20,
        },
      }),
    [filter, page],
  );

  const moderate = async (review, approved) => {
    setBusyId(review.id);
    try {
      await api(`/admin/reviews/${review.id}`, {
        method: 'PATCH',
        admin: true,
        body: { is_approved: approved },
      });
      notify('success', approved ? 'Review approved.' : 'Review rejected.');
      list.reload();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setBusyId(review.id);
    try {
      await api(`/admin/reviews/${review.id}`, { method: 'DELETE', admin: true });
      notify('success', 'Review deleted.');
      list.reload();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow="moderation"
        title="Reviews"
        description="Ratings are public only once approved. The count here is the queue the storefront cannot show."
        actions={
          <Select
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            options={FILTERS}
          />
        }
      />

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading label="Reading reviews…" /> : null}

      {list.data && list.data.items.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'Nothing waiting for approval' : 'No reviews'}>
          {filter === 'pending'
            ? 'Every submitted review has been moderated.'
            : 'Reviews appear here as soon as users submit them.'}
        </EmptyState>
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <div className="adm-rows">
            {list.data.items.map((review) => (
              <article key={review.id} className="adm-card adm-review">
                <div className="adm-review__head">
                  <div>
                    <strong>{review.title || '(no title)'}</strong>
                    <div className="adm-muted">
                      {review.author?.name || 'Unknown user'} · {formatDate(review.created_at)} · device{' '}
                      <code>{String(review.device_id).slice(0, 8)}</code>
                    </div>
                  </div>
                  <div className="adm-badges">
                    <Badge tone="accent">{review.rating} / 5</Badge>
                    {review.is_approved ? <Badge tone="ok">Approved</Badge> : <Badge tone="warn">Pending</Badge>}
                    {review.verified_owner ? <Badge tone="neutral">Verified owner</Badge> : null}
                    <Badge tone="neutral">{review.helpful_votes} helpful</Badge>
                  </div>
                </div>
                <p className="adm-review__text">{review.review_text || '—'}</p>
                <div className="adm-row-actions">
                  {!review.is_approved ? (
                    <Button
                      size="sm"
                      busy={busyId === review.id}
                      onClick={() => moderate(review, true)}
                    >
                      Approve
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      busy={busyId === review.id}
                      onClick={() => moderate(review, false)}
                    >
                      Unapprove
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    busy={busyId === review.id}
                    onClick={() => remove(review)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <Pager meta={list.data.meta} onChange={setPage} busy={list.loading} />
        </>
      ) : null}
    </div>
  );
}
