/**
 * Scoring rules: the weights the recommendation engine applies per priority.
 *
 * `PUT /admin/rules` is an upsert keyed by priority and the backend refuses any set
 * whose weights do not sum to exactly 1.00, so the form shows the running total and
 * offers a normalise helper instead of silently rounding.
 */

import React, { useEffect, useState } from 'react';

import { api } from '../api';
import { PRIORITIES, WEIGHT_FIELDS } from '../fields';
import {
  Badge,
  Button,
  ErrorState,
  Loading,
  Notice,
  SectionHeader,
  cx,
  useApi,
} from '../ui';

const toPercent = (value) => Math.round(Number(value) * 100);

const blankRule = (priority) => ({
  priority,
  weight_perf: 0.2,
  weight_camera: 0.2,
  weight_battery: 0.2,
  weight_display: 0.15,
  weight_value: 0.15,
  weight_build: 0.05,
  weight_software: 0.05,
});

export default function RulesSection({ notify }) {
  const list = useApi(() => api('/admin/rules', { admin: true }), []);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!list.data) return;
    const next = {};
    PRIORITIES.forEach((priority) => {
      const existing = list.data.find((rule) => rule.priority === priority);
      next[priority] = existing
        ? {
            priority,
            weight_perf: existing.weight_perf,
            weight_camera: existing.weight_camera,
            weight_battery: existing.weight_battery,
            weight_display: existing.weight_display,
            weight_value: existing.weight_value,
            weight_build: existing.weight_build,
            weight_software: existing.weight_software,
            saved: true,
          }
        : { ...blankRule(priority), saved: false };
    });
    setDraft(next);
  }, [list.data]);

  const total = (rule) =>
    Math.round(
      WEIGHT_FIELDS.reduce((sum, field) => sum + Number(rule[field.key] || 0), 0) * 100,
    ) / 100;

  const update = (priority, key, value) =>
    setDraft((prev) => ({
      ...prev,
      [priority]: { ...prev[priority], [key]: Number(value) / 100 },
    }));

  const normalise = (priority) =>
    setDraft((prev) => {
      const rule = prev[priority];
      const sum = WEIGHT_FIELDS.reduce((acc, field) => acc + Number(rule[field.key] || 0), 0);
      if (sum <= 0) return prev;
      const next = { ...rule };
      WEIGHT_FIELDS.forEach((field) => {
        next[field.key] = Math.round((Number(rule[field.key] || 0) / sum) * 100) / 100;
      });
      // Push the rounding remainder onto performance so the sum lands on 1.00.
      const drift = Math.round((1 - total(next)) * 100) / 100;
      next.weight_perf = Math.round((next.weight_perf + drift) * 100) / 100;
      return { ...prev, [priority]: next };
    });

  const save = async (priority) => {
    const rule = draft[priority];
    const body = { priority };
    WEIGHT_FIELDS.forEach((field) => {
      body[field.key] = Number(rule[field.key]);
    });
    setBusy(priority);
    try {
      await api('/admin/rules', { method: 'PUT', admin: true, body });
      notify('success', `Weights saved for ${priority}.`);
      list.reload();
    } catch (error) {
      notify('danger', `${error.code || 'error'}: ${error.message}`);
    } finally {
      setBusy(null);
    }
  };

  if (list.loading) return <Loading label="Reading scoring rules…" />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow="recommendation engine"
        title="Scoring rules"
        description="Each priority blends the seven scores. The engine multiplies these weights before ranking, so they must sum to exactly 1.00."
      />

      <Notice tone="info">
        Sliders are shown in percent. Saving a rule that does not reach 100% is rejected by the
        backend with a validation error; use Normalise to rescale.
      </Notice>

      <div className="adm-grid-2">
        {PRIORITIES.map((priority) => {
          const rule = draft[priority];
          if (!rule) return null;
          const sum = total(rule);
          const valid = Math.abs(sum - 1) < 0.005;
          return (
            <section key={priority} className="adm-card">
              <div className="adm-card__head">
                <h3>
                  {priority} {rule.saved ? <Badge tone="ok">configured</Badge> : <Badge tone="warn">default</Badge>}
                </h3>
                <span className={cx('adm-sum', valid ? 'is-ok' : 'is-bad')}>
                  Σ {Math.round(sum * 100)}%
                </span>
              </div>

              <div className="adm-weights">
                {WEIGHT_FIELDS.map((field) => (
                  <label key={field.key} className="adm-weight">
                    <span>{field.label}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={toPercent(rule[field.key])}
                      onChange={(event) => update(priority, field.key, event.target.value)}
                    />
                    <span className="adm-weight__value">{toPercent(rule[field.key])}%</span>
                  </label>
                ))}
              </div>

              <div className="adm-row-actions">
                <Button variant="ghost" size="sm" onClick={() => normalise(priority)}>
                  Normalise
                </Button>
                <Button size="sm" busy={busy === priority} disabled={!valid} onClick={() => save(priority)}>
                  Save weights
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
