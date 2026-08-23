---
name: Tailwind CSS variable token pattern
description: How CSS custom properties must be formatted when Tailwind wraps them in hsl()
---

## Rule
When `tailwind.config.ts` consumes CSS variables as `hsl(var(--x))`, the variables in `:root` MUST be raw HSL triplets, NOT wrapped in `hsl()`.

**Correct:**
```css
:root {
  --background: 47 20% 91%;
  --border: 45 9% 73%;
}
```

**Wrong (produces invalid double-hsl):**
```css
:root {
  --background: hsl(47 20% 91%);  /* becomes hsl(hsl(...)) → falls back to white */
}
```

**Why:** Tailwind color utilities wrap the variable: `background: hsl(var(--background))`. If the variable already contains `hsl(...)`, the result is `hsl(hsl(47 20% 91%))` which is invalid CSS and browsers fall back to white/black.

**Exception:** Utilities defined in `@layer utilities` with literal `hsl()` values are fine because they don't go through Tailwind's variable wrapper.

**How to apply:** Any time you add/edit CSS design tokens that Tailwind will consume, write raw triplets in `:root`. Custom properties used only in `@layer utilities` (like `.text-cobalt`, `.bg-cobalt`) can use literal `hsl()`.
