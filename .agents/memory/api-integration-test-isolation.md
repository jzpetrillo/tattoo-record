---
name: API integration test isolation
description: Why API WebSocket suites cannot share one Node test process and how to run them reliably.
---

Run WebSocket integration suites in separate processes rather than passing every API test file to one `tsx --test` invocation.

**Why:** Route registration installs process-level WebSocket upgrade handlers and background schedulers. Re-registering them for later test files in the same process can call `handleUpgrade` more than once for a socket and cause timeouts even with test concurrency set to one.

**How to apply:** Use the package’s normal per-file test execution pattern for WebSocket coverage. For focused HTTP integration tests that start the full API, use the test runner’s forced-exit option so background schedulers do not keep the completed test process alive.