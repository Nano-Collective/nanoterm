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
pnpm run test:security

echo "All checks passed successfully!"
