#!/usr/bin/env bash
# Fails when generated code differs from what `mise run generate` produces.
set -euo pipefail

dirs=(spec/generated backend/src/generated frontend/src/generated)
snapshot() { find "${dirs[@]}" -type f -print0 | sort -z | xargs -0 shasum; }

before=$(snapshot)
if ! output=$(mise run generate 2>&1); then
  echo "$output" >&2
  exit 1
fi
after=$(snapshot)

if [[ "$before" != "$after" ]]; then
  echo "Generated code is stale: run 'mise run generate' and commit the result" >&2
  exit 1
fi
