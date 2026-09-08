---
name: Metro and sibling Vite caches
description: Prevents Expo Metro crashes caused by watching temporary Vite dependency directories in sibling workspace artifacts.
---

Metro must exclude sibling artifacts' `node_modules/.vite` trees from its resolver watch scope when resolving packages from the monorepo root.

**Why:** Vite atomically replaces short-lived `deps_temp_*` directories during dependency optimization. Metro's fallback watcher can discover one and then crash with `ENOENT` when Vite removes it.

**How to apply:** Preserve a Metro resolver block-list rule for `node_modules/.vite` whenever changing mobile Metro configuration or workspace package resolution.