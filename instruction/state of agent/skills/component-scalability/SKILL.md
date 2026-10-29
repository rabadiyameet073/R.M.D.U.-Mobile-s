# Skill: Component Scalability (Data-Driven Architecture & Loops Over Repetition)

Global authority for keeping smartphone platform components clean, DRY, and data-driven as device catalogs and category taxonomies expand.

---

## Rules

1. **Loops Over Repetition**:
   - Three or more near-identical JSX blocks must be driven by a structured config array and mapped via `.map()`.
   - Extract repeating layout patterns into dedicated child components (`PhoneCard`, `SpecRow`, `HighlightPill`, `ScoreBarItem`).
2. **Zero-Code Device Additions**:
   - Adding a new smartphone model or category must require adding a single structured data object in the data/database layer — never writing new branching markup or copy-pasting JSX blocks.
3. **Stable Keying**:
   - Always use immutable, unique keys (`key={phone.id}`, `key={spec.key}`) on mapped collections. Never use array index when filtering, searching, or sorting can occur.
4. **Shared Configuration Models**:
   - Navigation links, category tabs, hardware specifications, and filter options must be defined in structured configuration objects and consumed consistently across desktop headers, mobile drawers, and footers.

---

## Good / Bad

- ✅ Mapping phone cards cleanly:
  ```jsx
  {filteredPhones.map((phone) => (
    <PhoneCard
      key={phone.id}
      phone={phone}
      onSelect={() => handleOpenDetails(phone)}
      onCompareToggle={() => togglePinDevice(phone)}
      isPinned={isPinned(phone.id)}
    />
  ))}
  ```
- ❌ Copy-pasting six separate `<div>` card blocks for phones with hardcoded text and divergent class lists.
- ✅ Defining category specifications in a structured array of hardware dimensions (SoC, Display, Main Camera, Battery, Charging).
- ❌ Hardcoding 15 separate manual table rows in `ComparisonMatrix.jsx`.
