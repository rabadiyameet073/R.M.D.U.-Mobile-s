/**
 * Site content: the `site_settings` key/value rows.
 *
 * One row per section (`site`, `hero`, `nav`, `footer`, or any new section). The
 * editor is a JSON document on purpose: the storefront renders whatever shape the
 * row holds, so a new section needs a row, not a new form. Saving is
 * version-checked, which is why the modal shows the revision it read.
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
  Notice,
  SectionHeader,
  TextInput,
  Textarea,
  Toggle,
  useApi,
} from '../ui';

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;

const BLANK = {
  key: 'section',
  value: '{\n  \n}',
  description: '',
  is_public: true,
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN');
}

export default function SiteContentSection({ notify }) {
  const list = useApi(() => api('/admin/site/settings', { admin: true }), []);
  const [editing, setEditing] = useState(null); // { key, value, description, is_public, version } | BLANK
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const items = useMemo(() => list.data?.items || [], [list.data]);

  const openCreate = () => {
    setProblem(null);
    setEditing({ ...BLANK });
  };

  const openEdit = (row) => {
    setProblem(null);
    setEditing({
      key: row.key,
      value: JSON.stringify(row.value ?? {}, null, 2),
      description: row.description || '',
      is_public: Boolean(row.is_public),
      version: row.version,
    });
  };

  const submit = async () => {
    setProblem(null);
    const key = (editing.key || '').trim();
    if (!editing.version && !KEY_PATTERN.test(key)) {
      setProblem({
        code: 'invalid_key',
        message: 'A section key starts with a letter and uses only a-z, 0-9 and _.',
      });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(editing.value);
    } catch (error) {
      setProblem({ code: 'invalid_json', message: `The document is not valid JSON: ${error.message}` });
      return;
    }
    if (parsed === null || typeof parsed !== 'object') {
      setProblem({ code: 'invalid_json', message: 'The document must be a JSON object or array.' });
      return;
    }

    const body = {
      value: parsed,
      description: editing.description.trim() || null,
      is_public: Boolean(editing.is_public),
    };

    setBusy(true);
    try {
      if (editing.version) {
        await api(`/admin/site/settings/${encodeURIComponent(key)}`, {
          method: 'PUT',
          admin: true,
          body: { ...body, version: editing.version },
        });
        notify('success', `"${key}" saved. The storefront reads it on the next page load.`);
      } else {
        await api('/admin/site/settings', {
          method: 'POST',
          admin: true,
          body: { ...body, key },
        });
        notify('success', `"${key}" created.`);
      }
      setEditing(null);
      list.reload();
    } catch (error) {
      setProblem(error);
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the "${row.key}" section? The storefront falls back to built-in copy.`)) {
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/site/settings/${encodeURIComponent(row.key)}`, { method: 'DELETE', admin: true });
      notify('success', `"${row.key}" deleted.`);
      list.reload();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow="storefront"
        title="Site content"
        description="Hero, navigation and footer copy. Every row here is served by /site/settings, so a save reaches the public site without a deploy."
        actions={<Button onClick={openCreate}>New section</Button>}
      />

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : null}
      {list.loading && !list.data ? <Loading label="Reading site copy…" /> : null}

      {list.data && items.length === 0 ? (
        <EmptyState title="No sections stored">
          The storefront is using its built-in copy. Apply migration 09 to seed the site, hero, nav
          and footer rows, or create a section here.
        </EmptyState>
      ) : null}

      {items.length ? (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Visibility</th>
              <th className="adm-num">Version</th>
              <th>Updated</th>
              <th className="adm-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.key}</strong>
                  {row.description ? <div className="adm-muted adm-clamp">{row.description}</div> : null}
                </td>
                <td>
                  {row.is_public ? <Badge tone="ok">Public</Badge> : <Badge tone="warn">Server-only</Badge>}
                </td>
                <td className="adm-num">{row.version}</td>
                <td className="adm-muted">{formatDate(row.updated_at)}</td>
                <td className="adm-actions-col">
                  <div className="adm-row-actions">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(row)}>
                      Delete
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
        title={editing?.version ? `Edit "${editing.key}"` : 'New section'}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={submit} busy={busy}>
              Save section
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="adm-form-grid">
            <Field
              label="Key"
              required={!editing.version}
              hint="Lowercase letters, digits and underscores; starts with a letter."
            >
              <TextInput
                value={editing.key}
                onChange={(value) => setEditing({ ...editing, key: value })}
                maxLength={80}
                disabled={Boolean(editing.version)}
                placeholder="hero"
              />
            </Field>

            <Field label="Public" hint="Off keeps the section out of /site/settings.">
              <Toggle
                checked={editing.is_public}
                onChange={(value) => setEditing({ ...editing, is_public: value })}
                label={editing.is_public ? 'Served to the storefront' : 'Server-only'}
              />
            </Field>

            <Field label="Document" span={2} hint="A JSON object or array. This is what the site renders.">
              <Textarea
                value={editing.value}
                onChange={(value) => setEditing({ ...editing, value })}
                rows={14}
                maxLength={20000}
                spellCheck={false}
              />
            </Field>

            <Field label="Description" span={2} hint="Internal note for the next editor.">
              <TextInput
                value={editing.description}
                onChange={(value) => setEditing({ ...editing, description: value })}
                maxLength={500}
              />
            </Field>

            {editing.version ? (
              <p className="adm-muted">
                Saving sends version {editing.version}; a concurrent edit returns 409.
              </p>
            ) : null}

            {problem ? (
              <Notice tone="danger" title={problem.code || 'Could not save'}>
                {problem.message}
              </Notice>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
