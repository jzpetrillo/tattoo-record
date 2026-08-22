---
name: Expired session routing
description: How invalid client sessions should transition users between public and protected routes.
---

When an API request detects an expired or invalid persisted token, clear both browser persistence and the live auth store. Do not make the shared API client hard-redirect every 401 to login.

**Why:** The public root route is intentionally auth-aware: clearing live auth state lets it render the landing page. A hard redirect turns an expired session into an unexpected login screen and bypasses that public experience.

**How to apply:** Keep the auth-expiry event/store synchronization in place. Let protected route guards decide when unauthenticated visitors must be sent to `/auth`; public routes should gracefully show their signed-out state.