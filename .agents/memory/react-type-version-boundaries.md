---
name: React type-version boundaries
description: Handling incompatible React ref typings caused by multiple React 19 type-package minor versions in the workspace.
---

When separate workspace dependencies resolve different React 19 type-package minor versions, bridge only the affected third-party component boundary with a narrow compatibility cast, rather than weakening application types globally.

**Why:** React 19's ref callback typings use a branded return type. Two installed minor versions can therefore report structurally identical ref types as incompatible, especially when forwarding props between UI libraries.

**How to apply:** Prefer aligning dependency versions when a coordinated package update is intended. If the mismatch is limited to a library wrapper and has no runtime effect, cast precisely at that wrapper boundary and retain normal type checking everywhere else.