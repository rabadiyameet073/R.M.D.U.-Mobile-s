# Skill: Cascade Layers (CSS Precedence & Cascade Management)

Global authority for mastering and never losing to the CSS cascade in the RMDU Mobiles platform.

---

## The Cascade Law

Tailwind CSS emits utility classes into `@layer utilities`. **Any unlayered author CSS rule overrides utilities regardless of document source order.**

### Consequences:

1. **Base Resets**: All global resets (custom scrollbars, typography smoothing, canvas background defaults) must live in `@layer base`. Never write unlayered element resets (e.g. `button { ... }` or `input { ... }`) that touch background, padding, or borders.
2. **Component Migration**: When replacing custom CSS with utility classes, completely delete the legacy class rule rather than wrapping it in an unlayered block. Unlayered rules override utilities even if specified earlier in the file.
3. **Preflight Ownership**: Tailwind's preflight resets element margins, paddings, and button defaults in `@layer base`. Do not duplicate or contradict preflight rules.

---

## Good / Bad

- ✅ `@layer base { body { background-color: var(--bg-canvas); color: var(--text-primary); } }`
- ❌ Writing an unlayered `button { background: none; border: none; }` selector that silently nullifies all utility classes like `bg-emerald-500` or `border-hairline`.
- ✅ Deleting old `.phone-card` classes when converting `PhoneCard.jsx` to Tailwind utilities.
- ❌ Keeping legacy CSS classes active "just in case", which silently fight and break utility specificity.

---

## Diagnostic Check

If a utility class (such as `bg-accent-budget` or `p-6`) appears in the DOM inspector but is struck through with no higher-specificity utility present, inspect the style origin: an unlayered CSS declaration is beating the utility layer.
