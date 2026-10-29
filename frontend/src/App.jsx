import React, { useEffect, useState } from 'react';

import AdminApp from './admin/AdminApp';
import CategoryPage from './components/CategoryPage';
import DevicePage from './components/DevicePage';
import Home from './components/Home';
import SearchPage from './components/SearchPage';

/**
 * Hash router.
 *
 * There is no route table for content: anything that is not `/admin`, `/device`
 * or `/search` is treated as a category slug and resolved against the database.
 * That is what lets a category created in the console — or inserted in SQL —
 * have a working page immediately, with no code change.
 */
function parseRoute() {
  const hash = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '';
  const raw = hash || window.location.pathname || '/';
  const segments = raw
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

  const [first, ...rest] = segments;

  if (!first) return { kind: 'home', pageKey: 'home' };
  if (first.toLowerCase() === 'admin') return { kind: 'admin', pageKey: 'admin' };
  if (first.toLowerCase() === 'search') return { kind: 'search', pageKey: 'search', query: rest.join('/') };
  if (first.toLowerCase() === 'device') return { kind: 'device', pageKey: 'device', identifier: rest[0] || '' };

  return { kind: 'category', pageKey: first, slug: first };
}

function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-page', route.pageKey || 'home');
    return () => {
      document.body.removeAttribute('data-page');
    };
  }, [route.pageKey]);

  if (route.kind === 'admin') {
    return <AdminApp />;
  }

  if (route.kind === 'search') {
    return <SearchPage initialQuery={route.query} />;
  }

  if (route.kind === 'device') {
    /* An empty identifier still renders the page: it shows the "not found"
     * state instead of silently falling back to the home page. */
    return <DevicePage identifier={route.identifier} />;
  }

  if (route.kind === 'category') {
    return <CategoryPage slug={route.slug} />;
  }

  return <Home />;
}

export default App;
