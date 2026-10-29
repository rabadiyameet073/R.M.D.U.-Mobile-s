/**
 * Products: the catalog feed.
 *
 * Uses `GET /admin/devices`, which — unlike the storefront feed — carries no
 * implicit `is_active` filter, so drafts are visible here. Publish/unpublish is a
 * version-checked PATCH; "remove" is the audited soft delete.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import { DEVICE_SORTS } from '../fields';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Pager,
  Select,
  SectionHeader,
  TextInput,
  formatDate,
  formatMoney,
  useApi,
} from '../ui';

const STATUS_OPTIONS = [
  { value: 'any', label: 'Any status' },
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Draft / inactive' },
];

export default function ProductsSection({ navigate, notify, refreshStats }) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('any');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(term.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [term]);

  const categories = useApi(() => api('/admin/categories', { admin: true }), []);
  const list = useApi(
    () =>
      api('/admin/devices', {
        admin: true,
        params: {
          q: debounced || undefined,
          category: category || undefined,
          is_active: status === 'any' ? undefined : status,
          sort,
          page,
          page_size: 20,
        },
      }),
    [debounced, category, status, sort, page],
  );

  const categoryOptions = useMemo(
    () => (categories.data || []).map((item) => ({ value: item.slug, label: `${item.name} (${item.slug})` })),
    [categories.data],
  );

  const togglePublish = async (device) => {
    setBusyId(device.id);
    try {
      const updated = await api(`/admin/devices/${device.id}`, {
        method: 'PATCH',
        admin: true,
        body: { is_active: !device.is_active, version: device.version },
      });
      notify('success', `${updated.name} is now ${updated.is_active ? 'published' : 'hidden'}.`);
      list.reload();
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const deactivate = async (device) => {
    if (!window.confirm(`Deactivate "${device.name}"? It leaves the storefront; rows and reviews stay.`)) {
      return;
    }
    setBusyId(device.id);
    try {
      await api(`/admin/devices/${device.id}`, { method: 'DELETE', admin: true });
      notify('success', `${device.name} deactivated.`);
      list.reload();
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow="catalog"
        title="Products"
        description="Every device row, drafts included. The editor writes the device row plus its specs, scores, categories, pros/cons, features and USSD codes."
        actions={<Button onClick={() => navigate('products/new')}>Add a product</Button>}
      />

      <div className="adm-toolbar">
        <TextInput value={term} onChange={setTerm} placeholder="Search name or slug…" />
        <Select
          value={category}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          options={categoryOptions}
          placeholder="All categories"
        />
        <Select
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
        <Select
          value={sort}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          options={DEVICE_SORTS}
        />
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading label="Reading devices…" /> : null}

      {list.data && list.data.items.length === 0 ? (
        <EmptyState title="No devices match">
          {debounced || category || status !== 'any'
            ? 'Loosen the filters, or create a device now.'
            : 'The catalog is empty — add the first product.'}
        </EmptyState>
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Brand</th>
                <th className="adm-num">Price</th>
                <th className="adm-num">Score</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="adm-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((device) => (
                <tr key={device.id} className={!device.is_active ? 'is-muted' : undefined}>
                  <td>
                    <div className="adm-device-cell">
                      {device.image_url ? (
                        <img className="adm-thumb" src={device.image_url} alt="" loading="lazy" />
                      ) : (
                        <span className="adm-thumb adm-thumb--empty" />
                      )}
                      <div>
                        <button
                          type="button"
                          className="adm-link adm-link--strong"
                          onClick={() => navigate(`products/${device.id}`)}
                        >
                          {device.name}
                        </button>
                        <div className="adm-muted">
                          <code>{device.slug}</code>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{device.brand?.name || '—'}</td>
                  <td className="adm-num">{formatMoney(device.price, device.currency)}</td>
                  <td className="adm-num">
                    {device.overall_score != null ? device.overall_score.toFixed(1) : '—'}
                  </td>
                  <td>
                    <div className="adm-badges">
                      {device.is_active ? (
                        <Badge tone="ok">Published</Badge>
                      ) : (
                        <Badge tone="warn">Draft</Badge>
                      )}
                      {device.is_featured ? <Badge tone="accent">Featured</Badge> : null}
                      {!device.specs ? <Badge tone="danger">No specs</Badge> : null}
                      {!device.scores ? <Badge tone="danger">No scores</Badge> : null}
                    </div>
                  </td>
                  <td className="adm-muted">{formatDate(device.updated_at)}</td>
                  <td className="adm-actions-col">
                    <div className="adm-row-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`products/${device.id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        busy={busyId === device.id}
                        onClick={() => togglePublish(device)}
                      >
                        {device.is_active ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        busy={busyId === device.id}
                        disabled={!device.is_active}
                        onClick={() => deactivate(device)}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager meta={list.data.meta} onChange={setPage} busy={list.loading} />
        </>
      ) : null}
    </div>
  );
}
