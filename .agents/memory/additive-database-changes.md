---
name: Additive database changes
description: Why this project must not run a full schema push or reconcile
---

Apply new database structures through idempotent, additive statements in the existing startup initialization routine. Extend PostgreSQL enums with `ADD VALUE IF NOT EXISTS`.

**Why:** The user explicitly stated that six unused tables were deliberately removed from the schema definition but remain in the database. A full schema reconcile or push could drop these retained tables.

**How to apply:** Do not run schema push, force-push, or a full reconcile when implementing features. Add only the required create-if-not-exists tables/indexes, add-if-not-exists columns, and enum extensions. Any destructive cleanup requires separate explicit authorization.
