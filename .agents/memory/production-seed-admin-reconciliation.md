---
name: Production seed admin reconciliation
description: Safety rules for correcting an existing production seed administrator after its configured credentials change.
---

Production seed credentials may need to repair an already-created admin, not only create a missing row. Reconcile by the stable configured username, update the email and password hash for that same admin, and refuse to proceed when the configured email or username belongs to another user or when the identities point to different users.

**Why:** A create-if-missing seed leaves a typo or stale password active forever, while matching a single identity too broadly could overwrite an unrelated account.

**How to apply:** Keep credential values in Replit Secrets, never expose or log them, and verify the production admin record after the API deployment starts.