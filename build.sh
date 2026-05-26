#!/bin/bash
# OASIS Magazine - React app build

echo "Building OASIS React app..."
npm run build

echo "Creating admin.html SPA entry..."
cp build/index.html build/admin.html

echo "Copying static assets..."
cp bear.png build/bear.png 2>/dev/null || true

echo "Build complete. Public magazine and admin are served by React."
