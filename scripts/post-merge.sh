#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Schema changes are applied deliberately through a reviewed migration step,
# not automatically reconciled against the database after every merge.
