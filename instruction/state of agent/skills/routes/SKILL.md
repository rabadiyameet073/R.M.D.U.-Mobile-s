# Skill: Routes (React SPA View Architecture & Technical SEO Per Route)

Global authority for routing conventions, metadata budgets, and structured data in RMDU Mobiles.

---

## Route Organization

- `/`: Flagship landing page, 5-category showcase, trending head-to-head comparisons, and AI matchmaker teaser.
- `/budget-killer`: Value champions, performance-per-rupee filters, and budget sliders.
- `/gaming-guru`: Sustained FPS beasts, vapor chamber cooling specs, and low-latency touch benchmarks.
- `/camera-champ`: Flagship sensors, periscope telephotos, OIS, and computational photography.
- `/battery-boss`: Screen-on time endurance leaders, battery health metrics, and rapid charging speeds.
- `/goat`: Uncompromising flagships (all-around highest scoring smartphones).
- `/compare`: Dedicated side-by-side comparison view with sticky spec headers and difference highlighting.

---

## Technical SEO Rules Per Route

1. **Title Budget (50–60 Characters)**:
   - Use `fitTitle(pageTitle, siteName)`. Never blindly append long site suffixes that exceed the 60-character budget.
   - Example: `"Gaming Guru: Best High FPS Gaming Phones | RMDU Mobiles"` (55 chars).
2. **Description Budget (120–160 Characters)**:
   - Strictly 120–160 characters. Must be 100% unique per route.
   - Example: *"Explore verified gaming smartphones tested for sustained FPS stability, vapor chamber cooling, and low-latency touch response. Unbiased picks by RMDU."* (152 chars).
3. **Canonical URL Isolation**:
   - Set canonical dynamically per view using `useDocumentHead()`. Never leave a static root canonical in `index.html`.
4. **Structured Data (JSON-LD)**:
   - Provide `Product` schema on individual smartphone modals/pages.
   - Provide `ItemList` schema on category views listing recommended phones.
   - Provide `Organization` schema on the homepage.
   - Always escape angle brackets: `JSON.stringify(data).replace(/</g, '\\u003c')`.

---

## Good / Bad

- ✅ Category title of 54 characters: `"Camera Champ: Best Photography Smartphones | RMDU Mobiles"`.
- ❌ Category title of 88 characters: `"RMDU Mobiles - The Ultimate Smartphone Recommendation Platform For Great Photos and Videos"`.
- ✅ Individual canonical URL: `https://rmdumobiles.com/gaming-guru`.
- ❌ Hardcoding root canonical `https://rmdumobiles.com/` in `index.html` for all routes.
