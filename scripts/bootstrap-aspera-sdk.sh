#!/usr/bin/env bash
set -euo pipefail
ASPERA_SDK_VERSION="${ASPERA_SDK_VERSION:-0.2.30}"
CDN="https://cdn.jsdelivr.net/npm/@ibm-aspera/sdk@${ASPERA_SDK_VERSION}/dist/js"
curl -fsSL "${CDN}/aspera-sdk.js" -o public/aspera-sdk.js
echo "Downloaded Aspera SDK v${ASPERA_SDK_VERSION}"
