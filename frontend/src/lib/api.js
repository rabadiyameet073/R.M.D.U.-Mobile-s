/**
 * Public API client.
 *
 * The storefront renders only what the API returns — there is no hardcoded
 * catalog anywhere in `src/components` — so every page has exactly one source
 * of truth. Failures arrive in the API's standard envelope
 * (`{ error: { code, message, details } }`) and are rethrown as `ApiError` so a
 * page can render the server's own words instead of guessing.
 */

const DEFAULT_BASE = 'http://127.0.0.1:8000/api/v1';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'network_error', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function apiGet(path, { params, signal } = {}) {
  const url = `${API_BASE}${path}${buildQuery(params)}`;

  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('The catalog service is unreachable.', {
      status: 0,
      code: 'network_error',
      details: { cause: String(error) },
    });
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    const envelope = data?.error || {};
    throw new ApiError(
      envelope.message || `Request failed (HTTP ${response.status}).`,
      { status: response.status, code: envelope.code || 'http_error', details: envelope.details ?? data },
    );
  }

  return data;
}

/** `#/device/<slug>` when the row has a slug, otherwise the uuid. */
export function deviceHref(device) {
  if (!device) return '#/';
  return `#/device/${encodeURIComponent(device.slug || device.id)}`;
}

/** `#/category-slug` — a new category row gets a working page with no code change. */
export function categoryHref(category) {
  if (!category?.slug) return '#categories';
  return `#/${encodeURIComponent(category.slug)}`;
}

const currencyFormatters = new Map();

export function formatPrice(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return 'Price on request';
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Price on request';
  const key = currency || 'INR';
  if (!currencyFormatters.has(key)) {
    try {
      currencyFormatters.set(
        key,
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: key,
          maximumFractionDigits: 0,
        }),
      );
    } catch {
      currencyFormatters.set(key, null);
    }
  }
  const formatter = currencyFormatters.get(key);
  return formatter ? formatter.format(numeric) : `${key} ${Math.round(numeric)}`;
}
