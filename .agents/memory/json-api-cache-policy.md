---
name: JSON API cache policy
description: Why Tattoo Record disables conditional browser caching for dynamic JSON API responses.
---

Dynamic `/api` responses must use `Cache-Control: no-store`, and the API server must keep Express ETags disabled.

**Why:** On authenticated reloads, Express converted successful JSON responses into bodyless `304 Not Modified` responses. The frontend query layer expects a JSON body and surfaced simultaneous stories, featured-posts, and feed errors even though the underlying database queries succeeded.

**How to apply:** Keep dynamic API routes out of browser conditional caching. Routes serving immutable media may explicitly override the shared no-store header with their own long-lived cache policy.