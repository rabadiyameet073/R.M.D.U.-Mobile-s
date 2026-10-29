# Module 03: React 18 + Vite SPA & Styling Architecture

> **The Single Source of Truth for Project Architecture, Routing, and Styling in RMDU Mobiles**

---

## 1. Enterprise React 18 + Vite Project Structure

```
frontend/
├── index.html                        # Root HTML template (fonts, preloads, meta fallbacks)
├── vite.config.js                    # Vite bundler, React plugin & alias configuration
├── package.json                      # Dependencies (React 18, Lenis, GSAP, Lucide React)
│
├── public/                           # Static production assets
│   ├── robots.txt                    # Production search crawler rules
│   ├── sitemap.xml                   # Index of active routes & category pages
│   └── media/                        # Video loops & static high-res product renders
│
├── src/
│   ├── main.jsx                      # App root mount, global CSS import, Lenis initialization
│   ├── App.jsx                       # Top-level view router, route definitions, layout shell
│   │
│   ├── components/                   # Component hierarchy
│   │   ├── ui/                       # Reusable atomic primitives (Button, Input, Badge, Modal, Drawer, Slider)
│   │   ├── layout/                   # Chrome components (Header, NavOverlay, Footer, MobileMenu)
│   │   ├── smartphones/              # Domain components (PhoneCard, SpecDetailModal, ComparisonDrawer, FilterBar)
│   │   ├── sections/                 # Home hero, category showcase, comparison preview, quiz teaser
│   │   ├── seo/                      # JsonLd.jsx, MetaHead.jsx
│   │   └── common/                   # Preloader.jsx, CustomCursor.jsx, ErrorBoundary.jsx
│   │
│   ├── hooks/                        # Custom stateful hooks & API seams
│   │   ├── usePhones.js              # Phone fetching, caching, and category filtering
│   │   ├── usePhoneFilter.js         # Budget range slider, brand toggles, and sorting state
│   │   ├── useDeviceComparison.js    # Side-by-side pinned devices state & comparison logic
│   │   ├── useAiRecommender.js       # 3-step recommendation diagnostic quiz engine
│   │   └── useDocumentHead.js        # Dynamic document.title, canonical link, and meta updater
│   │
│   ├── services/                     # 2-Tier Data Clients (FastAPI & Supabase)
│   │   ├── supabaseClient.js         # Client-Direct Supabase JS client (Anon key: public catalog, Google OAuth, RLS)
│   │   ├── apiClient.js              # FastAPI REST client (Vector search, AI RAG streaming, admin endpoints)
│   │   └── phoneService.js           # Unified facade: fetches from Supabase view or FastAPI with offline fallback
│   │
│   ├── data/                         # Initial fixtures & offline fallback data
│   │   ├── phoneFixtures.js          # Verified smartphone specifications (Budget, Gaming, Camera, etc.)
│   │   └── quizQuestions.js          # Diagnostic decision tree for AI matchmaker
│   │
│   ├── lib/                          # Pure utilities (no JSX, no hooks)
│   │   ├── cn.js                     # Class merging helper (clsx + tailwind-merge)
│   │   ├── formatCurrency.js         # INR (₹) and USD ($) currency formatting
│   │   └── specScoring.js            # Hardware scoring algorithm (AnTuTu, Geekbench, mAh weights)
│   │
│   └── styles/                       # Central styling system
│       ├── global.css                # Obsidian design tokens, @layer base, typography, resets
│       └── pages/                    # Page-specific styling overlays if needed
```

---

## 2. React SPA View & Routing Conventions

RMDU Mobiles operates as a high-performance Single Page Application (SPA) with smooth client-side route transitions:

| Route | View Purpose | Code-Splitting Strategy | Notes |
|---|---|---|---|
| `/` | Homepage Hero, Category Hub, Trending Comparisons | Eagerly loaded | Primary landing experience |
| `/budget-killer` | Value-focused devices, performance-per-rupee filters | Route view component | Category video loop + dynamic budget slider |
| `/gaming-guru` | High-FPS devices, cooling & touch-sampling matrix | Route view component | Thermal stability metrics & FPS charts |
| `/camera-champ` | Photography phones, sensor size & zoom filters | Route view component | Sample photo galleries & sensor teardowns |
| `/battery-boss` | Endurance ranking, fast-charging speed tiers | Route view component | SOT battery endurance index |
| `/goat` | Top-tier flagships, all-around excellence | Route view component | No-compromise hardware spec tables |
| `/compare` | Side-by-side device matrix (2–4 phones) | Lazy loaded (`React.lazy`) | Sticky comparison header & diff highlighter |

---

## 3. Core React 18 + Vite Architectural Patterns

### A. Non-Blocking Transitions with `useTransition`
When users scrub the budget range slider across 100+ devices, wrap state updates in `startTransition` so the slider handle moves with 60 FPS fluidity while the list recalculates in the background:
```jsx
import { useState, useTransition } from 'react';

export function BudgetFilter({ onBudgetChange }) {
  const [sliderVal, setSliderVal] = useState(25000);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    const val = Number(e.target.value);
    setSliderVal(val); // Instant slider thumb response
    startTransition(() => {
      onBudgetChange(val); // Deferred list re-filtering
    });
  };

  return <input type="range" value={sliderVal} onChange={handleChange} />;
}
```

### B. Suspense & Route Code Splitting
Heavy secondary views (e.g., deep side-by-side comparison tables, 3D device viewer, AI quiz engine) must load asynchronously via `React.lazy` wrapped in `<Suspense>`:
```jsx
import React, { Suspense, lazy } from 'react';
import { SkeletonGrid } from './components/ui/Skeleton';

const ComparisonDrawer = lazy(() => import('./components/smartphones/ComparisonDrawer'));

export function AppShell() {
  return (
    <Suspense fallback={<SkeletonGrid count={4} />}>
      <ComparisonDrawer />
    </Suspense>
  );
}
```

### C. Error Boundary Architecture (`ErrorBoundary.jsx`)
Prevent component runtime crashes from tearing down the entire application. Wrap major view regions in standard React Error Boundaries:
```jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-surface-slate border border-hairline rounded-2xl">
          <h2 className="text-xl font-bold text-text-primary">Unable to load this section</h2>
          <p className="text-text-secondary mt-2">Please refresh or select another category.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 4. Styling & Design Token Architecture

### A. Unified Utility Merging Helper (`cn`)
Always merge conditional classes using `cn()` (`clsx` + `tailwind-merge`) to guarantee caller overrides win cleanly without CSS specificity conflicts:

```javascript
// src/lib/cn.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### B. Design Tokens in `src/styles/global.css`
```css
:root {
  /* Surfaces */
  --bg-canvas: #08080A;          /* Deep obsidian canvas */
  --bg-surface: #0F0F14;         /* Slate card surface */
  --bg-surface-elevated: #16161E;/* Hover & active elevation */
  --bg-surface-subtle: #1C1C26;  /* Sub-surfaces & input backgrounds */

  /* Hairlines & Borders */
  --border-hairline: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-focus: #10B981;

  /* Category Semantic Accents */
  --accent-budget: #10B981;      /* Emerald (Budget Killer) */
  --accent-gaming: #06B6D4;      /* Electric Cyan (Gaming Guru) */
  --accent-camera: #F59E0B;      /* Amber / Warm Gold (Camera Champ) */
  --accent-battery: #8B5CF6;     /* Purple / High-Energy (Battery Boss) */
  --accent-goat: #EAB308;        /* Sovereign Gold (G.O.A.T) */

  /* Typography */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
}
```

---

## 5. Animation Architecture: GSAP & Lenis

### A. Lenis Smooth Scrolling
Initialized in `main.jsx`, providing fluid scroll dynamics without disrupting keyboard navigation or touch momentum:
```javascript
import Lenis from '@studio-freight/lenis';

export const lenis = new Lenis({
  duration: 1.0,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

### B. GSAP Timeline Scope Cleanup
Always wrap GSAP animations in `gsap.context()` inside `useEffect` or `useLayoutEffect` to automatically revert styles and clean up listeners on component unmount:
```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function HeroBanner() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-badge', { opacity: 0, y: -20, duration: 0.6, ease: 'power3.out' });
      gsap.from('.hero-title', { opacity: 0, y: 30, duration: 0.8, delay: 0.2, ease: 'power3.out' });
    }, containerRef);

    return () => ctx.revert(); // Essential memory leak prevention!
  }, []);

  return <div ref={containerRef}>{/* JSX */}</div>;
}
```
