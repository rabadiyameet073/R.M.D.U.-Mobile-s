/**
 * Device page — `/device/{slug-or-uuid}`.
 *
 * Reads `/devices/{identifier}`, which joins specs, scores, pros/cons, features,
 * USSD codes and category memberships in one payload. Every block below is
 * conditional on the row it comes from, so a device with only a name and a
 * price still renders a page instead of an empty shell.
 */

import React, { useEffect, useState } from 'react';
import logoImg from '/media/logo.png';

import DataState, { EmptyState } from './DataState';
import PhoneCard from './PhoneCard';
import { categoryHref, formatPrice } from '../lib/api';
import { useApi } from '../lib/useApi';

const SCORE_FIELDS = [
  ['overall_score', 'Overall'],
  ['performance_score', 'Performance'],
  ['camera_score', 'Camera'],
  ['battery_score', 'Battery'],
  ['display_score', 'Display'],
  ['value_score', 'Value'],
  ['build_score', 'Build'],
  ['software_score', 'Software'],
];

const SPEC_FIELDS = [
  ['processor_name', 'Chipset'],
  ['process_node', 'Process'],
  ['cpu_cores', 'CPU cores'],
  ['cpu_max_freq_ghz', 'Max clock', (value) => `${value} GHz`],
  ['gpu_name', 'GPU'],
  ['antutu_score', 'AnTuTu', (value) => Number(value).toLocaleString('en-IN')],
  ['geekbench_single', 'Geekbench single', (value) => Number(value).toLocaleString('en-IN')],
  ['geekbench_multi', 'Geekbench multi', (value) => Number(value).toLocaleString('en-IN')],
  ['ram_gb', 'RAM', (value) => `${value} GB`],
  ['storage_gb', 'Storage', (value) => `${value} GB`],
  ['storage_type', 'Storage type'],
  ['display_size_inch', 'Display size', (value) => `${value}"`],
  ['display_resolution', 'Resolution'],
  ['display_type', 'Panel'],
  ['refresh_rate_hz', 'Refresh rate', (value) => `${value} Hz`],
  ['peak_brightness_nit', 'Peak brightness', (value) => `${value} nits`],
  ['protection', 'Protection'],
  ['camera_primary_mp', 'Main camera', (value) => `${value} MP`],
  ['camera_ultra_mp', 'Ultra-wide', (value) => `${value} MP`],
  ['camera_tele_mp', 'Telephoto', (value) => `${value} MP`],
  ['camera_front_mp', 'Front camera', (value) => `${value} MP`],
  ['video_max_res', 'Max video'],
  ['battery_mah', 'Battery', (value) => `${value} mAh`],
  ['charging_watt', 'Wired charging', (value) => `${value} W`],
  ['wireless_watt', 'Wireless charging', (value) => `${value} W`],
  ['five_g', '5G', (value) => (value ? 'Yes' : 'No')],
  ['wifi_standard', 'Wi-Fi'],
  ['bluetooth_version', 'Bluetooth'],
  ['nfc', 'NFC', (value) => (value ? 'Yes' : 'No')],
  ['usb_type', 'USB'],
  ['os', 'OS'],
  ['ui_layer', 'UI layer'],
  ['guaranteed_updates', 'Guaranteed updates', (value) => `${value} years`],
  ['weight_grams', 'Weight', (value) => `${value} g`],
  ['dimensions', 'Dimensions'],
  ['build_material', 'Build'],
  ['ip_rating', 'Rating'],
];

function specRows(specs = {}) {
  return SPEC_FIELDS.reduce((rows, [key, label, format]) => {
    const raw = specs[key];
    if (raw === null || raw === undefined || raw === '') return rows;
    const text = format ? format(raw) : String(raw);
    if (text) rows.push({ key, label, text });
    return rows;
  }, []);
}

function ScoreGrid({ scores }) {
  if (!scores) return null;
  const cells = SCORE_FIELDS.filter(([key]) => Number(scores[key]) > 0);
  if (!cells.length) return null;
  return (
    <div className="device-scores">
      {cells.map(([key, label]) => (
        <div key={key} className="device-score-cell">
          <strong>{Number(scores[key]).toFixed(1)}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DevicePage({ identifier }) {
  const { data, error, loading, refetch } = useApi(`/devices/${encodeURIComponent(identifier)}`);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    setActiveImage(null);
  }, [identifier]);

  const similar = useApi(`/devices/${encodeURIComponent(data?.id || identifier)}/similar`, {
    params: { limit: 3 },
    skip: !data?.id,
  });

  const notFound = error?.code === 'device_not_found';
  const gallery = [data?.image_url, ...(data?.gallery_urls || [])].filter(Boolean);
  const image = activeImage || gallery[0];
  const rows = specRows(data?.specs);

  return (
    <div className="device-page">
      <header className="category-nav">
        <a href="#/" className="category-back-link" aria-label="Back to homepage">
          Home
        </a>
        <img src={logoImg} alt="RMDU Mobile" className="category-nav-logo" />
        <a href="#/search/" className="category-back-link" aria-label="Search the catalog">
          Search
        </a>
      </header>

      <div className="device-wrap">
        {notFound ? (
          <EmptyState
            title="Device not found."
            hint={`Nothing in the catalog matches "${identifier}". It may have been removed, or the link is mistyped.`}
          />
        ) : (
          <DataState
            loading={loading}
            error={error}
            onRetry={refetch}
            errorLabel="This device could not load."
            rows={3}
            label="Loading device…"
          >
            {data ? (
              <>
                <section className="device-hero">
                  <div>
                    <div className="device-gallery">
                      {image ? (
                        <img src={image} alt={data.name} />
                      ) : (
                        <span className="phone-card-media-fallback">{data.name?.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    {gallery.length > 1 ? (
                      <div className="device-gallery-thumbs">
                        {gallery.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            className={image === url ? 'is-active' : ''}
                            onClick={() => setActiveImage(url)}
                            aria-label={`View image ${index + 1}`}
                          >
                            <img src={url} alt="" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="device-head-brand">{data.brand?.name || 'Unbranded'}</p>
                    <h1 className="device-head-title">{data.name}</h1>
                    <p className="device-head-price">{formatPrice(data.price, data.currency)}</p>

                    {data.color_options?.length ? (
                      <div className="device-head-colors">
                        {data.color_options.map((color) => (
                          <span key={color}>{color}</span>
                        ))}
                      </div>
                    ) : null}

                    {data.categories?.length ? (
                      <div className="device-categories">
                        {data.categories.map((category) => (
                          <a key={category.id} href={categoryHref(category)}>
                            {category.icon ? `${category.icon} ` : ''}
                            {category.name}
                            {category.rank ? ` · #${category.rank}` : ''}
                          </a>
                        ))}
                      </div>
                    ) : null}

                    <ScoreGrid scores={data.scores} />

                    {data.reviews_summary?.count ? (
                      <p className="data-state-label" style={{ marginTop: '18px' }}>
                        {data.reviews_summary.average_rating} / 5 from {data.reviews_summary.count}{' '}
                        {data.reviews_summary.count === 1 ? 'review' : 'reviews'}
                      </p>
                    ) : null}
                  </div>
                </section>

                {rows.length ? (
                  <section className="device-panel">
                    <h2 className="device-panel-title">Specifications</h2>
                    <dl className="device-spec-table">
                      {rows.map((row) => (
                        <div key={row.key} className="device-spec-row">
                          <dt>{row.label}</dt>
                          <dd>{row.text}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                {data.pros?.length || data.cons?.length ? (
                  <section className="device-panel">
                    <h2 className="device-panel-title">The honest verdict</h2>
                    <div className="device-pros-cons">
                      {data.pros?.length ? (
                        <ul className="is-pro">
                          {data.pros.map((item) => (
                            <li key={item.id}>{item.description}</li>
                          ))}
                        </ul>
                      ) : null}
                      {data.cons?.length ? (
                        <ul className="is-con">
                          {data.cons.map((item) => (
                            <li key={item.id}>{item.description}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {data.features?.length ? (
                  <section className="device-panel">
                    <h2 className="device-panel-title">Features</h2>
                    <div className="device-feature-grid">
                      {data.features.map((feature) => (
                        <div key={feature.id} className="device-feature">
                          <strong>
                            {feature.icon ? `${feature.icon} ` : ''}
                            {feature.feature_name}
                          </strong>
                          <span>{feature.feature_value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {data.ussd_codes?.length ? (
                  <section className="device-panel">
                    <h2 className="device-panel-title">Useful USSD codes</h2>
                    <div className="device-ussd-grid">
                      {data.ussd_codes.map((code) => (
                        <div key={code.id} className="device-ussd">
                          <code>{code.code}</code>
                          <span>{code.description}</span>
                          <small>
                            {code.category}
                            {code.is_universal ? ' · universal' : ''}
                          </small>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {similar.data?.length ? (
                  <section className="device-panel">
                    <h2 className="device-panel-title">Similar phones</h2>
                    <div className="phone-grid">
                      {similar.data.map((item) => (
                        <PhoneCard key={item.id} device={{ ...item, brand_name: item.brand?.name }} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </DataState>
        )}
      </div>
    </div>
  );
}
