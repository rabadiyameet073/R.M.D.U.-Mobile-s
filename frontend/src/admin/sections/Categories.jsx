/**
 * Categories: metadata, visibility and the manual rank order.
 *
 * Reordering sends a whole order through `PUT /admin/categories/{id}/order`, which
 * puts the listed devices at 1..n and pushes everyone else below — the same RPC
 * the ranking screen uses, so no two writers can leave a sparse list behind.
 */

import React, { useEffect, useState } from 'react';

import { api } from '../api';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  Notice,
  NumberInput,
  SectionHeader,
  TextInput,
  Textarea,
  Toggle,
  cx,
  formatMoney,
  useApi,
} from '../ui';

// Mirrors `--accent` in styles/global.css: a new category needs a colour before it
// has one, and the storefront accent is the least surprising default.
const DEFAULT_COLOR = '#c9a96e';

const BLANK = {
  name: '',
  slug: '',
  description: '',
  subtitle: '',
  highlights: [],
  hero_video_url: '',
  cover_image_url: '',
  icon: '',
  color_hex: DEFAULT_COLOR,
  display_order: 0,
  is_active: true,
};

export default function CategoriesSection({ notify, refreshStats }) {
  const list = useApi(() => api('/admin/categories', { admin: true }), []);
  const [editing, setEditing] = useState(null); // { id, version, ...fields } | BLANK
  const [members, setMembers] = useState(null); // { category, rows }
  const [busy, setBusy] = useState(false);

  const openCreate = () => setEditing({ ...BLANK });

  const openEdit = (category) =>
    setEditing({
      id: category.id,
      version: category.version,
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      subtitle: category.subtitle || '',
      // Kept as an array and edited as one line per chip, which is how the
      // validator stores it (`highlights` is a jsonb array in the database).
      highlights: category.highlights || [],
      hero_video_url: category.hero_video_url || '',
      cover_image_url: category.cover_image_url || '',
      icon: category.icon || '',
      color_hex: category.color_hex || DEFAULT_COLOR,
      display_order: category.display_order ?? 0,
      is_active: Boolean(category.is_active),
    });

  const submit = async () => {
    if (!editing.name.trim()) {
      notify('danger', 'A category name is required.');
      return;
    }
    const body = {
      name: editing.name.trim(),
      slug: editing.slug.trim() || null,
      description: editing.description.trim() || null,
      subtitle: editing.subtitle.trim() || null,
      highlights: editing.highlights.map((item) => item.trim()).filter(Boolean),
      hero_video_url: editing.hero_video_url.trim() || null,
      cover_image_url: editing.cover_image_url.trim() || null,
      icon: editing.icon.trim() || null,
      color_hex: editing.color_hex.trim() || null,
      display_order: Number(editing.display_order) || 0,
      is_active: Boolean(editing.is_active),
    };
    if (editing.version) body.version = editing.version;

    setBusy(true);
    try {
      if (editing.id) {
        await api(`/admin/categories/${editing.id}`, { method: 'PATCH', admin: true, body });
        notify('success', `${body.name} updated.`);
      } else {
        await api('/admin/categories', { method: 'POST', admin: true, body });
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

  const deactivate = async (category) => {
    if (!window.confirm(`Hide "${category.name}" from the storefront? Memberships and URLs stay.`)) {
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/categories/${category.id}`, { method: 'DELETE', admin: true });
      notify('success', `${category.name} hidden.`);
      list.reload();
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const openMembers = async (category) => {
    setMembers({ category, loading: true, rows: [] });
    try {
      /* The admin projection returns every member (up to 200), not the 12 the
       * public page ships: reordering a truncated list would silently drop the
       * rows that were not on screen. */
      const page = await api(`/admin/categories/${category.id}/devices`, {
        admin: true,
        params: { page_size: 200 },
      });
      setMembers({
        category,
        loading: false,
        rows: page.items.map((item) => ({
          device_id: item.device.id,
          name: item.device.name,
          price: item.device.price,
          currency: item.device.currency,
          rank: item.rank,
          locked: item.rank_locked,
        })),
      });
    } catch (error) {
      setMembers({ category, loading: false, error, rows: [] });
    }
  };

  const moveMember = (index, delta) => {
    setMembers((prev) => {
      const rows = [...prev.rows];
      const target = index + delta;
      if (target < 0 || target >= rows.length) return prev;
      [rows[index], rows[target]] = [rows[target], rows[index]];
      return { ...prev, rows };
    });
  };

  const saveOrder = async () => {
    setBusy(true);
    try {
      const result = await api(`/admin/categories/${members.category.id}/order`, {
        method: 'PUT',
        admin: true,
        body: { device_ids: members.rows.map((row) => row.device_id) },
      });
      notify('success', `Applied ${result.applied} ranks (category v${result.category_version}).`);
      setMembers(null);
      list.reload();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (row) => {
    if (!window.confirm(`Remove "${row.name}" from ${members.category.name}?`)) return;
    setBusy(true);
    try {
      await api(`/admin/categories/${members.category.id}/devices/${row.device_id}`, {
        method: 'DELETE',
        admin: true,
      });
      setMembers((prev) => ({
        ...prev,
        rows: prev.rows.filter((item) => item.device_id !== row.device_id),
      }));
      notify('success', `${row.name} removed from ${members.category.name}.`);
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
        eyebrow="navigation"
        title="Categories"
        description="The five storefront routes read their device list from these rows. Hiding a category keeps its URLs and ranks but removes it from the public projection."
        actions={<Button onClick={openCreate}>New category</Button>}
      />

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading label="Reading categories…" /> : null}

      {list.data && list.data.length === 0 ? (
        <EmptyState title="No categories">
          A category is required before a device can be ranked. Create one to begin.
        </EmptyState>
      ) : null}

      {list.data && list.data.length > 0 ? (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Slug</th>
              <th className="adm-num">Order</th>
              <th className="adm-num">Devices</th>
              <th>Status</th>
              <th className="adm-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((category) => (
              <tr key={category.id} className={!category.is_active ? 'is-muted' : undefined}>
                <td>
                  <div className="adm-inline">
                    <span
                      className="adm-swatch"
                      style={{ background: category.color_hex || 'transparent' }}
                    />
                    <strong>{category.name}</strong>
                  </div>
                  {category.description ? (
                    <div className="adm-muted adm-clamp">{category.description}</div>
                  ) : null}
                </td>
                <td>
                  <code>{category.slug}</code>
                </td>
                <td className="adm-num">{category.display_order ?? 0}</td>
                <td className="adm-num">{category.device_count ?? 0}</td>
                <td>
                  {category.is_active ? <Badge tone="ok">Visible</Badge> : <Badge tone="warn">Hidden</Badge>}
                </td>
                <td className="adm-actions-col">
                  <div className="adm-row-actions">
                    <Button variant="ghost" size="sm" onClick={() => openMembers(category)}>
                      Members
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!category.is_active || busy}
                      onClick={() => deactivate(category)}
                    >
                      Hide
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
        title={editing?.id ? 'Edit category' : 'New category'}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} busy={busy}>
              {editing?.id ? 'Save category' : 'Create category'}
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
                maxLength={60}
                placeholder="Gaming Guru"
              />
            </Field>
            <Field label="Slug" hint="Used in the URL: /categories/{slug}">
              <TextInput
                value={editing.slug}
                onChange={(value) => setEditing({ ...editing, slug: value })}
                maxLength={80}
                placeholder="gaming-guru"
              />
            </Field>
            <Field label="Display order" hint="Lower numbers come first.">
              <NumberInput
                value={editing.display_order}
                onChange={(value) => setEditing({ ...editing, display_order: value })}
                min="0"
                max="999"
              />
            </Field>
            <Field label="Icon" hint="Lucide icon name">
              <TextInput
                value={editing.icon}
                onChange={(value) => setEditing({ ...editing, icon: value })}
                maxLength={50}
                placeholder="gamepad-2"
              />
            </Field>
            <Field label="Colour" hint="Hex, e.g. #c9a96e">
              <TextInput
                value={editing.color_hex}
                onChange={(value) => setEditing({ ...editing, color_hex: value })}
                maxLength={7}
              />
            </Field>
            <Field label="Description" span={2}>
              <Textarea
                value={editing.description}
                onChange={(value) => setEditing({ ...editing, description: value })}
                rows={3}
                maxLength={2000}
              />
            </Field>
            {/* Storefront copy (migration 09). These are the fields the public
                tile and hero read, so an edit here is live on the site. */}
            <Field label="Subtitle" span={2} hint="One line printed under the tile title.">
              <TextInput
                value={editing.subtitle}
                onChange={(value) => setEditing({ ...editing, subtitle: value })}
                maxLength={160}
                placeholder="High FPS consistency and low-latency touch."
              />
            </Field>
            <Field label="Highlights" span={2} hint="One per line. Shown as chips on the category page.">
              <Textarea
                value={(editing.highlights || []).join('\n')}
                onChange={(value) => setEditing({ ...editing, highlights: value.split(/\r?\n/) })}
                rows={4}
                maxLength={800}
                placeholder={'Sustained FPS stability\nThermal control'}
              />
            </Field>
            <Field label="Hero video URL" hint="/media/camera.mp4 or an absolute https URL.">
              <TextInput
                value={editing.hero_video_url}
                onChange={(value) => setEditing({ ...editing, hero_video_url: value })}
                maxLength={300}
                placeholder="/media/camera.mp4"
              />
            </Field>
            <Field label="Cover image URL" hint="Poster shown while the video loads.">
              <TextInput
                value={editing.cover_image_url}
                onChange={(value) => setEditing({ ...editing, cover_image_url: value })}
                maxLength={300}
                placeholder="/media/logo.png"
              />
            </Field>
            <Field label="Visible in the storefront">
              <Toggle
                checked={editing.is_active}
                onChange={(value) => setEditing({ ...editing, is_active: value })}
                label={editing.is_active ? 'Visible' : 'Hidden'}
              />
            </Field>
            {editing.version ? (
              <p className="adm-muted">Saving sends version {editing.version}; a concurrent edit returns 409.</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(members)}
        title={members ? `${members.category.name} — ranked members` : ''}
        onClose={() => setMembers(null)}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setMembers(null)}>
              Close
            </Button>
            <Button onClick={saveOrder} busy={busy} disabled={!members?.rows?.length}>
              Apply order
            </Button>
          </>
        }
      >
        {members?.loading ? <Loading label="Reading members…" /> : null}
        {members?.error ? <ErrorState error={members.error} /> : null}
        {members && !members.loading && !members.error ? (
          members.rows.length === 0 ? (
            <EmptyState title="No devices in this category">
              Assign devices from a product&apos;s Categories tab.
            </EmptyState>
          ) : (
            <>
              <Notice tone="info">
                Change the order with the arrows, then Apply order. Ranks are rewritten as 1..n and any
                other member is pushed below.
              </Notice>
              <table className="adm-table adm-table--compact">
                <thead>
                  <tr>
                    <th className="adm-num">#</th>
                    <th>Device</th>
                    <th className="adm-num">Price</th>
                    <th className="adm-actions-col">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {members.rows.map((row, index) => (
                    <tr key={row.device_id}>
                      <td className="adm-num">{index + 1}</td>
                      <td>
                        {row.name}
                        {row.locked ? <Badge tone="accent">Locked</Badge> : null}
                      </td>
                      <td className="adm-num">{formatMoney(row.price, row.currency)}</td>
                      <td className="adm-actions-col">
                        <div className={cx('adm-row-actions', 'adm-row-actions--tight')}>
                          <Button variant="ghost" size="sm" onClick={() => moveMember(index, -1)}>
                            ↑
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => moveMember(index, 1)}>
                            ↓
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeMember(row)}>
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        ) : null}
      </Modal>
    </div>
  );
}
