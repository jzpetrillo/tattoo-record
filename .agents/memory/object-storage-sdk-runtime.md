---
name: Object Storage SDK runtime
description: Runtime constraints discovered while integrating the Replit Object Storage Node SDK in the bundled API server.
---

Initialize the Object Storage client lazily with the explicit `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, and keep `@replit/object-storage` externalized as an intact runtime dependency when bundling the API.

**Why:** In SDK version 1.0.0, implicit default-bucket discovery returned an empty bucket name in this workflow and crashed during module initialization. Partially bundling the SDK while externalizing Google packages also left an unresolved transport import.

**How to apply:** For future storage work, avoid module-load client initialization, preserve a clean unavailable-storage response when configuration is absent, and re-check these constraints before changing the API bundler or SDK version.