/**
 * Device editor: one form, every table.
 *
 * A new product is a single `POST /admin/devices` carrying the device row, its
 * spec sheet, scores, category ranks, pros/cons, features and USSD codes — the
 * backend inserts all of them, so a product is never half-created. An existing
 * product is saved per table, because each of those routes owns its own
 * validation and audit entry; a failure stops the chain and names the step.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { api, loadSchemas } from '../api';
import {
  DEVICE_FIELDS,
  SCORE_FIELDS,
  SCORED_BY,
  SPEC_GROUPS,
  SPEC_KEYS,
  USSD_CATEGORIES,
  deviceRootPayload,
  deviceToForm,
  emptyDeviceForm,
  scoresPayload,
  specsPayload,
} from '../fields';
import {
  Badge,
  Button,
  ErrorState,
  Field,
  JsonEditor,
  Loading,
  Notice,
  NumberInput,
  SectionHeader,
  Select,
  TagList,
  Textarea,
  TextInput,
  Toggle,
  cx,
  formatMoney,
  useApi,
} from '../ui';

const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'specs', label: 'Spec sheet' },
  { id: 'scores', label: 'Scores' },
  { id: 'categories', label: 'Categories' },
  { id: 'proscons', label: 'Pros & cons' },
  { id: 'features', label: 'Features' },
  { id: 'ussd', label: 'USSD codes' },
];

const uid = () => `row-${Math.random().toString(36).slice(2, 9)}`;

export default function DeviceEditor({ deviceId, navigate, notify, refreshStats }) {
  const creating = deviceId === 'new';
  const [form, setForm] = useState(() => emptyDeviceForm());
  const [tab, setTab] = useState('basics');
  const [loading, setLoading] = useState(!creating);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveLog, setSaveLog] = useState([]);

  // Snapshot of what the server holds, so the save diff only touches changed rows.
  const original = useRef({ categoryIds: [], ussd: {} });

  const categories = useApi(() => api('/admin/categories', { admin: true }), []);
  const brands = useApi(() => api('/admin/brands', { admin: true }), []);
  const schemas = useApi(() => loadSchemas(), []);

  useEffect(() => {
    if (creating) {
      setForm(emptyDeviceForm());
      setLoading(false);
      setLoadError(null);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setLoadError(null);
    api(`/admin/devices/${deviceId}`, { admin: true })
      .then((device) => {
        if (!alive) return;
        const next = deviceToForm(device);
        original.current = {
          categoryIds: (device.categories || []).map((item) => item.id),
          ussd: Object.fromEntries(
            (device.ussd_codes || []).map((item) => [
              item.id,
              { code: item.code, description: item.description, category: item.category },
            ]),
          ),
        };
        setForm(next);
      })
      .catch((error) => alive && setLoadError(error))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [deviceId, creating, reloadTick]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setSpec = (key, value) =>
    setForm((prev) => ({ ...prev, specs: { ...prev.specs, [key]: value } }));
  const setScore = (key, value) =>
    setForm((prev) => ({ ...prev, scores: { ...prev.scores, [key]: value } }));

  // ── payload builders ─────────────────────────────────────────
  const prosConsItems = () =>
    [
      ...form.pros.map((item, index) => ({ ...item, type: 'pro', display_order: index })),
      ...form.cons.map((item, index) => ({ ...item, type: 'con', display_order: index })),
    ].map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      type: item.type,
      description: item.description,
      importance: Number(item.importance) || 3,
      display_order: Number(item.display_order) || 0,
    }));

  const featureItems = () =>
    form.features.map((item, index) => ({
      ...(item.id ? { id: item.id } : {}),
      feature_name: item.feature_name,
      feature_value: item.feature_value,
      icon: item.icon || null,
      display_order: index,
    }));

  const categoryAssignments = () =>
    form.categories.map((item) => ({
      category_id: item.category_id,
      rank: Number(item.rank) || 1,
      rank_locked: Boolean(item.rank_locked),
      justification: item.justification || null,
    }));

  const validate = () => {
    const problems = [];
    if (!form.name.trim()) problems.push('Device name is required.');
    if (form.price === '' || !Number.isFinite(Number(form.price))) problems.push('Price is required.');
    if (!form.brand_name.trim() && !form.brand_id) problems.push('Brand is required.');
    form.categories.forEach((item) => {
      const rank = Number(item.rank);
      if (!Number.isInteger(rank) || rank < 1 || rank > 999) {
        problems.push(`Rank for ${item.name || item.category_slug} must be 1–999.`);
      }
    });
    form.ussd_codes.forEach((item) => {
      if (!/^[0-9*#+]{2,40}$/.test(item.code || '')) {
        problems.push(`USSD code "${item.code || ''}" may only contain digits, * # +.`);
      }
      if (!(item.description || '').trim()) problems.push('Every USSD code needs a description.');
    });
    form.pros.concat(form.cons).forEach((item) => {
      if (!(item.description || '').trim()) problems.push('Every pro/con needs a description.');
    });
    form.features.forEach((item) => {
      if (!(item.feature_name || '').trim() || !(item.feature_value || '').trim()) {
        problems.push('Every feature needs a name and a value.');
      }
    });
    return problems;
  };

  const save = async () => {
    const problems = validate();
    if (problems.length) {
      notify('danger', problems.slice(0, 3).join(' '));
      return;
    }

    setSaving(true);
    setSaveLog([]);
    const log = [];
    const step = async (label, run) => {
      try {
        const result = await run();
        log.push({ label, ok: true });
        return result;
      } catch (error) {
        log.push({ label, ok: false, message: `${error.code || 'error'}: ${error.message}` });
        setSaveLog([...log]);
        throw error;
      }
    };

    const specs = specsPayload(form);

    try {
      if (creating) {
        const body = {
          ...deviceRootPayload(form, { creating: true }),
          pros_cons: prosConsItems(),
          features: featureItems(),
          ussd_codes: form.ussd_codes.map((item) => ({
            code: item.code,
            description: item.description,
            category: item.category,
            is_universal: false,
          })),
          categories: categoryAssignments(),
        };
        if (Object.keys(specs).length) body.specs = specs;
        if (form.hasScores) body.scores = scoresPayload(form);

        const created = await step('Create device', () =>
          api('/admin/devices', { method: 'POST', admin: true, body }),
        );
        setSaveLog([...log]);
        notify('success', `Created ${created.name} with every child table.`);
        refreshStats?.();
        navigate(`products/${created.id}`);
        return;
      }

      await step('Update device row', () =>
        api(`/admin/devices/${form.id}`, {
          method: 'PATCH',
          admin: true,
          body: deviceRootPayload(form, { creating: false }),
        }),
      );

      await step('Save spec sheet', () =>
        api(`/admin/devices/${form.id}/specs`, { method: 'PUT', admin: true, body: specs }),
      );

      if (form.hasScores) {
        await step('Save scores', () =>
          api(`/admin/devices/${form.id}/scores`, {
            method: 'PUT',
            admin: true,
            body: scoresPayload(form),
          }),
        );
      }

      await step('Save pros & cons', () =>
        api(`/admin/devices/${form.id}/pros-cons`, {
          method: 'PUT',
          admin: true,
          body: { items: prosConsItems() },
        }),
      );

      await step('Save features', () =>
        api(`/admin/devices/${form.id}/features`, {
          method: 'PUT',
          admin: true,
          body: { items: featureItems() },
        }),
      );

      const keptCategoryIds = new Set(form.categories.map((item) => item.category_id));
      for (const categoryId of original.current.categoryIds) {
        if (keptCategoryIds.has(categoryId)) continue;
        await step('Remove from category', () =>
          api(`/admin/categories/${categoryId}/devices/${form.id}`, {
            method: 'DELETE',
            admin: true,
          }),
        );
      }
      if (form.categories.length) {
        await step('Apply category ranks', () =>
          api(`/admin/devices/${form.id}/categories`, {
            method: 'PUT',
            admin: true,
            body: { categories: categoryAssignments() },
          }),
        );
      }

      const liveUssdIds = new Set(form.ussd_codes.filter((item) => item.id).map((item) => item.id));
      for (const [id] of Object.entries(original.current.ussd)) {
        if (liveUssdIds.has(id)) continue;
        await step('Delete USSD code', () =>
          api(`/admin/ussd-codes/${id}`, { method: 'DELETE', admin: true }),
        );
      }
      for (const item of form.ussd_codes) {
        const body = {
          code: item.code,
          description: item.description,
          category: item.category,
        };
        if (!item.id) {
          await step('Add USSD code', () =>
            api('/admin/ussd-codes', {
              method: 'POST',
              admin: true,
              body: { ...body, device_id: form.id, is_universal: false },
            }),
          );
        } else {
          const before = original.current.ussd[item.id];
          if (before && before.code === body.code && before.description === body.description && before.category === body.category) {
            continue;
          }
          await step('Update USSD code', () =>
            api(`/admin/ussd-codes/${item.id}`, { method: 'PATCH', admin: true, body }),
          );
        }
      }

      const fresh = await step('Reload saved device', () =>
        api(`/admin/devices/${form.id}`, { admin: true }),
      );
      const next = deviceToForm(fresh);
      original.current = {
        categoryIds: (fresh.categories || []).map((item) => item.id),
        ussd: Object.fromEntries(
          (fresh.ussd_codes || []).map((item) => [
            item.id,
            { code: item.code, description: item.description, category: item.category },
          ]),
        ),
      };
      setForm(next);
      setSaveLog([...log]);
      notify('success', 'Saved every table for this device.');
      refreshStats?.();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const brandOptions = useMemo(
    () => (brands.data || []).map((item) => item.name),
    [brands.data],
  );
  const categoryOptions = categories.data || [];
  const assignedIds = new Set(form.categories.map((item) => item.category_id));

  if (loading) return <Loading label="Opening the device…" />;
  if (loadError) return <ErrorState error={loadError} onRetry={() => setReloadTick((n) => n + 1)} />;

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow={creating ? 'new product' : `editing · v${form.version ?? 1}`}
        title={creating ? 'Add a product' : form.name || 'Untitled device'}
        description={
          creating
            ? 'One submission writes the device row, its 40 spec fields, scores, category ranks, pros/cons, features and USSD codes.'
            : 'Each table is saved through its own route, so a partial failure is reported per step.'
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('products')}>
              Back to list
            </Button>
            <Button onClick={save} busy={saving}>
              {creating ? 'Create product' : 'Save changes'}
            </Button>
          </>
        }
      />

      {saveLog.length ? (
        <div className="adm-save-log">
          {saveLog.map((entry) => (
            <span key={entry.label} className={cx('adm-chip', entry.ok ? 'is-ok' : 'is-bad')}>
              {entry.ok ? '✓' : '✕'} {entry.label}
              {entry.message ? <em> {entry.message}</em> : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="adm-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx('adm-tab', tab === item.id && 'is-active')}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'specs' ? <span className="adm-tab__count">{SPEC_KEYS.length}</span> : null}
            {item.id === 'categories' ? <span className="adm-tab__count">{form.categories.length}</span> : null}
            {item.id === 'proscons' ? (
              <span className="adm-tab__count">{form.pros.length + form.cons.length}</span>
            ) : null}
            {item.id === 'features' ? <span className="adm-tab__count">{form.features.length}</span> : null}
            {item.id === 'ussd' ? <span className="adm-tab__count">{form.ussd_codes.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'basics' ? (
        <div className="adm-grid-2">
          <section className="adm-card">
            <h3>Device row</h3>
            <div className="adm-form-grid">
              {DEVICE_FIELDS.map((field) => (
                <RootField
                  key={field.key}
                  field={field}
                  form={form}
                  set={set}
                  brandOptions={brandOptions}
                />
              ))}
            </div>
          </section>

          <div className="adm-stack">
            <section className="adm-card">
              <h3>Publishing</h3>
              <div className="adm-form-grid">
                <Field label="Published" hint="Only published devices appear on the storefront.">
                  <Toggle
                    checked={form.is_active}
                    onChange={(value) => set({ is_active: value })}
                    label={form.is_active ? 'Live' : 'Draft'}
                  />
                </Field>
                <Field label="Featured" hint="Pinned by the home page query.">
                  <Toggle
                    checked={form.is_featured}
                    onChange={(value) => set({ is_featured: value })}
                    label={form.is_featured ? 'Featured' : 'Standard'}
                  />
                </Field>
              </div>
              {form.is_featured && !form.is_active ? (
                <Notice tone="warn">
                  A featured draft stays invisible: the storefront filters `is_active` first.
                </Notice>
              ) : null}
            </section>

            <section className="adm-card">
              <h3>Preview</h3>
              <div className="adm-preview">
                {form.image_url ? <img src={form.image_url} alt="" /> : <span className="adm-thumb adm-thumb--empty" />}
                <div>
                  <strong>{form.name || 'Unnamed device'}</strong>
                  <p className="adm-muted">{form.brand_name || 'No brand'}</p>
                  <p>{formatMoney(form.price, form.currency)}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === 'specs' ? (
        <SpecTab form={form} setSpec={setSpec} schemas={schemas.data} />
      ) : null}

      {tab === 'scores' ? (
        <section className="adm-card">
          <div className="adm-card__head">
            <h3>Editorial scores</h3>
            <Toggle
              checked={form.hasScores}
              onChange={(value) => set({ hasScores: value })}
              label={form.hasScores ? 'Scored' : 'Not scored'}
            />
          </div>
          <p className="adm-muted">
            `overall_score` is recomputed by a database trigger from these seven values; it is never
            sent by the client.
          </p>
          <div className="adm-score-grid">
            {SCORE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <div className="adm-score-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={Number(form.scores[field.key]) || 0}
                    onChange={(event) => setScore(field.key, event.target.value)}
                  />
                  <NumberInput
                    value={form.scores[field.key]}
                    onChange={(value) => setScore(field.key, value)}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
              </Field>
            ))}
            <Field label="Scored by">
              <Select
                value={form.scores.scored_by}
                onChange={(value) => set({ scores: { ...form.scores, scored_by: value } })}
                options={SCORED_BY}
              />
            </Field>
          </div>
        </section>
      ) : null}

      {tab === 'categories' ? (
        <CategoriesTab
          form={form}
          set={set}
          categories={categoryOptions}
          assignedIds={assignedIds}
          loading={categories.loading}
          error={categories.error}
          onRetry={categories.reload}
        />
      ) : null}

      {tab === 'proscons' ? <ProsConsTab form={form} set={set} /> : null}
      {tab === 'features' ? <FeaturesTab form={form} set={set} /> : null}
      {tab === 'ussd' ? <UssdTab form={form} set={set} /> : null}

      <div className="adm-savebar">
        <span className="adm-muted">
          {creating
            ? 'Nothing is written until you press Create product.'
            : `Saving writes every table for ${form.name}.`}
        </span>
        <div className="adm-row-actions">
          {!creating ? (
            <Button
              variant="ghost"
              onClick={() => setReloadTick((n) => n + 1)}
              disabled={saving}
            >
              Discard & reload
            </Button>
          ) : null}
          <Button onClick={save} busy={saving}>
            {creating ? 'Create product' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── tabs ──────────────────────────────────────────────────────
function RootField({ field, form, set, brandOptions }) {
  const value = form[field.key];

  if (field.kind === 'brand') {
    return (
      <Field label={field.label} required hint="An unknown name creates the brand on save." span={field.span}>
        <>
          <input
            className="adm-input"
            list="adm-brand-options"
            value={form.brand_name}
            onChange={(event) => set({ brand_name: event.target.value, brand_id: '' })}
            placeholder="Samsung, Xiaomi, …"
          />
          <datalist id="adm-brand-options">
            {brandOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </>
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.hint} required={field.required} span={field.span}>
      {(() => {
        switch (field.kind) {
          case 'bool':
            return (
              <Toggle
                checked={Boolean(value)}
                onChange={(next) => set({ [field.key]: next })}
                label={value ? 'Yes' : 'No'}
              />
            );
          case 'tags':
            return (
              <TagList value={value} onChange={(next) => set({ [field.key]: next })} />
            );
          case 'select':
            return (
              <Select
                value={value}
                onChange={(next) => set({ [field.key]: next })}
                options={field.options || []}
              />
            );
          case 'int':
          case 'float':
            return (
              <NumberInput
                value={value}
                onChange={(next) => set({ [field.key]: next })}
                step={field.step || '1'}
              />
            );
          case 'date':
            return (
              <input
                className="adm-input"
                type="date"
                value={value || ''}
                onChange={(event) => set({ [field.key]: event.target.value })}
              />
            );
          case 'json':
            return <JsonEditor value={value} onChange={(next) => set({ [field.key]: next })} />;
          default:
            return (
              <TextInput
                value={value}
                onChange={(next) => set({ [field.key]: next })}
                maxLength={field.maxLength}
              />
            );
        }
      })()}
    </Field>
  );
}

function SpecTab({ form, setSpec, schemas }) {
  const drift = useMemo(() => {
    const live = schemas?.SpecsOut?.properties;
    if (!live) return null;
    const liveKeys = Object.keys(live);
    return {
      missing: liveKeys.filter((key) => !SPEC_KEYS.includes(key)),
      extra: SPEC_KEYS.filter((key) => !liveKeys.includes(key)),
    };
  }, [schemas]);

  return (
    <div className="adm-stack">
      {drift && (drift.missing.length || drift.extra.length) ? (
        <Notice tone="warn" title="Schema drift">
          The live API spec and this form disagree.
          {drift.missing.length ? ` Not rendered: ${drift.missing.join(', ')}.` : ''}
          {drift.extra.length ? ` No longer in the API: ${drift.extra.join(', ')}.` : ''}
        </Notice>
      ) : null}

      {SPEC_GROUPS.map((group) => (
        <section key={group.id} className="adm-card">
          <h3>{group.label}</h3>
          <div className="adm-form-grid">
            {group.fields.map((field) => (
              <Field key={field.key} label={field.label} hint={field.hint} span={field.span}>
                {field.kind === 'bool' ? (
                  <Toggle
                    checked={Boolean(form.specs[field.key])}
                    onChange={(next) => setSpec(field.key, next)}
                    label={form.specs[field.key] ? 'Yes' : 'No'}
                  />
                ) : field.kind === 'tags' ? (
                  <TagList
                    value={form.specs[field.key]}
                    onChange={(next) => setSpec(field.key, next)}
                  />
                ) : field.kind === 'int' || field.kind === 'float' ? (
                  <div className="adm-unit">
                    <NumberInput
                      value={form.specs[field.key]}
                      onChange={(next) => setSpec(field.key, next)}
                      step={field.step || '1'}
                    />
                    {field.unit ? <span className="adm-unit__tag">{field.unit}</span> : null}
                  </div>
                ) : (
                  <TextInput
                    value={form.specs[field.key]}
                    onChange={(next) => setSpec(field.key, next)}
                    placeholder={field.placeholder}
                  />
                )}
              </Field>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CategoriesTab({ form, set, categories, assignedIds, loading, error, onRetry }) {
  const toggle = (category) => {
    if (assignedIds.has(category.id)) {
      set({ categories: form.categories.filter((item) => item.category_id !== category.id) });
    } else {
      set({
        categories: [
          ...form.categories,
          {
            category_id: category.id,
            category_slug: category.slug,
            name: category.name,
            rank: 1,
            rank_locked: false,
            justification: '',
          },
        ],
      });
    }
  };

  const update = (categoryId, patch) =>
    set({
      categories: form.categories.map((item) =>
        item.category_id === categoryId ? { ...item, ...patch } : item,
      ),
    });

  if (loading) return <Loading label="Reading categories…" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;

  return (
    <section className="adm-card">
      <h3>Category placement</h3>
      <p className="adm-muted">
        Ranks are 1-based. Saving calls the ranking RPC, which shifts siblings in the same
        transaction; a locked rank is never moved automatically. Unticking a category removes the
        membership on save.
      </p>

      {categories.length === 0 ? (
        <Notice tone="warn">No categories exist yet — create one on the Categories screen first.</Notice>
      ) : null}

      <div className="adm-catlist">
        {categories.map((category) => {
          const assigned = assignedIds.has(category.id);
          const placement = form.categories.find((item) => item.category_id === category.id);
          return (
            <div key={category.id} className={cx('adm-catrow', assigned && 'is-on')}>
              <label className="adm-catrow__pick">
                <input
                  type="checkbox"
                  checked={assigned}
                  onChange={() => toggle(category)}
                  disabled={!category.is_active && !assigned}
                />
                <span>
                  <strong>{category.name}</strong>
                  <code>{category.slug}</code>
                </span>
                {!category.is_active ? <Badge tone="warn">Hidden</Badge> : null}
                <Badge tone="neutral">{category.device_count ?? 0} devices</Badge>
              </label>

              {assigned && placement ? (
                <div className="adm-catrow__detail">
                  <Field label="Rank">
                    <NumberInput
                      value={placement.rank}
                      min="1"
                      max="999"
                      onChange={(value) => update(category.id, { rank: value })}
                    />
                  </Field>
                  <Field label="Locked">
                    <Toggle
                      checked={placement.rank_locked}
                      onChange={(value) => update(category.id, { rank_locked: value })}
                      label={placement.rank_locked ? 'Locked' : 'Auto'}
                    />
                  </Field>
                  <Field label="Justification" span={2}>
                    <TextInput
                      value={placement.justification}
                      onChange={(value) => update(category.id, { justification: value })}
                      maxLength={500}
                      placeholder="Why this device sits here"
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProsConsTab({ form, set }) {
  const update = (kind, index, patch) => {
    const rows = form[kind].map((item, position) => (position === index ? { ...item, ...patch } : item));
    set({ [kind]: rows });
  };
  const move = (kind, index, delta) => {
    const rows = [...form[kind]];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    set({ [kind]: rows });
  };

  const block = (kind, label, tone) => (
    <section className="adm-card">
      <div className="adm-card__head">
        <h3>
          {label} <Badge tone={tone}>{form[kind].length}</Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            set({
              [kind]: [
                ...form[kind],
                { id: null, key: uid(), type: kind === 'pros' ? 'pro' : 'con', description: '', importance: 3 },
              ],
            })
          }
        >
          Add {kind === 'pros' ? 'pro' : 'con'}
        </Button>
      </div>

      {form[kind].length === 0 ? (
        <p className="adm-muted">No rows yet.</p>
      ) : (
        <div className="adm-rows">
          {form[kind].map((item, index) => (
            <div key={item.id || item.key} className="adm-row">
              <Textarea
                rows={2}
                value={item.description}
                onChange={(value) => update(kind, index, { description: value })}
                placeholder={kind === 'pros' ? 'Great battery life' : 'No charger in the box'}
                maxLength={500}
              />
              <div className="adm-row__meta">
                <Field label="Weight">
                  <Select
                    value={String(item.importance)}
                    onChange={(value) => update(kind, index, { importance: Number(value) })}
                    options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} / 5` }))}
                  />
                </Field>
                <div className="adm-row__actions">
                  <Button variant="ghost" size="sm" onClick={() => move(kind, index, -1)}>
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => move(kind, index, 1)}>
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set({ [kind]: form[kind].filter((_, position) => position !== index) })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="adm-stack">
      {block('pros', 'Pros', 'ok')}
      {block('cons', 'Cons', 'danger')}
      <Notice tone="info">
        Rows are ordered by their position in this list; saving rewrites `display_order` from the
        order shown here.
      </Notice>
    </div>
  );
}

function FeaturesTab({ form, set }) {
  const update = (index, patch) =>
    set({
      features: form.features.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    });

  return (
    <section className="adm-card">
      <div className="adm-card__head">
        <h3>
          Feature highlights <Badge tone="accent">{form.features.length}</Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            set({
              features: [...form.features, { id: null, key: uid(), feature_name: '', feature_value: '', icon: '' }],
            })
          }
        >
          Add feature
        </Button>
      </div>
      <p className="adm-muted">
        These are the curated cards a product page renders; they are separate from the spec sheet.
      </p>

      {form.features.length === 0 ? (
        <p className="adm-muted">No feature rows yet.</p>
      ) : (
        <div className="adm-rows">
          {form.features.map((item, index) => (
            <div key={item.id || item.key} className="adm-row adm-row--inline">
              <Field label="Name">
                <TextInput
                  value={item.feature_name}
                  onChange={(value) => update(index, { feature_name: value })}
                  maxLength={80}
                  placeholder="Charging"
                />
              </Field>
              <Field label="Value" span={2}>
                <TextInput
                  value={item.feature_value}
                  onChange={(value) => update(index, { feature_value: value })}
                  maxLength={500}
                  placeholder="120W wired, 50W wireless"
                />
              </Field>
              <Field label="Icon">
                <TextInput
                  value={item.icon}
                  onChange={(value) => update(index, { icon: value })}
                  maxLength={50}
                  placeholder="bolt"
                />
              </Field>
              <div className="adm-row__actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => set({ features: form.features.filter((_, position) => position !== index) })}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UssdTab({ form, set }) {
  const update = (index, patch) =>
    set({
      ussd_codes: form.ussd_codes.map((item, position) =>
        position === index ? { ...item, ...patch } : item,
      ),
    });

  return (
    <section className="adm-card">
      <div className="adm-card__head">
        <h3>
          Device USSD codes <Badge tone="accent">{form.ussd_codes.length}</Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            set({
              ussd_codes: [
                ...form.ussd_codes,
                { id: null, key: uid(), code: '', description: '', category: 'general' },
              ],
            })
          }
        >
          Add code
        </Button>
      </div>
      <p className="adm-muted">
        Only this device&apos;s own codes are listed. Universal codes belong to the server and are
        merged into the storefront payload at read time.
      </p>

      {form.ussd_codes.length === 0 ? (
        <p className="adm-muted">No codes yet.</p>
      ) : (
        <div className="adm-rows">
          {form.ussd_codes.map((item, index) => (
            <div key={item.id || item.key} className="adm-row adm-row--inline">
              <Field label="Code">
                <TextInput
                  value={item.code}
                  onChange={(value) => update(index, { code: value })}
                  maxLength={40}
                  placeholder="*#*#4636#*#*"
                />
              </Field>
              <Field label="Description" span={2}>
                <TextInput
                  value={item.description}
                  onChange={(value) => update(index, { description: value })}
                  maxLength={500}
                  placeholder="Testing menu"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={item.category}
                  onChange={(value) => update(index, { category: value })}
                  options={USSD_CATEGORIES}
                />
              </Field>
              <div className="adm-row__actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set({ ussd_codes: form.ussd_codes.filter((_, position) => position !== index) })
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
