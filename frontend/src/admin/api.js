/**
 * Admin API client.
 *
 * The storefront talks to Supabase directly; the console talks only to the
 * FastAPI surface and authenticates with the X-Admin-Key shared secret. Every
 * write on this surface is audited server-side, so nothing here may invent a
 * success: an error returned by the API is shown verbatim, including the
 * `migration_required` 503 that names an unapplied SQL file.
 */

const DEFAULT_BASE = 'http://127.0.0.1:8000/api/v1';
const KEY_STORAGE = 'rmdu.admin.key';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');

export function getAdminKey() {
  try {
    return sessionStorage.getItem(KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setAdminKey(value) {
  try {
    sessionStorage.setItem(KEY_STORAGE, value);
  } catch {
    /* private mode: keep the key in memory only */
  }
}

export function clearAdminKey() {
  try {
    sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'network_error', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
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

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function describeError(status, code, data) {
  if (code === 'migration_required') {
    return 'A database migration this endpoint needs has not been applied yet.';
  }
  if (code === 'version_conflict') {
    return 'Someone else saved this row first. Reload and apply your change again.';
  }
  if (code === 'admin_disabled') {
    return 'The admin surface is disabled: ADMIN_API_KEY is not set on the server.';
  }
  if (status === 0) return 'The API is unreachable. Is the backend running?';
  return '';
}

export async function api(path, options = {}) {
  const { method = 'GET', body, admin = false, params } = options;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) {
    const key = getAdminKey();
    if (key) headers['X-Admin-Key'] = key;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}${buildQuery(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(describeError(0, 'network_error'), {
      status: 0,
      code: 'network_error',
      details: { cause: String(error) },
    });
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (response.ok) return data;

  const envelope = data?.error || {};
  const validation = Array.isArray(data?.detail)
    ? data.detail.map((item) => `${(item.loc || []).slice(1).join('.') || 'body'}: ${item.msg}`).join('; ')
    : null;
  const code = envelope.code || (validation ? 'validation_error' : 'http_error');
  const message =
    envelope.message || validation || describeError(response.status, code, data) || `HTTP ${response.status}`;
  throw new ApiError(message, { status: response.status, code, details: data });
}

let schemasPromise = null;

/**
 * Load the live OpenAPI component schemas once; forms are generated from them.
 *
 * The document lives at the server root (`/openapi.json`), not under the versioned
 * prefix, so the suffix is stripped before the request.
 */
export function loadSchemas() {
  if (!schemasPromise) {
    const root = API_BASE.replace(/\/api\/v\d+$/, '');
    schemasPromise = fetch(`${root}/openapi.json`, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((doc) => doc?.components?.schemas || {})
      .catch(() => ({}));
  }
  return schemasPromise;
}
