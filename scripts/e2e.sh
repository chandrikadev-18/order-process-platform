#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Starting Order Processing Platform End-to-End Acceptance "
echo "=========================================================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "npm could not be found. Please install Node.js."
    exit 1
fi

# Run the TypeScript e2e test suite using ts-node
npm run e2e
