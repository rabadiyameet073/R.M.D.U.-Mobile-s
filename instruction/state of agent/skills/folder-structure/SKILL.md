# Skill: Folder Structure (React 18 + Vite SPA Architecture)

Global authority for file organization, component placement, and module boundaries in RMDU Mobiles.

---

## Architecture Map

```
frontend/src/
├── components/
│   ├── ui/                   # Base reusable primitives (Button, Input, Modal, Drawer, Badge, RangeSlider)
│   ├── smartphones/          # Domain components (PhoneCard, ComparisonDrawer, ComparisonMatrix, FilterBar)
│   ├── layout/               # Shell chrome components (Header, Footer, NavOverlay, MobileMenu)
│   ├── sections/             # Reusable sections (CategoryHero, TrendingComparisons, QuizTeaser)
│   ├── seo/                  # JsonLd.jsx, MetaHead.jsx
│   └── common/               # ErrorBoundary.jsx, Preloader.jsx, CustomCursor.jsx
├── hooks/                    # Custom React hooks & state machines
│   ├── usePhones.js          # Phone data fetching, caching, and category filter
│   ├── usePhoneFilter.js     # Budget range and brand selection
│   ├── useDeviceComparison.js# Pinned devices and comparison matrix state
│   ├── useAiRecommender.js   # 3-step quiz logic and scoring engine
│   └── useDocumentHead.js    # Dynamic document.title and canonical URL updater
├── services/                 # FastAPI & Supabase API clients
│   ├── apiClient.js          # Base HTTP client with error handlers
│   └── phoneService.js       # Phone catalog & comparison API endpoints
├── data/                     # Offline fixtures & quiz question trees
│   ├── phoneFixtures.js      # Verified smartphone specifications
│   └── quizQuestions.js      # Diagnostic decision tree
├── lib/                      # Pure helper functions (no JSX, no state)
│   ├── cn.js                 # Class merging utility (clsx + tailwind-merge)
│   ├── formatCurrency.js     # Currency formatter (INR ₹ / USD $)
│   └── specScoring.js        # Benchmark index calculations
├── styles/                   # Styling system
│   ├── global.css            # Obsidian design tokens, @layer base, resets
│   └── pages/                # Page-level style supplements
├── App.jsx                   # View routing, route matching, and layout shell
└── main.jsx                  # React root mount and Lenis smooth scroll setup
```

---

## Rules

1. **Component Separation**:
   - `ui/`: Domain-agnostic primitives only (no phone models, category keys, or quiz questions).
   - `smartphones/`: Smartphone-specific domain components.
   - `layout/`: Shell chrome components only.
2. **Pure Utilities in `lib/`**: Pure functions only. No React hooks, no DOM manipulation, and no JSX in `lib/`.
3. **Data Isolation**: Mock datasets and initial fixtures live in `data/` and are consumed through custom hooks in `hooks/`.

---

## Good / Bad

- ✅ Placing `formatCurrency()` inside `lib/formatCurrency.js`.
- ❌ Putting business logic or data fetching inside `components/ui/Button.jsx`.
- ✅ Keeping `ComparisonDrawer.jsx` in `components/smartphones/` and importing `Drawer` from `ui/`.
- ❌ Hardcoding 300 lines of phone JSON directly inside `PhoneCard.jsx`.
