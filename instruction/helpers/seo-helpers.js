import React, { useEffect } from 'react';

/**
 * Target character length constraints
 */
export const SEO_CONSTRAINTS = {
  TITLE: { min: 50, max: 60 },
  DESCRIPTION: { min: 120, max: 160 },
  THIN_CONTENT_MIN_DEVICES: 3,
};

/**
 * Calculates distance of a title from the 50-60 character ideal window
 */
export const titleDistance = (length) => {
  return Math.max(
    SEO_CONSTRAINTS.TITLE.min - length,
    length - SEO_CONSTRAINTS.TITLE.max,
    0
  );
};

/**
 * Deterministically fits candidate titles into the 50-60 character range,
 * testing candidates with and without the site name.
 */
export const fitTitle = (candidates, siteName = 'RMDU Mobiles') => {
  if (!candidates || candidates.length === 0) return siteName;

  const variations = candidates.flatMap((title) => [
    `${title} | ${siteName}`,
    title,
  ]);

  return variations.reduce((best, candidate) => {
    return titleDistance(candidate.length) < titleDistance(best.length)
      ? candidate
      : best;
  });
};

/**
 * Custom React Hook: useDocumentHead
 * Dynamically updates document title, canonical URL, meta description,
 * robots indexing directive, and OpenGraph/Twitter cards in React SPA.
 */
export function useDocumentHead({
  title,
  description,
  canonicalPath = '',
  image = '/media/og-banner.jpg',
  index = true,
  siteName = 'RMDU Mobiles',
  appUrl = 'https://rmdumobiles.com',
}) {
  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title;
    }

    // 2. Canonical
    const fullCanonical = `${appUrl.replace(/\/$/, '')}/${canonicalPath.replace(/^\//, '')}`;
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', fullCanonical);

    // 3. Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    if (description) {
      metaDesc.setAttribute('content', description);
    }

    // 4. Robots Meta Tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', index ? 'index, follow' : 'noindex, follow');

    // 5. OpenGraph Tags
    const setMetaProperty = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaProperty('og:type', 'website');
    setMetaProperty('og:site_name', siteName);
    setMetaProperty('og:title', title);
    setMetaProperty('og:description', description);
    setMetaProperty('og:url', fullCanonical);
    setMetaProperty('og:image', image.startsWith('http') ? image : `${appUrl}${image}`);

    // 6. Twitter Cards
    const setMetaName = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', title);
    setMetaName('twitter:description', description);
    setMetaName('twitter:image', image.startsWith('http') ? image : `${appUrl}${image}`);

  }, [title, description, canonicalPath, image, index, siteName, appUrl]);
}

/**
 * XSS-Safe Structured Data (JSON-LD) Component for React
 * Escapes '<' to '\u003c' to completely neutralize '</script>' injection attacks.
 */
export function JsonLd({ data }) {
  useEffect(() => {
    if (!data) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', 'rmdu-jsonld');
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data]);

  return null;
}

/**
 * Generates Schema.org Product structured data for a smartphone device
 */
export function buildSmartphoneJsonLd(phone, appUrl = 'https://rmdumobiles.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${phone.brand} ${phone.model}`,
    image: phone.image?.startsWith('http') ? phone.image : `${appUrl}${phone.image}`,
    description: phone.overview || `${phone.brand} ${phone.model} specifications and recommendation review.`,
    brand: {
      '@type': 'Brand',
      name: phone.brand,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: phone.currency || 'INR',
      price: phone.price || 0,
      availability: 'https://schema.org/InStock',
      url: `${appUrl}/${phone.categorySlug || 'budget-killer'}#${phone.slug || ''}`,
    },
    aggregateRating: phone.rating ? {
      '@type': 'AggregateRating',
      ratingValue: phone.rating,
      bestRating: '10',
      ratingCount: phone.reviewCount || 42,
    } : undefined,
  };
}
