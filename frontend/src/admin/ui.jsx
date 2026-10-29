/**
 * Small, dependency-free primitives shared by every admin screen.
 *
 * The console deliberately does not reuse the storefront components: those are
 * scroll-snapped, video-backed and cursor-hidden, and touching them would change
 * the shop. These controls only borrow the colour tokens from global.css.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

export const cx = (...names) => names.filter(Boolean).join(' ');

export function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatMoney(value, currency = 'INR') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `${currency === 'INR' ? '₹' : `${currency} `}${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/** Fetch-on-mount helper: every screen reloads from the API, never from cache. */
export function useApi(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true }));
    Promise.resolve()
      .then(() => loaderRef.current())
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, reload };
}

export function Field({ label, hint, required, error, span, children }) {
  return (
    <label className={cx('adm-field', span === 2 && 'adm-field--wide')}>
      <span className="adm-field__label">
        {label}
        {required ? <span className="adm-field__req">*</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="adm-field__hint">{hint}</span> : null}
      {error ? <span className="adm-field__error">{error}</span> : null}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      className="adm-input"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  );
}

export function NumberInput({ value, onChange, step = '1', min, max, ...rest }) {
  return (
    <input
      className="adm-input"
      type="number"
      step={step}
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select
      className="adm-input adm-input--select"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => {
        const item = typeof option === 'string' ? { value: option, label: option } : option;
        return (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        );
      })}
    </select>
  );
}

export function Textarea({ value, onChange, rows = 3, ...rest }) {
  return (
    <textarea
      className="adm-input adm-input--area"
      rows={rows}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      {...rest}
    />
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <span className="adm-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        className={cx('adm-toggle__track', checked && 'is-on')}
        onClick={() => onChange(!checked)}
      >
        <span className="adm-toggle__thumb" />
      </button>
      <span className="adm-toggle__label">{label || (checked ? 'On' : 'Off')}</span>
    </span>
  );
}

/** Newline-separated list editor for TEXT[] columns. */
export function TagList({ value, onChange, rows = 3, placeholder }) {
  const [draft, setDraft] = useState(() => (value || []).join('\n'));
  const identity = JSON.stringify(value || []);

  useEffect(() => {
    setDraft((value || []).join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const commit = (text) => {
    setDraft(text);
    onChange(
      text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    );
  };

  return (
    <textarea
      className="adm-input adm-input--area"
      rows={rows}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => commit(event.target.value)}
    />
  );
}

export function Notice({ tone = 'info', title, children, onClose }) {
  return (
    <div className={cx('adm-notice', `adm-notice--${tone}`)}>
      <div className="adm-notice__body">
        {title ? <strong>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {onClose ? (
        <button type="button" className="adm-notice__close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={cx('adm-badge', `adm-badge--${tone}`)}>{children}</span>;
}

export function Button({ variant = 'solid', size = 'md', busy, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx('adm-btn', `adm-btn--${variant}`, `adm-btn--${size}`)}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy ? <span className="adm-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Pager({ meta, onChange, busy }) {
  if (!meta) return null;
  const total = meta.total ?? 0;
  return (
    <div className="adm-pager">
      <span className="adm-pager__info">
        {total === 0 ? 'No rows' : `Page ${meta.page} of ${Math.max(meta.total_pages, 1)} · ${total} rows`}
      </span>
      <div className="adm-pager__actions">
        <Button
          variant="ghost"
          size="sm"
          busy={busy}
          disabled={meta.page <= 1}
          onClick={() => onChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          busy={busy}
          disabled={!meta.has_next}
          onClick={() => onChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="adm-loading">
      <span className="adm-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <Notice tone="danger" title={error.code || 'Request failed'}>
      <p>{error.message}</p>
      {error.details?.error?.details ? (
        <pre className="adm-pre">{JSON.stringify(error.details.error.details, null, 2)}</pre>
      ) : null}
      {onRetry ? (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Notice>
  );
}

export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="adm-section-head">
      <div>
        {eyebrow ? <span className="adm-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="adm-section-head__actions">{actions}</div> : null}
    </header>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="adm-modal" role="dialog" aria-modal="true">
      <div className="adm-modal__backdrop" onClick={onClose} />
      <div className={cx('adm-modal__panel', wide && 'adm-modal__panel--wide')}>
        <div className="adm-modal__head">
          <h3>{title}</h3>
          <button type="button" className="adm-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="adm-modal__body">{children}</div>
        {footer ? <div className="adm-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function JsonEditor({ value, onChange, rows = 5 }) {
  const [text, setText] = useState(() => JSON.stringify(value || {}, null, 2));
  const [error, setError] = useState('');
  const identity = JSON.stringify(value || {});

  useEffect(() => {
    setText(JSON.stringify(value || {}, null, 2));
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const onInput = (next) => {
    setText(next);
    if (!next.trim()) {
      setError('');
      onChange({});
      return;
    }
    try {
      const parsed = JSON.parse(next);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setError('');
        onChange(parsed);
      } else {
        setError('Must be a JSON object.');
      }
    } catch (parseError) {
      setError(parseError.message);
    }
  };

  return (
    <>
      <textarea
        className="adm-input adm-input--area adm-input--mono"
        rows={rows}
        value={text}
        onChange={(event) => onInput(event.target.value)}
      />
      {error ? <span className="adm-field__error">{error}</span> : null}
    </>
  );
}
