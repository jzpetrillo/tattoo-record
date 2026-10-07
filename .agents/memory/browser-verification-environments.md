---
name: Browser verification environments
description: Distinguishing provided-browser availability from workspace Playwright CLI provisioning
---

The testing subagent's provided browser and the workspace Playwright CLI do not necessarily share installed browser executables.

**Why:** In this workspace, the CLI could not launch its configured Chromium binary while the provided browser successfully verified the same UI flow.

**How to apply:** A missing CLI executable is an infrastructure blocker, not an application failure. When installation is inappropriate, continue the same tester using its provided browser. For requests prohibiting database interaction, intercept all API calls and avoid API startup or real fixtures. Report browser checks separately from the unexecuted automated suite.
