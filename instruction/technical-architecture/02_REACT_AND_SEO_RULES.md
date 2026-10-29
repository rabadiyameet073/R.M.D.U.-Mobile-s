# Module 02: React SPA Technical SEO Rules & The Page Speed Bonus

> **The Single Source of Truth for Technical SEO on React 18 + Vite SPA Architecture**  
> Tailored for production single-page applications, dynamic DOM head management, and search engine crawlers.

Every view, category page, device comparison, and modal in RMDU Mobiles must strictly comply with these 7 core technical SEO rules plus the Vite production page speed benchmarking protocol.

---

## 1. Title Tag: 50–60 Characters

### Why It Matters
Google desktop displays title tags up to approximately **600 pixels width** (typically 50–60 characters), and mobile viewports display roughly the same.
- **Under 50 characters** (`Phones - Site`): Wastes valuable SERP headline space.
- **Over 60 characters**: Truncated by search engines with ellipses (`...`), cutting off search intent keywords.
- **The Site Name Trap**: Blindly appending ` - RMDU Mobiles` breaks long headlines. A 52-character device title becomes 67 characters and gets cut off.

### The Code Solution: `fitTitle()`
A deterministic algorithm evaluates candidate title variations (from comprehensive to concise) with and without the site name, picking the permutation with the lowest distance from the 50–60 character sweet spot:

```javascript
export const TITLE_RANGE = { min: 50, max: 60 };

export const titleDistance = (length) => {
  return Math.max(TITLE_RANGE.min - length, length - TITLE_RANGE.max, 0);
};

export const fitTitle = (candidates, siteName = 'RMDU Mobiles') => {
  if (!candidates || candidates.length === 0) return siteName;

  const permutations = candidates.flatMap((title) => [
    `${title} | ${siteName}`,
    title,
  ]);

  return permutations.reduce((best, current) => {
    return titleDistance(current.length) < titleDistance(best.length)
      ? current
      : best;
  });
};
```

### React SPA Implementation with `useDocumentHead`:
```javascript
import { useDocumentHead } from '../helpers/seo-helpers';
import { fitTitle } from '../helpers/seo-helpers';

export function CategoryPage({ category }) {
  const dynamicTitle = fitTitle([
    `${category.title} - Top Rated Phones & Value Guide`,
    `${category.title}: Best Smartphone Recommendations`,
    category.title,
  ], 'RMDU Mobiles');

  useDocumentHead({
    title: dynamicTitle,
    description: category.description,
    canonicalPath: `/${category.pageKey}`,
  });

  return (/* JSX */);
}
```

---

## 2. Meta Description: 120–160 Characters (Unique Per Category & Device)

### Why It Matters
- **Under 120 characters**: Google will frequently reject the description and substitute random snippets of body text.
- **Over 160 characters**: Truncated on mobile search results.
- **Duplicate Penalty**: If different categories share boilerplate descriptions (*"Browse phones on RMDU Mobiles"*), crawlers penalize duplicate metadata.

### Dynamic Formulation Formula
Build descriptions using a two-sentence formula: `[Category Core Value / Device Focus] + [Hardware Highlight or Spec Count]`.

```javascript
export const buildCategoryDescription = (categoryTitle, phoneCount) => {
  return `Explore ${phoneCount} curated ${categoryTitle} smartphones evaluated for sustained performance, display quality, and thermals. Unbiased recommendations by RMDU.`;
  // Exactly 156 characters (perfectly within the 120-160 window)
};
```

---

## 3. Canonical URL: Set Per View (The React `index.html` Trap)

### The Catastrophic Static `index.html` Trap
In a React Single Page Application (Vite), developers often hardcode `<link rel="canonical" href="https://rmdumobiles.com/">` inside `index.html` and never update it on client route transitions.
> [!CAUTION]
> If `index.html` has a static canonical pointing to the homepage, modern JavaScript crawlers (Googlebot, Bingbot) evaluating client-side rendered routes (`/gaming-guru`, `/camera-champ`) will read `https://rmdumobiles.com/` as the canonical source.
> Search engines will treat all your inner category pages as duplicate copies of your homepage and **de-index all your category and device pages!**

### The Mandatory Rule
- **NEVER** leave a static, hardcoded homepage canonical in `index.html` without client-side synchronization.
- **ALWAYS** update the canonical link element dynamically using the `useDocumentHead()` hook on every view:

```javascript
// Inside helpers/seo-helpers.js
export function setCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}
```

---

## 4. Broken Links & Empty Filter States: Fix Internal 404s

### The Problem
When a user filters for an extreme combination (e.g. ₹5,000 gaming phone with 120Hz display) and 0 phones match, throwing a broken 404 page triggers crawl errors:
- Wasted crawl budget.
- Missing title, missing H1, broken UX.

### The Correct Empty State Architecture
1. **Never throw a 404 on valid routes or active filters**.
2. **Serve HTTP Status 200 with `noindex, follow`**:
   - Render a helpful empty-state UI: *"No devices match this exact budget or filter combination. Try expanding your price range."*
   - Dynamically inject `<meta name="robots" content="noindex, follow">` while filters remain at 0 results.
   - **Result**: Internal link graph remains clean; search engines are instructed not to index empty thin results.

---

## 5. Image Alt Text: Descriptive Alt on Every Phone Render

### The Strategy
Crawlers flag any device image lacking an `alt` attribute or having empty `alt=""`.

1. **Phone Renders & Product Imagery (`<img>`)**:
   - Must provide descriptive hardware context:
     ```jsx
     <img
       src={phone.image}
       alt={`${phone.brand} ${phone.model} ${phone.color} - Front and Rear Camera Design`}
       loading="lazy"
       className="w-full h-auto object-contain"
     />
     ```
2. **Purely Decorative SVGs / Icons (Lucide React)**:
   - Mark with `aria-hidden="true"` so screen readers and SEO parsers identify them as non-content visuals:
     ```jsx
     <Flame className="w-5 h-5 text-emerald-400" aria-hidden="true" />
     ```

---

## 6. Thin Content: Quarantine Filter Combinations Under 3 Devices

### The Thin Content Penalty
Creating a dedicated page or query segment for a filter that has only 1 phone produces thin content that duplicates single device cards, triggering search engine ranking demotions.

### The Threshold Rule
- **Threshold**: Minimum of **3 verified smartphones**.
- **Fewer than 3 devices**:
  - Keep the view accessible to human users.
  - Set `robots: { index: false, follow: true }`.
  - Exclude from `public/sitemap.xml`.
- **3 or more devices**:
  - Automatically allow indexing (`robots: { index: true, follow: true }`).
  - Automatically include in `public/sitemap.xml`.

---

## 7. Robots, Sitemap & JSON-LD: Correct React + Vite Architecture

In React + Vite, static assets and crawlers are managed via the `public/` directory and client structured data injection:

### A. `public/robots.txt`
Served statically by Vite / production server at `/robots.txt`:
```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/

Sitemap: https://rmdumobiles.com/sitemap.xml
```

### B. `public/sitemap.xml`
Maintained in `public/` or generated via build script (`scripts/generate-sitemap.js`) querying the active database and enforcing the 3-device rule:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://rmdumobiles.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://rmdumobiles.com/budget-killer</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://rmdumobiles.com/gaming-guru</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://rmdumobiles.com/camera-champ</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://rmdumobiles.com/battery-boss</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://rmdumobiles.com/goat</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

### C. XSS-Safe JSON-LD Component (`src/components/seo/JsonLd.jsx`)
Embed structured schemas (`Product`, `Review`, `ItemList`, `Organization`) directly into the document. Always escape `<` with `\u003c` to eliminate script injection vulnerabilities:

```jsx
import React, { useEffect } from 'react';

export function JsonLd({ data }) {
  useEffect(() => {
    const scriptId = 'jsonld-structured-data';
    let script = document.getElementById(scriptId);
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');

    return () => {
      // Clean up script on unmount or view change
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [data]);

  return null;
}
```

---

## 🎁 BONUS: The Vite Dev Server Page Speed Benchmark Trap

### The Trap
When you run an automated crawler or performance auditor (Lighthouse, Screaming Frog, Sitebulb) against the Vite development server (`npm run dev` on `localhost:5173`):
1. The crawler fires **20 to 30 requests simultaneously**.
2. Vite dev mode serves JavaScript files as **native unbundled ES modules** on-demand.
3. Every single component and Lucide icon is loaded as an individual HTTP request.
4. Concurrency queues stall, resulting in false audit reports: *"Every page takes 3.8s to respond."*

### The Resolution Protocol
1. **Never benchmark speed on `npm run dev`**.
2. Always execute a production build and preview:
   ```bash
   npm run build
   npm run preview
   ```
3. Set your audit tool's concurrency to **1 (single-threaded)**.
4. Verify true response times with cURL:
   ```bash
   curl -o /dev/null -s -w 'Total Time: %{time_total}s | Status: %{http_code}\n' http://localhost:4173/budget-killer
   ```
   Isolated Vite production builds return in **0.03s – 0.15s**!
