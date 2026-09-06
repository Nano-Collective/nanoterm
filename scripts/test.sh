#!/usr/bin/env bash
set -eo pipefail

echo "Running Biome Formatting Check..."
pnpm run test:format

echo "Running TypeScript Compilation Check..."
pnpm run test:types

echo "Running Biome Linter..."
pnpm run test:lint

echo "Running AVA Tests..."
pnpm run test:ava

echo "Running Knip Check..."
pnpm run test:knip

echo "Running Dependency Audit..."
pnpm run test:audit

echo "Running Semgrep Security Scan..."
if command -v semgrep >/dev/null 2>&1; then
  pnpm run test:security
else
  echo "Skipping Semgrep (not installed) — CI will run it."
fi

echo "All checks passed successfully!"
