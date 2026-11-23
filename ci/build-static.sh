#!/bin/bash
export OUTPUT_DIR=staticbuild

rm -rf $OUTPUT_DIR
mkdir -p $OUTPUT_DIR

node scripts/copy-assets.mjs

if [ -f "$OUTPUT_DIR/config.js" ]; then
    printf 'let _CONFIG = %s' "$(jq -c -n '{"wispurl": "wss://anura.pro/", "bareurl": "https://aluu.xyz/bare/"}')" > $OUTPUT_DIR/config.js
fi
