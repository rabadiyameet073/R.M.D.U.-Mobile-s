/**
 * Admin console shell.
 *
 * Mounted only when the address is `/admin` or `#/admin`; App.jsx adds exactly one
 * branch and the storefront renders as before. The console is a thin client over
 * the FastAPI admin surface: every number it shows comes from the API, and every
 * error it renders is the server's own error code and message.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api, clearAdminKey, getAdminKey, setAdminKey } from './api';
import { Button, Notice, TextInput, cx } from './ui';

import OverviewSection from './sections/Overview';
import ProductsSection from './sections/Products';
import DeviceEditor from './sections/DeviceEditor';
import CategoriesSection from './sections/Categories';
import BrandsSection from './sections/Brands';
import ReviewsSection from './sections/Reviews';
import RulesSection from './sections/Rules';
import AuditSection from './sections/Audit';

import './admin.css';

const NAV = [
  { id: 'overview', label: 'Overview', hint: 'Catalog health' },
  { id: 'products', label: 'Products', hint: 'Create, edit, publish' },
  { id: 'categories', label: 'Categories', hint: 'Ordering and ranks' },
  { id: 'brands', label: 'Brands', hint: 'Manufacturers' },
  { id: 'reviews', label: 'Reviews', hint: 'Moderation queue' },
  { id: 'rules', label: 'Scoring rules', hint: 'Recommendation weights' },
  { id: 'audit', label: 'Audit log', hint: 'Every admin write' },
];

function parseRoute() {
  const raw = (window.location.hash || '#/overview').replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  return { section: parts[0] || 'overview', param: parts.slice(1).join('/') || null };
}

function navigate(path) {
  window.location.hash = `#/${path}`.replace(/\/+$/, '');
}

export default function AdminApp() {
  const [route, setRoute] = useState(parseRoute);
  const [key, setKey] = useState(getAdminKey);
  const [gateError, setGateError] = useState(null);
  const [checking, setChecking] = useState(Boolean(getAdminKey()));
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [statsTick, setStatsTick] = useState(0);

  const notify = useCallback((tone, message) => {
    setToast({ tone, message, at: Date.now() });
  }, []);

  // Sections ask for this after a write, so the sidebar counters stay honest
  // instead of showing the numbers from the moment the console was unlocked.
  const refreshStats = useCallback(() => setStatsTick((value) => value + 1), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // A stored key is only trusted after the server agrees with it.
  useEffect(() => {
    if (!key) {
      setChecking(false);
      setSession(null);
      return undefined;
    }
    let alive = true;
    setChecking(true);
    api('/admin/stats', { admin: true })
      .then((data) => {
        if (!alive) return;
        setSession(data);
        setGateError(null);
      })
      .catch((error) => {
        if (!alive) return;
        setSession(null);
        if (error.status === 401) clearAdminKey();
        setKey(error.status === 401 ? '' : getAdminKey());
        setGateError(error);
      })
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key === '' ? '' : 'stored']);

  // `refreshStats` bumps this counter after a write. The fetch is deliberately
  // silent: a failed refresh must not replace the screen the operator is editing.
  useEffect(() => {
    if (statsTick === 0 || !getAdminKey()) return undefined;
    let alive = true;
    api('/admin/stats', { admin: true })
      .then((data) => {
        if (alive) setSession(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [statsTick]);

  const unlock = async (candidate) => {
    setChecking(true);
    setGateError(null);
    setAdminKey(candidate);
    try {
      const data = await api('/admin/stats', { admin: true });
      setSession(data);
      setKey(candidate);
    } catch (error) {
      clearAdminKey();
      setSession(null);
      setKey('');
      setGateError(error);
    } finally {
      setChecking(false);
    }
  };

  const lock = () => {
    clearAdminKey();
    setKey('');
    setSession(null);
    notify('info', 'Admin key cleared from this browser session.');
  };

  const counts = session?.counts || {};

  const section = NAV.some((item) => item.id === route.section) ? route.section : 'overview';

  const header = useMemo(() => {
    const current = NAV.find((item) => item.id === section);
    return current || NAV[0];
  }, [section]);

  if (!key || (!checking && !session)) {
    return <LoginGate error={gateError} busy={checking} onSubmit={unlock} />;
  }

  if (checking && !session) {
    return (
      <div className="adm-shell adm-shell--center">
        <span className="adm-spin" />
        <p>Checking the admin key…</p>
      </div>
    );
  }

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <span className="adm-brand__mark">RMDU</span>
          <span className="adm-brand__sub">Admin console</span>
        </div>

        <nav className="adm-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx('adm-nav__item', section === item.id && 'is-active')}
              onClick={() => navigate(item.id)}
            >
              <span className="adm-nav__label">{item.label}</span>
              <span className="adm-nav__hint">{item.hint}</span>
            </button>
          ))}
        </nav>

        <div className="adm-sidebar__foot">
          <div className="adm-mini">
            <span>{counts.devices ?? '–'} devices</span>
            <span>{counts.categories ?? '–'} categories</span>
            <span>{counts.brands ?? '–'} brands</span>
          </div>
          <Button variant="ghost" size="sm" onClick={lock}>
            Lock console
          </Button>
          <button type="button" className="adm-link" onClick={() => { window.location.hash = ''; window.location.href = '/'; }}>
            ← Back to storefront
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <div>
            <span className="adm-eyebrow">{header.hint}</span>
            <h1>{header.label}</h1>
          </div>
          <div className="adm-topbar__meta">
            <span className="adm-dot" />
            <span>API {import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'}</span>
          </div>
        </header>

        {toast ? (
          <Notice tone={toast.tone} onClose={() => setToast(null)}>
            {toast.message}
          </Notice>
        ) : null}

        {section === 'overview' ? <OverviewSection navigate={navigate} notify={notify} /> : null}

        {section === 'products' && !route.param ? (
          <ProductsSection navigate={navigate} notify={notify} refreshStats={refreshStats} />
        ) : null}

        {section === 'products' && route.param ? (
          <DeviceEditor
            deviceId={route.param}
            navigate={navigate}
            notify={notify}
            refreshStats={refreshStats}
          />
        ) : null}

        {section === 'categories' ? (
          <CategoriesSection navigate={navigate} notify={notify} refreshStats={refreshStats} />
        ) : null}
        {section === 'brands' ? <BrandsSection notify={notify} refreshStats={refreshStats} /> : null}
        {section === 'reviews' ? <ReviewsSection notify={notify} /> : null}
        {section === 'rules' ? <RulesSection notify={notify} /> : null}
        {section === 'audit' ? <AuditSection /> : null}
      </main>
    </div>
  );
}

function LoginGate({ error, busy, onSubmit }) {
  const [value, setValue] = useState('');

  return (
    <div className="adm-shell adm-shell--center">
      <form
        className="adm-gate"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <div className="adm-brand">
          <span className="adm-brand__mark">RMDU</span>
          <span className="adm-brand__sub">Admin console</span>
        </div>
        <p className="adm-gate__intro">
          Paste the server&apos;s <code>ADMIN_API_KEY</code>. It stays in this browser tab only
          (sessionStorage) and is sent as the <code>X-Admin-Key</code> header.
        </p>
        <TextInput
          value={value}
          onChange={setValue}
          type="password"
          autoFocus
          autoComplete="off"
          placeholder="ADMIN_API_KEY"
        />
        <Button type="submit" busy={busy} disabled={!value.trim()}>
          Unlock
        </Button>
        {error ? (
          <Notice tone="danger" title={error.code || 'Could not unlock'}>
            {error.message}
          </Notice>
        ) : null}
      </form>
    </div>
  );
}
