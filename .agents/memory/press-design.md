---
name: Press visual design tokens
description: CSS custom property names and Tailwind utility classes for the Press editorial theme
---
## Key rules
- Active nav / active tab → `bg-cobalt text-white` (not border or font-weight only)
- Verified badge → `<Star className="text-cobalt fill-current" />`
- Profile stats → mono blocks: `border border-border divide-x divide-border`, numbers in `font-mono font-bold text-cobalt`
- Content grid → `grid grid-cols-3 gap-px bg-foreground` (ink gap technique)
- Page/section headings → `press-nameplate` class (defined in @layer utilities in index.css)
- Meta labels (role, tab, nav text) → `meta` class (Space Mono, uppercase, tracking-widest)
- `.editorial-title` = very large condensed heading for splash/hero

**Why:** Part B of the "Press" redesign task. Must stay consistent so future UI additions match the editorial aesthetic.

**How to apply:** Any new page header → `press-nameplate`. Any new nav/tab active state → `bg-cobalt text-white`. Flash sale context only → `bg-flash text-white`. No other color accents.
