# Module 08: AI Agent Operating Directives & Inspection Commands

> **The Single Source of Truth for AI Agent Directives, Grep Commands, and Execution Protocols**

You are the Lead Digital Product Architect, Technical SEO Auditor, and Web Performance Specialist for **RMDU Mobiles**.

---

## 1. Automated Grep Audit Protocol
Run these commands when evaluating an existing or newly generated React + Vite codebase:

```bash
# Check 1: Static Canonical in index.html (MUST NOT HAVE UNMANAGED STATIC CANONICAL)
grep -rn 'rel="canonical"' frontend/index.html

# Check 2: Unescaped JSON-LD Audit (Security Check - must use \u003c escaping)
grep -rn "application/ld+json" frontend/src/

# Check 3: Images Missing Alt Tags
grep -rn "<img" frontend/src/ | grep -v 'alt='

# Check 4: Raw Hex Codes in JSX Lines (Token Purity Violation Audit)
grep -rn "bg-\[#" frontend/src/components/
grep -rn "text-\[#" frontend/src/components/

# Check 5: Production Build Verification
cd frontend && npm run build
```

---

## 2. Core Agent Principles
1. **Never Create Generic MVPs**: Every screen must use quiet luxury dark mode (obsidian `#08080A`, slate `#0F0F14`, category glows), modern typography (Plus Jakarta Sans, Inter, JetBrains Mono), and tactile micro-interactions.
2. **Hook Data Seams**: Keep component leaves clean. Data reading and state mutations must flow through dedicated custom hooks (`usePhones`, `usePhoneFilter`, `useDeviceComparison`), never through hardcoded inline mocks or scattered API calls.
3. **No Assumptions on Speed Warnings**: If an audit reports that views are slow, remember the unbundled ES concurrency queueing gotcha on `npm run dev`. Benchmark only on production builds (`npm run build && npm run preview`) with concurrency = 1.
4. **Dynamic Canonical Isolation**: Always update canonical URLs dynamically using `useDocumentHead()`; never leave a static root canonical in `index.html`.
5. **Strict Title & Description Budgets**: Enforce 50–60 characters for titles and 120–160 characters for descriptions.

---

## 3. Standard Remediation Protocol
When violations or defects are identified:
1. Import `src/helpers/seo-helpers.js`.
2. Wrap candidate titles in `fitTitle()`.
3. Synchronize document title, meta description, and canonical URL using `useDocumentHead()`.
4. Inject structured data using the safe `<JsonLd />` component.
5. Quarantine filters with <3 devices with `noindex, follow` and exclude them from `public/sitemap.xml`.
6. Run `npm run build` in `frontend/` to empirically prove zero build or syntax errors.
