/**
 * One catalog tile.
 *
 * The card prints only fields the API returns (`SiteDeviceCard`), so a device
 * inserted in SQL and a device created in the console render identically —
 * including partially filled rows, which degrade to fewer facts rather than to
 * a broken tile.
 */

import React, { useState } from 'react';

import { deviceHref, formatPrice } from '../lib/api';

/* Preferred spec order, with the label each chip prints. Keeps `key_specs`
 * (a free-form jsonb column) from dictating the tile's layout. */
const SPEC_CHIPS = [
  ['processor_name', (value) => String(value)],
  ['ram_gb', (value) => `${value}GB RAM`],
  ['storage_gb', (value) => `${value}GB`],
  ['battery_mah', (value) => `${value} mAh`],
  ['charging_watt', (value) => `${value}W charge`],
  ['display_size_inch', (value) => `${value}"`],
  ['refresh_rate_hz', (value) => `${value}Hz`],
  ['camera_primary_mp', (value) => `${value}MP`],
  ['five_g', (value) => (value ? '5G' : null)],
  ['ip_rating', (value) => String(value)],
];

const MAX_CHIPS = 3;

function specChips(keySpecs = {}) {
  const chips = [];
  for (const [key, label] of SPEC_CHIPS) {
    if (chips.length >= MAX_CHIPS) break;
    const raw = keySpecs[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const text = label(raw);
    if (text) chips.push({ key, text });
  }
  return chips;
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export default function PhoneCard({ device, rank = null, secondaryScore = null, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (!device) return null;

  const chips = specChips(device.key_specs);
  const showImage = Boolean(device.image_url) && !imageFailed;
  const score = device.overall_score ?? secondaryScore;

  return (
    <article className={`phone-card ${className}`.trim()}>
      <a className="phone-card-link" href={deviceHref(device)}>
        <div className="phone-card-media">
          {showImage ? (
            <img
              src={device.image_url}
              alt={device.name}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="phone-card-media-fallback" aria-hidden="true">
              {initials(device.name)}
            </span>
          )}

          {rank ? <span className="phone-card-rank">#{rank}</span> : null}
          {device.is_featured ? <span className="phone-card-badge">Editor&rsquo;s pick</span> : null}
        </div>

        <div className="phone-card-body">
          {device.brand_name ? <p className="phone-card-brand">{device.brand_name}</p> : null}
          <h3 className="phone-card-name">{device.name}</h3>

          {chips.length ? (
            <ul className="phone-card-specs">
              {chips.map((chip) => (
                <li key={chip.key}>{chip.text}</li>
              ))}
            </ul>
          ) : null}

          <div className="phone-card-foot">
            <span className="phone-card-price">{formatPrice(device.price, device.currency)}</span>
            {score !== null && score !== undefined ? (
              <span className="phone-card-score">
                {Number(score).toFixed(1)}
                <small>/10</small>
              </span>
            ) : null}
          </div>
        </div>
      </a>
    </article>
  );
}
