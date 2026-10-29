# Skill: Hooks (Custom Hook Architecture & Data Seams for RMDU Mobiles)

Global authority for custom React hooks in RMDU Mobiles. Hooks act as the clean abstraction layer connecting component views to application state and future backend APIs.

---

## When to Create a Custom Hook

1. **Multi-Consumer Stateful Logic**: Shared state accessed by multiple components (e.g. pinned devices for comparison, active budget filters, currency toggle).
2. **Backend Seam Layer**: Every asynchronous data read, mutation, or mock operation flows through a named hook so that transitioning from mock fixtures to live production endpoints alters only the hook implementation, leaving component UI untouched.
3. **Complex Workflows**: Multi-step state machines (e.g. 3-step AI recommendation quiz, comparison difference calculation).

---

## Canonical Platform Hooks

- `usePhones(categoryKey)`:
  - Returns: `{ phones, isLoading, error, refetch }`.
  - Encapsulates category filtering, data fetching, and caching.
- `usePhoneFilter(phones)`:
  - Returns: `{ filteredPhones, minPrice, maxPrice, setPriceRange, selectedBrands, toggleBrand, sortBy, setSortBy, resetFilters }`.
  - Manages non-blocking budget filtering via `useTransition`.
- `useDeviceComparison()`:
  - Returns: `{ pinnedPhones, isPinned, togglePin, removePhone, clearAll, isDrawerOpen, setIsDrawerOpen, highlightDiffs, setHighlightDiffs }`.
  - Manages the pinned phone list (up to 4 devices) with `localStorage` persistence.
- `useAiRecommender()`:
  - Returns: `{ isOpen, openQuiz, closeQuiz, currentStep, answers, selectAnswer, matchedPhones, compatibilityScore, resetQuiz }`.
  - Manages the diagnostic quiz questions and computes match scores.
- `useDocumentHead({ title, description, canonicalPath })`:
  - Dynamically sets document title, meta tags, and canonical URL in React SPA.

---

## Naming & Return Conventions

- Always name with `useX` camelCase (`usePhones`, `useDeviceComparison`).
- Return an object with explicit data properties and named action functions:
  ```js
  return { data, actions, state };
  ```
- Never return anonymous tuple arrays for hooks with more than 2 returned values (avoids positional bugs).

---

## Good / Bad

- ✅ `const { togglePin, isPinned } = useDeviceComparison();` invoked on phone card compare checkbox.
- ❌ Direct inline `fetch('/api/v1/phones')` inside `PhoneCard.jsx`.
- ✅ Storing pinned comparison state in a shared hook that persists across category navigation.
- ❌ Re-implementing budget filtering logic in 3 different view components.
