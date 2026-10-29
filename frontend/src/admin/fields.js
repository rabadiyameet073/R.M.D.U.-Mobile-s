/**
 * Field metadata for the admin forms.
 *
 * Every entry here maps 1:1 to a column the backend accepts. The spec sheet is
 * flat in the database (`device_specs`), so it is grouped here only for display;
 * the payload is still one flat object keyed by column name. Nothing in this file
 * invents a field — `SPEC_FIELDS` mirrors `SPEC_COLUMNS` in the backend, and the
 * console flags any schema drift against the live OpenAPI document.
 */

// ── device root columns (devices table) ────────────────────────
export const DEVICE_FIELDS = [
  { key: 'name', label: 'Device name', kind: 'text', required: true, maxLength: 150, span: 2 },
  { key: 'brand_name', label: 'Brand', kind: 'brand' },
  { key: 'slug', label: 'Slug', kind: 'text', maxLength: 180, hint: 'Leave empty to generate from the name.' },
  { key: 'model_number', label: 'Model number', kind: 'text', maxLength: 80 },
  { key: 'launch_date', label: 'Launch date', kind: 'date' },
  { key: 'price', label: 'Price', kind: 'float', required: true, unit: '₹', step: '0.01' },
  { key: 'currency', label: 'Currency', kind: 'select', options: ['INR'] },
  { key: 'image_url', label: 'Main image URL', kind: 'text', span: 2 },
  { key: 'gallery_urls', label: 'Gallery URLs', kind: 'tags', hint: 'One image URL per line.' },
  { key: 'color_options', label: 'Colour options', kind: 'tags', hint: 'One colour name per line.' },
  { key: 'is_featured', label: 'Featured on the storefront', kind: 'bool' },
  { key: 'is_active', label: 'Published (visible in the storefront)', kind: 'bool' },
  { key: 'extra', label: 'Extra metadata (JSON object)', kind: 'json' },
];

// ── device_specs: 40 columns, grouped for the spec tab ─────────
export const SPEC_GROUPS = [
  {
    id: 'compute',
    label: 'Processor & memory',
    fields: [
      { key: 'processor_name', label: 'Processor', kind: 'text', span: 2 },
      { key: 'processor_brand', label: 'Processor brand', kind: 'text' },
      { key: 'process_node', label: 'Process node', kind: 'text', placeholder: '4nm' },
      { key: 'cpu_cores', label: 'CPU cores', kind: 'int', unit: 'cores' },
      { key: 'cpu_max_freq_ghz', label: 'Max CPU clock', kind: 'float', unit: 'GHz', step: '0.01' },
      { key: 'gpu_name', label: 'GPU', kind: 'text' },
      { key: 'antutu_score', label: 'AnTuTu score', kind: 'int', unit: 'pts' },
      { key: 'geekbench_single', label: 'Geekbench single', kind: 'int', unit: 'pts' },
      { key: 'geekbench_multi', label: 'Geekbench multi', kind: 'int', unit: 'pts' },
      { key: 'ram_gb', label: 'RAM', kind: 'int', unit: 'GB' },
      { key: 'storage_gb', label: 'Storage', kind: 'int', unit: 'GB' },
      { key: 'storage_type', label: 'Storage type', kind: 'text', placeholder: 'UFS 4.0' },
    ],
  },
  {
    id: 'display',
    label: 'Display',
    fields: [
      { key: 'display_size_inch', label: 'Screen size', kind: 'float', unit: 'inch', step: '0.01' },
      { key: 'display_resolution', label: 'Resolution', kind: 'text', placeholder: '1260 x 2800' },
      { key: 'display_type', label: 'Panel type', kind: 'text', placeholder: 'AMOLED' },
      { key: 'refresh_rate_hz', label: 'Refresh rate', kind: 'int', unit: 'Hz' },
      { key: 'peak_brightness_nit', label: 'Peak brightness', kind: 'int', unit: 'nits' },
      { key: 'protection', label: 'Glass protection', kind: 'text', placeholder: 'Gorilla Glass Victus' },
    ],
  },
  {
    id: 'camera',
    label: 'Camera',
    fields: [
      { key: 'camera_primary_mp', label: 'Main camera', kind: 'float', unit: 'MP' },
      { key: 'camera_ultra_mp', label: 'Ultra-wide', kind: 'float', unit: 'MP' },
      { key: 'camera_tele_mp', label: 'Telephoto', kind: 'float', unit: 'MP' },
      { key: 'camera_front_mp', label: 'Front camera', kind: 'float', unit: 'MP' },
      { key: 'video_max_res', label: 'Max video', kind: 'text', placeholder: '4K 60fps' },
      { key: 'camera_features', label: 'Camera features', kind: 'tags', hint: 'One feature per line, e.g. OIS.' },
    ],
  },
  {
    id: 'battery',
    label: 'Battery & charging',
    fields: [
      { key: 'battery_mah', label: 'Battery capacity', kind: 'int', unit: 'mAh' },
      { key: 'charging_watt', label: 'Wired charging', kind: 'int', unit: 'W' },
      { key: 'wireless_watt', label: 'Wireless charging', kind: 'int', unit: 'W' },
      { key: 'reverse_watt', label: 'Reverse charging', kind: 'int', unit: 'W' },
    ],
  },
  {
    id: 'connectivity',
    label: 'Connectivity',
    fields: [
      { key: 'five_g', label: '5G capable', kind: 'bool' },
      { key: 'nfc', label: 'NFC', kind: 'bool' },
      { key: 'wifi_standard', label: 'Wi-Fi', kind: 'text', placeholder: 'Wi-Fi 7' },
      { key: 'bluetooth_version', label: 'Bluetooth', kind: 'text', placeholder: '5.4' },
      { key: 'usb_type', label: 'USB', kind: 'text', placeholder: 'USB-C 3.1' },
    ],
  },
  {
    id: 'software',
    label: 'Software',
    fields: [
      { key: 'os', label: 'Operating system', kind: 'text', placeholder: 'Android 15' },
      { key: 'ui_layer', label: 'UI layer', kind: 'text', placeholder: 'HyperOS' },
      { key: 'guaranteed_updates', label: 'Guaranteed OS updates', kind: 'int', unit: 'years' },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    fields: [
      { key: 'weight_grams', label: 'Weight', kind: 'int', unit: 'g' },
      { key: 'dimensions', label: 'Dimensions', kind: 'text', placeholder: '162.9 x 76.2 x 8.4 mm' },
      { key: 'build_material', label: 'Materials', kind: 'text', placeholder: 'Aluminium frame, glass back' },
      { key: 'ip_rating', label: 'IP rating', kind: 'text', placeholder: 'IP68' },
    ],
  },
];

export const SPEC_FIELDS = SPEC_GROUPS.flatMap((group) =>
  group.fields.map((field) => ({ ...field, group: group.id })),
);

export const SPEC_KEYS = SPEC_FIELDS.map((field) => field.key);

// ── device_scores ──────────────────────────────────────────────
export const SCORE_FIELDS = [
  { key: 'performance_score', label: 'Performance' },
  { key: 'camera_score', label: 'Camera' },
  { key: 'battery_score', label: 'Battery' },
  { key: 'display_score', label: 'Display' },
  { key: 'value_score', label: 'Value' },
  { key: 'build_score', label: 'Build' },
  { key: 'software_score', label: 'Software' },
];

export const SCORED_BY = ['admin', 'system', 'ai'];

// ── enums and option lists ─────────────────────────────────────
export const USSD_CATEGORIES = ['general', 'battery', 'imei', 'network', 'display', 'secret'];

export const DEVICE_SORTS = [
  { value: 'updated', label: 'Recently edited' },
  { value: 'newest', label: 'Newest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price low → high' },
  { value: 'price_desc', label: 'Price high → low' },
  { value: 'score_desc', label: 'Best score' },
];

export const PRIORITIES = ['gaming', 'camera', 'battery', 'value', 'all-rounder'];

export const WEIGHT_FIELDS = [
  { key: 'weight_perf', label: 'Performance' },
  { key: 'weight_camera', label: 'Camera' },
  { key: 'weight_battery', label: 'Battery' },
  { key: 'weight_display', label: 'Display' },
  { key: 'weight_value', label: 'Value' },
  { key: 'weight_build', label: 'Build' },
  { key: 'weight_software', label: 'Software' },
];

// ── blank states ───────────────────────────────────────────────
export function emptySpecs() {
  const specs = {};
  SPEC_KEYS.forEach((key) => {
    specs[key] = key === 'camera_features' ? [] : key === 'five_g' || key === 'nfc' ? false : null;
  });
  return specs;
}

export function emptyScores() {
  const scores = {};
  SCORE_FIELDS.forEach((field) => {
    scores[field.key] = 70;
  });
  scores.scored_by = 'admin';
  return scores;
}

export function emptyDeviceForm() {
  return {
    id: null,
    version: null,
    name: '',
    brand_name: '',
    slug: '',
    model_number: '',
    launch_date: '',
    price: '',
    currency: 'INR',
    image_url: '',
    gallery_urls: [],
    color_options: [],
    is_featured: false,
    is_active: true,
    extra: {},
    specs: emptySpecs(),
    hasScores: true,
    scores: emptyScores(),
    categories: [],
    pros: [],
    cons: [],
    features: [],
    ussd_codes: [],
  };
}

/** Turn a `DeviceDetail` payload into the editor's form state. */
export function deviceToForm(device) {
  if (!device) return emptyDeviceForm();
  const specs = { ...emptySpecs(), ...(device.specs || {}) };
  specs.camera_features = specs.camera_features || [];

  return {
    id: device.id,
    version: device.version || 1,
    name: device.name || '',
    brand_name: device.brand?.name || '',
    brand_id: device.brand_id || device.brand?.id || '',
    slug: device.slug || '',
    model_number: device.model_number || '',
    launch_date: device.launch_date || '',
    price: device.price ?? '',
    currency: device.currency || 'INR',
    image_url: device.image_url || '',
    gallery_urls: device.gallery_urls || [],
    color_options: device.color_options || [],
    is_featured: Boolean(device.is_featured),
    is_active: Boolean(device.is_active),
    extra: device.extra || {},
    specs,
    hasScores: Boolean(device.scores),
    scores: {
      ...emptyScores(),
      ...(device.scores || {}),
      scored_by: device.scores?.scored_by || 'admin',
    },
    categories: (device.categories || []).map((item) => ({
      category_id: item.id,
      category_slug: item.slug,
      name: item.name,
      rank: item.rank || 1,
      rank_locked: Boolean(item.rank_locked),
      justification: item.justification || '',
    })),
    pros: (device.pros || []).map((item) => ({ ...item })),
    cons: (device.cons || []).map((item) => ({ ...item })),
    features: (device.features || []).map((item) => ({ ...item })),
    ussd_codes: (device.ussd_codes || []).map((item) => ({ ...item })),
  };
}

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Columns the schema allows to be NULL. On update every other optional column is
// omitted when empty, because `name`, `slug` and `price` are NOT NULL and a PATCH
// carrying `slug: null` would be rejected by the database.
const NULLABLE_ROOT = ['model_number', 'launch_date', 'image_url'];

/** Root-column payload for POST /admin/devices and PATCH /admin/devices/{id}. */
export function deviceRootPayload(form, { creating = false } = {}) {
  const values = {
    name: form.name.trim(),
    brand_name: form.brand_name.trim() || '',
    brand_id: form.brand_id || '',
    slug: form.slug.trim(),
    model_number: form.model_number.trim(),
    launch_date: form.launch_date || '',
    price: Number(form.price),
    currency: form.currency || 'INR',
    image_url: form.image_url.trim(),
    gallery_urls: form.gallery_urls || [],
    color_options: form.color_options || [],
    is_featured: Boolean(form.is_featured),
    is_active: Boolean(form.is_active),
    extra: form.extra || {},
  };

  const payload = {
    name: values.name,
    price: values.price,
    currency: values.currency,
    gallery_urls: values.gallery_urls,
    color_options: values.color_options,
    is_featured: values.is_featured,
    is_active: values.is_active,
    extra: values.extra,
  };
  if (values.brand_id) payload.brand_id = values.brand_id;
  else if (values.brand_name) payload.brand_name = values.brand_name;
  if (values.slug) payload.slug = values.slug;

  ['model_number', 'launch_date', 'image_url'].forEach((key) => {
    if (values[key]) payload[key] = values[key];
    else if (NULLABLE_ROOT.includes(key)) payload[key] = null;
  });

  if (!creating) payload.version = form.version;
  return payload;
}

/** `device_specs` payload; nulls are dropped so an untouched field stays NULL. */
export function specsPayload(form) {
  const payload = {};
  SPEC_FIELDS.forEach((field) => {
    const raw = form.specs[field.key];
    if (field.kind === 'bool') payload[field.key] = Boolean(raw);
    else if (field.kind === 'tags') payload[field.key] = raw || [];
    else if (field.kind === 'int' || field.kind === 'float') {
      const parsed = numberOrNull(raw);
      if (parsed !== null) payload[field.key] = parsed;
    } else if (typeof raw === 'string' && raw.trim() !== '') {
      payload[field.key] = raw.trim();
    }
  });
  return payload;
}

export function scoresPayload(form) {
  const payload = { scored_by: form.scores.scored_by || 'admin' };
  SCORE_FIELDS.forEach((field) => {
    payload[field.key] = numberOrNull(form.scores[field.key]) ?? 0;
  });
  return payload;
}
