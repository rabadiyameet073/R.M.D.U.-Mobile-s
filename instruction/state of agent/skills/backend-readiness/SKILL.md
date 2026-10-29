# Skill: Backend Readiness (Smartphone UI That Survives a Real Backend)

Global authority for keeping the RMDU Mobiles frontend fully pluggable: the production FastAPI backend, PostgreSQL / Supabase database ([`01_mobilemart_schema.sql`](file:///d:/rmdu%20mobiles/database/01_mobilemart_schema.sql)), and authentication endpoints connect cleanly without requiring architectural rewrites in the UI.

For complete field dictionaries, refer to the companion manual: **[`DYNAMIC_DATABASE_API_REFERENCE.md`](file:///d:/rmdu%20mobiles/database/DYNAMIC_DATABASE_API_REFERENCE.md)** and **[`database/instruction_for_db/README.md`](file:///d:/rmdu%20mobiles/database/instruction_for_db/README.md)**.

---

## 2-Tier Data Access Architecture

The RMDU Mobiles platform operates on a dual-tier architecture:
1. **Tier 1: Client-Direct (Supabase JS SDK with Public Anon Key)**:
   - Reads catalog data: `devices`, `device_specs`, `device_scores`, `device_pros_cons`, `brands`, and `vw_category_device_ranks`.
   - Handles Google OAuth login: `supabase.auth.signInWithOAuth({ provider: 'google' })`.
   - Manages customer session state, personal taste profile (`user_profiles`), and saved comparison sessions (`comparison_sessions`) via Row Level Security (RLS).
2. **Tier 2: Backend API (FastAPI with Service Role Key)**:
   - Vector similarity search with pgvector (`VECTOR(1536)`) for AI chat assistant.
   - Admin score updates, category rank recalculation triggers, and background price alert webhooks.

---

## Rules

1. **Mock Seam Isolation**:
   - Mock data and local fixtures stay strictly isolated in `src/data/` (e.g. `phoneFixtures.js`, `quizQuestions.js`).
   - Component leaves consume data exclusively through narrow custom hooks (`usePhones`, `usePhoneFilter`, `useDeviceComparison`, `useAiRecommender`), never through direct fixture imports embedded deep inside leaf markup.
   - Client service stubs (`src/services/phoneService.js`, `src/services/supabaseClient.js`) indicate where live Supabase views and FastAPI endpoints connect — no third-party dependencies as fragile shortcuts.

2. **Smartphone & Comparison Identity**:
   - Device identity is structural: `phoneId` / `device_id` (UUID or slug like `samsung-galaxy-s24-ultra`).
   - Comparison mutations flow through typed hook actions:
     - `pinDeviceToCompare(phone)`
     - `removePinnedDevice(phoneId)`
     - `clearComparisonList()`
     - `submitAiQuiz(answers)`
   - Every mutation provides demo-truth feedback when simulated in mock mode:
     *"Comparison drawer updated — 3 devices pinned in local state."*

3. **Financial & Price Representation**:
   - Smartphone retail prices are stored as integer units in base currency (`price_inr` as integer rupees `29999`, `price_usd` as integer dollars `349`).
   - Display components format currency at render time via `formatCurrency(phone.price, 'INR' | 'USD')`. Never perform mathematical operations on floating point currency values.

4. **Session Storage Discipline**:
   - Local mock state is strictly namespaced under `rmdu_mobiles_v1_*` in `localStorage` or `sessionStorage` (e.g. `rmdu_mobiles_v1_pinned_phones`, `rmdu_mobiles_v1_quiz_answers`).
   - Provide a reset mechanism (`resetPlatformData()`) that restores initial fixtures and clears user sandbox state.

5. **Authentication & User Identity Stubs**:
   - Auth flows operate through stub interfaces (guest, customer, admin) until Google OAuth trigger (`02_google_oauth_customer_sync.sql`) is connected.
   - Mock identities remain strictly fictitious (`reviewer@example.com`).
   - Never commit API keys, service role secrets, or personal customer credentials to client code.

---

## Good / Bad

- ✅ `pinDeviceToCompare(phone)` passing through a typed hook seam (`useDeviceComparison`).
- ❌ Calculating price discount percentage using floating point arithmetic directly inside a card button.
- ✅ `resetPlatformData()` wiping `rmdu_mobiles_v1_*` keys and restoring default fixtures.
- ❌ Hardcoding raw `fetch('/api/phones')` directly inside `PhoneCard.jsx`.

---

## Landmines (Verify Before Trusting)

- **Comparison Tray Overflow**: Restrict pinned devices to a maximum of 4 simultaneously; handle 5th device attempt with a non-destructive toast notification.
- **Filter State Preservation**: When users toggle between `/budget-killer` and `/gaming-guru`, cleanly reset or preserve budget slider ranges according to category pricing realities.

