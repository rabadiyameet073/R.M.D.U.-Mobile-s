/**
 * Brands: the manufacturer list every device points at.
 *
 * Brands are never hard-deleted — `devices.brand_id` restricts the delete, and the
 * supported removal is deactivation, which keeps published devices intact.
 */

import React, { useMemo, useState } from 'react';

import { api } from '../api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  SectionHeader,
  Select,
  TextInput,
  Toggle,
  useApi,
} from '../ui';

const STATUS = [
  { value: 'any', label: 'All brands' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Deactivated only' },
];

export default function BrandsSection({ notify, refreshStats }) {
  const [status, setStatus] = useState('any');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useApi(
    () =>
      api('/admin/brands', {
        admin: true,
        params: {
          q: term.trim() || undefined,
          is_active: status === 'any' ? undefined : status,
          limit: 300,
        },
      }),
    [status, term],
  );

  const totals = useMemo(() => {
    const rows = list.data || [];
    return {
      brands: rows.length,
      devices: rows.reduce((sum, row) => sum + (row.device_count || 0), 0),
      withoutDevices: rows.filter((row) => !row.device_count).length,
    };
  }, [list.data]);

  const submit = async () => {
    if (!editing.name.trim()) {
      notify('danger', 'A brand name is required.');
      return;
    }
    const body = {
      name: editing.name.trim(),
      logo_url: editing.logo_url.trim() || null,
      country: editing.country.trim() || null,
      is_active: Boolean(editing.is_active),
    };
    setBusy(true);
    try {
      if (editing.id) {
        await api(`/admin/brands/${editing.id}`, { method: 'PATCH', admin: true, body });
        notify('success', `${body.name} updated.`);
      } else {
        await api('/admin/brands', { method: 'POST', admin: true, body });
        notify('success', `${body.name} created.`);
      }
      setEditing(null);
      list.reload();
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (brand) => {
    if (!window.confirm(`Deactivate "${brand.name}"? Its ${brand.device_count || 0} device(s) stay published.`)) {
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/brands/${brand.id}`, { method: 'DELETE', admin: true });
      notify('success', `${brand.name} deactivated.`);
      list.reload();
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow={`${totals.brands} brands · ${totals.devices} devices`}
        title="Brands"
        description="A device is created with an existing brand id or a brand name; an unknown name is created on the fly by the product form."
        actions={
          <Button
            onClick={() => setEditing({ name: '', logo_url: '', country: '', is_active: true })}
          >
            New brand
          </Button>
        }
      />

      <div className="adm-toolbar">
        <TextInput value={term} onChange={setTerm} placeholder="Search brands…" />
        <Select value={status} onChange={setStatus} options={STATUS} />
        {totals.withoutDevices ? (
          <span className="adm-muted">{totals.withoutDevices} brand(s) have no devices yet.</span>
        ) : null}
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading label="Reading brands…" /> : null}

      {list.data && list.data.length === 0 ? (
        <EmptyState title="No brands">
          Create a brand, or type a new name in the product form and it will be created for you.
        </EmptyState>
      ) : null}

      {list.data && list.data.length > 0 ? (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Country</th>
              <th>Logo</th>
              <th className="adm-num">Devices</th>
              <th>Status</th>
              <th className="adm-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((brand) => (
              <tr key={brand.id} className={!brand.is_active ? 'is-muted' : undefined}>
                <td>
                  <strong>{brand.name}</strong>
                </td>
                <td className="adm-muted">{brand.country || '—'}</td>
                <td className="adm-muted">
                  {brand.logo_url ? (
                    <code className="adm-truncate">{brand.logo_url}</code>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="adm-num">{brand.device_count ?? 0}</td>
                <td>
                  {brand.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="warn">Hidden</Badge>}
                </td>
                <td className="adm-actions-col">
                  <div className="adm-row-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditing({
                          id: brand.id,
                          name: brand.name,
                          logo_url: brand.logo_url || '',
                          country: brand.country || '',
                          is_active: Boolean(brand.is_active),
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!brand.is_active || busy}
                      onClick={() => deactivate(brand)}
                    >
                      Deactivate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Edit brand' : 'New brand'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} busy={busy}>
              {editing?.id ? 'Save brand' : 'Create brand'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="adm-form-grid">
            <Field label="Name" required span={2}>
              <TextInput
                value={editing.name}
                onChange={(value) => setEditing({ ...editing, name: value })}
                maxLength={80}
              />
            </Field>
            <Field label="Country">
              <TextInput
                value={editing.country}
                onChange={(value) => setEditing({ ...editing, country: value })}
                maxLength={60}
              />
            </Field>
            <Field label="Logo URL">
              <TextInput
                value={editing.logo_url}
                onChange={(value) => setEditing({ ...editing, logo_url: value })}
              />
            </Field>
            <Field label="Active">
              <Toggle
                checked={editing.is_active}
                onChange={(value) => setEditing({ ...editing, is_active: value })}
                label={editing.is_active ? 'Active' : 'Hidden'}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
