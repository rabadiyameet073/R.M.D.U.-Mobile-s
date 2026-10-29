# Skill: Theme Tokens (Semantic Design Tokens Grammar)

Global authority for design-token naming, declaration, and reuse in the RMDU Mobiles stylesheet (`src/styles/global.css`).

---

## Token Grammar

Tokens follow the strict semantic role grammar:
```
--bg-<role>
--border-<role>
--accent-<category>
--text-<role>
--font-<role>
```

### Core Semantic Roles:
- `--bg-canvas`: Primary backdrop obsidian (`#08080A`).
- `--bg-surface`: Base card surface (`#0F0F14`).
- `--bg-surface-elevated`: Hover/dialog card surface (`#16161E`).
- `--border-hairline`: Translucent border divider (`rgba(255, 255, 255, 0.07)`).
- `--accent-budget`: Emerald (`#10B981`) — Budget Killer value action.
- `--accent-gaming`: Cyan (`#06B6D4`) — Gaming Guru speed highlight.
- `--accent-camera`: Amber (`#F59E0B`) — Camera Champ imaging accent.
- `--accent-battery`: Purple (`#8B5CF6`) — Battery Boss endurance tier.
- `--accent-goat`: Gold (`#EAB308`) — G.O.A.T flagship prestige.
- `--text-primary`: High-contrast headings and active metrics (`#F8FAFC`).
- `--text-secondary`: Supporting labels, specs, and bios (`#94A3B8`).
- `--text-muted`: Captions, timestamps, and subtle hints (`#64748B`).

---

## Naming Rules

1. **Role, Not Page**:
   - Never name a token after a temporary screen (e.g. no `--color-page2-card` or `--color-quiz-button`).
   - Name the semantic UI role (`--bg-surface`, `--accent-budget`, `--border-hairline`).
2. **One Token Per Role + Value**:
   - If two elements currently share `#10B981` but represent different roles (e.g. Budget Category Tag vs Success Toast), separate semantic roles should be used if they may diverge in future themes.
3. **Declare Before Using**:
   - Inspect the stylesheet before adding any new color. If an equivalent semantic token exists, reuse it.

---

## Good / Bad

- ✅ Using `bg-surface border-hairline text-text-primary` on `PhoneCard.jsx`.
- ❌ Hardcoding `className="bg-[#0F0F14] border-[rgba(255,255,255,0.07)]"`.
- ✅ Declaring `--accent-gaming: #06B6D4;` in `global.css`.
- ❌ Naming a token `--color-blue-phone` after a temporary device mockup.
