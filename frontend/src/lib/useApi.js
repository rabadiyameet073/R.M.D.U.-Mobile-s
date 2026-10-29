/**
 * Fetch-on-mount hook for the public API.
 *
 * Every storefront page reads through this hook, so "content lives in the
 * database" is true by construction: there is no local cache, no seed array and
 * no build-time snapshot to drift out of date. Navigating away aborts the
 * in-flight request, and `refetch()` is what an error panel's retry button
 * calls.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiGet } from './api';

function stableKey(params) {
  if (!params) return '';
  const keys = Object.keys(params).sort();
  if (!keys.length) return '';
  return JSON.stringify(keys.map((key) => [key, params[key] ?? null]));
}

export function useApi(path, { params, skip = false } = {}) {
  const paramsKey = stableKey(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ data: null, error: null, loading: !skip });

  useEffect(() => {
    if (skip || !path) {
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    setState((prev) => ({ data: prev.data, error: null, loading: true }));

    apiGet(path, { params: paramsRef.current, signal: controller.signal })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (cancelled || error.name === 'AbortError') return;
        setState({ data: null, error, loading: false });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, paramsKey, skip, attempt]);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, refetch };
}

/** Debounce a value — used so a search box issues one request, not one per key. */
export function useDebounced(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
