#!/bin/bash
set -euxo pipefail

# Scramjet ships a prebuilt wasm rewriter in its npm package, so no Rust toolchain is needed.
bun install
bun run build
