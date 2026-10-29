/**
 * Audit log: the receipt for every admin write.
 *
 * `old_value` / `new_value` are rendered verbatim; nothing here summarises or
 * rewrites them, because the point of the log is that it is the server's record.
 */

import React, { useState } from 'react';

import { api } from '../api';
import {
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Pager,
  SectionHeader,
  Select,
  TextInput,
  formatDate,
  useApi,
} from '../ui';

const TARGETS = [
  { value: 'any', label: 'All targets' },
  { value: 'device', label: 'Device' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'review', label: 'Review' },
  { value: 'rule', label: 'Rule' },
  { value: 'user', label: 'User' },
];

export default function AuditSection() {
  const [target, setTarget] = useState('any');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const list = useApi(
    () =>
      api('/admin/audit-log', {
        admin: true,
        params: {
          action: action.trim() || undefined,
          target_type: target === 'any' ? undefined : target,
          page,
          page_size: 25,
        },
      }),
    [target, action, page],
  );

  return (
    <div className="adm-stack">
      <SectionHeader
        eyebrow="traceability"
        title="Audit log"
        description="Every mutation on the admin surface writes one row here with the previous and next value."
      />

      <div className="adm-toolbar">
        <TextInput
          value={action}
          onChange={(value) => {
            setAction(value);
            setPage(1);
          }}
          placeholder="Exact action, e.g. device.create"
        />
        <Select
          value={target}
          onChange={(value) => {
            setTarget(value);
            setPage(1);
          }}
          options={TARGETS}
        />
      </div>

      {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : null}
      {list.loading && !list.data ? <Loading label="Reading the log…" /> : null}

      {list.data && list.data.items.length === 0 ? (
        <EmptyState title="No entries">
          Nothing matches these filters. The log records writes, not reads.
        </EmptyState>
      ) : null}

      {list.data && list.data.items.length > 0 ? (
        <>
          <table className="adm-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Target</th>
                <th>IP</th>
                <th className="adm-actions-col">Payload</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr>
                    <td className="adm-muted">{formatDate(entry.created_at)}</td>
                    <td>
                      <code>{entry.action}</code>
                    </td>
                    <td>
                      {entry.target_type || '—'}
                      {entry.target_id ? (
                        <div className="adm-muted">
                          <code>{String(entry.target_id).slice(0, 8)}</code>
                        </div>
                      ) : null}
                    </td>
                    <td className="adm-muted">{entry.ip_address || '—'}</td>
                    <td className="adm-actions-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(open === entry.id ? null : entry.id)}
                      >
                        {open === entry.id ? 'Hide' : 'Inspect'}
                      </Button>
                    </td>
                  </tr>
                  {open === entry.id ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="adm-grid-2">
                          <div>
                            <span className="adm-eyebrow">previous</span>
                            <pre className="adm-pre">{JSON.stringify(entry.old_value ?? null, null, 2)}</pre>
                          </div>
                          <div>
                            <span className="adm-eyebrow">next</span>
                            <pre className="adm-pre">{JSON.stringify(entry.new_value ?? null, null, 2)}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <Pager meta={list.data.meta} onChange={setPage} busy={list.loading} />
        </>
      ) : null}
    </div>
  );
}
