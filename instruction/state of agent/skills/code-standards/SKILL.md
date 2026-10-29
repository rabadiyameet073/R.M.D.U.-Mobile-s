# Skill: Code Standards (React 18 & JavaScript in Smartphone UI)

Global authority for component construction, props hygiene, and clean code in the RMDU Mobiles platform.

---

## Rules

1. **Class Merging & Conditional Classes**:
   - Use `cn()` (`clsx` + `tailwind-merge`) for all conditional or merged class lists.
   - Use strict ternary expressions over logical AND (`&&`) when toggling between two values of the same property (e.g. active vs inactive category pill).
2. **Iconography & Graphics (Lucide React)**:
   - Lucide React icons must use `color="currentColor"` with styling driven by `className="text-<token>"`.
   - Set icon dimensions via the `size` prop or Tailwind dimension classes (`w-4 h-4`, `w-5 h-5`).
   - Every standalone icon-only button must provide an explicit `aria-label`.
   - Decorative icons must include `aria-hidden="true"`.
3. **Props & Hydration Discipline**:
   - Zero dead props (declared in component parameters but never rendered in markup).
   - Zero unused imports or dead exports.
   - Storage safety: never read browser-only APIs (`localStorage`, `window.innerWidth`) directly inside state initializers without fallbacks. Initialize deterministically with a static default and synchronize in `useEffect`.
4. **Ergonomic Information Preservation**:
   - Mobile responsive states must never drop critical specifications: processor name, RAM/ROM tier, primary camera sensor, and price must remain clearly legible on small screens.
   - Resilient state: budget slider and quiz inputs must retain user selections if a modal is closed and reopened during the session.
5. **Strict Keying**:
   - Always supply stable, unique keys (`key={phone.id}`, `key={category.pageKey}`) on mapped collections. Never use array indices when filtering, searching, or sorting.

---

## Good / Bad

- ✅ `cn('px-4 py-2 rounded-lg transition-colors', isSelected ? 'bg-accent-budget/15 text-accent-budget border-accent-budget/40' : 'bg-surface text-text-secondary border-hairline')`
- ❌ `className={"border-hairline " + (active && "border-accent-budget")}` (unpredictable specificity and potential string concatenation bugs).
- ✅ Phone card retaining selected comparison state after user toggles price sorting.
- ❌ Initializing active currency via `useState(localStorage.getItem('currency'))` without SSR/fallback validation.
