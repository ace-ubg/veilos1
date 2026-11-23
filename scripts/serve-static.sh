#!/bin/bash
# Build the static site into staticbuild/ and serve it on :3000.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

cleanup() {
    if [ -n "$SERVER_PID" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM

bun install
bash ci/build-static.sh

cd staticbuild
echo "Static server starting at http://localhost:3000"
npx serve -l 3000 &
SERVER_PID=$!
wait $SERVER_PID
