---
name: Demo login safety
description: Security constraints for the passwordless demo-login flow.
---

One-click demo login must be disabled unless the relevant server/client `DEMO_MODE` flags are explicitly set to `"true"`. Production may expose Artist, Studio, and Enthusiast demos only when intentionally enabled, but must never issue an Admin demo token or render an Admin demo button.

**Why:** Passwordless role selection is intentionally convenient for private demos, but becomes a privilege-escalation path when a default-on or public Admin option is introduced.

**How to apply:** Preserve strict server-side enforcement regardless of UI visibility; any future demo-login UI or endpoint change must retain the explicit opt-in and production Admin prohibition.