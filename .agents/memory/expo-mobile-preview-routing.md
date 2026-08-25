---
name: Expo mobile preview routing
description: How to reach the running Expo web client in this workspace during browser-based QA.
---

For browser-based validation of the mobile artifact, use the Expo development domain reported by the managed Expo workflow rather than the artifact path on the shared proxy.

**Why:** The shared artifact route can return a blank/502 browser response even while Metro and the Expo web client are healthy on the Expo domain.

**How to apply:** Start or restart the managed mobile Expo workflow, read its reported Expo URL, and use that URL for browser screenshots and automated UI smoke tests. Physical-device testing still uses the workflow’s QR code.