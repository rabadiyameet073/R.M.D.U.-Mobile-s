# Module 01: Project Master Guide & Quality Bar

## 1. Project Vision: RMDU Mobiles Smartphone Recommendation Platform
**RMDU Mobiles** is an enterprise-grade digital smartphone recommendation and device comparison platform designed to eliminate the frustration, cognitive overload, and deceptive marketing involved in buying a mobile device.

Rather than forcing users to manually sift through dozens of device spec sheets, conflicting YouTube reviews, and cryptic hardware acronyms, RMDU Mobiles structures smartphone discovery around five real-world consumer priorities:
1. **Budget Killer**: Peak performance-per-rupee/dollar, solid day-to-day responsiveness, and long software support on tight budgets.
2. **Gaming Guru**: Unthrottled sustained FPS, vapor chamber thermal dissipation, high touch-sampling rates, and minimal battery sag under load.
3. **Camera Champ**: Consistent daylight/night exposure, sensor stabilization (OIS), authentic skin tones, and professional 4K/60FPS video capture.
4. **Battery Boss**: Massive screen-on endurance, intelligent standby efficiency, and reliable high-wattage charging.
5. **G.O.A.T (Greatest Of All Time)**: Uncompromising flagship excellence combining cutting-edge silicon, aerospace build, tier-1 displays, and supreme haptics.

---

## 2. The Non-Negotiable Standards
1. **Production-Ready Commercial Polish**: Every screen, modal, card, spec table, and interaction must deliver Apple / Linear / Stripe / GSMArena caliber visual craft, responsiveness, and speed. No unfinished MVPs, broken layouts, or placeholder text.
2. **React 18 + Vite SPA Architecture**: Pure modular component architecture, robust custom hook data seams, React Suspense + `React.lazy` view splitting, and error boundaries. Zero messy spaghetti code.
3. **Enterprise Design System**: Cohesive semantic tokens (rich obsidian `#08080A`, slate card surfaces `#0F0F14`, elevated surfaces `#16161E`, 1px hairline borders `rgba(255,255,255,0.07)`, and distinct category accents: emerald, cyan, amber, purple, and gold) unified through `cn()`.
4. **Decision Support & Comparison Experience**: Interactive side-by-side device comparison matrix (up to 4 devices), real-time budget range sliders, 3-step AI recommendation quiz, and detailed specification breakdowns with score ratings.
5. **Technical SEO & Performance in React SPA**: 100% compliance with the 7 Core SEO Rules, dynamic `<head>` management via `useDocumentHead()`, static/pre-rendered `sitemap.xml` and `robots.txt` in `public/`, and XSS-safe JSON-LD structured data for `Product`, `Review`, and `ItemList`.

---

## 3. Technology Stack & Tooling
- **Frontend Framework**: React 18.2 + Vite 5.2 (JavaScript / JSX).
- **Styling Architecture**: Tailwind CSS / Vanilla CSS Design Tokens (`src/styles/global.css`) with unified class merging via `cn()`.
- **Motion & Interactions**: `@studio-freight/lenis` (smooth scrolling) + `gsap` (GSAP timeline micro-animations) + responsive CSS transitions.
- **Iconography**: `lucide-react`.
- **Backend & Database**: FastAPI REST API (`/api/v1/phones`, `/api/v1/compare`, `/api/v1/recommend`) + PostgreSQL / Supabase relational database (`database/01_mobilemart_schema.sql`).
- **Primary Developer & Architect**: Meet Rabadiya (`rabadiyameet09@gmail.com`).
