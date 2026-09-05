#!/usr/bin/env bash
set -e

# ==========================================================
# Benmi POS - Web Assets Sync Script for Capacitor
# Copies root web files into apps/android-pos/dist/
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "📦 Preparing web assets in $DIST_DIR..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 1. Copy POS and Customer HTML files
cp "$ROOT_DIR/orders.html" "$DIST_DIR/orders.html"
# Set orders.html as default landing page index.html in the Android POS App
cp "$ROOT_DIR/orders.html" "$DIST_DIR/index.html"
if [ -d "$ROOT_DIR/experiment" ]; then
  cp -r "$ROOT_DIR/experiment" "$DIST_DIR/"
fi
if [ -f "$ROOT_DIR/orders_experiment.html" ]; then
  cp "$ROOT_DIR/orders_experiment.html" "$DIST_DIR/"
fi
if [ -f "$ROOT_DIR/orders_experiments.html" ]; then
  cp "$ROOT_DIR/orders_experiments.html" "$DIST_DIR/"
fi
if [ -f "$ROOT_DIR/index.html" ]; then
  cp "$ROOT_DIR/index.html" "$DIST_DIR/customer-menu.html"
fi

# 2. Copy CSS stylesheets
if [ -d "$ROOT_DIR/css" ]; then
  cp -r "$ROOT_DIR/css" "$DIST_DIR/"
fi
if [ -f "$ROOT_DIR/index.css" ]; then
  cp "$ROOT_DIR/index.css" "$DIST_DIR/"
fi

# 3. Copy JavaScript modules
if [ -d "$ROOT_DIR/js" ]; then
  cp -r "$ROOT_DIR/js" "$DIST_DIR/"
fi

# 4. Copy assets & images if present
if [ -d "$ROOT_DIR/images" ]; then
  cp -r "$ROOT_DIR/images" "$DIST_DIR/"
fi
if [ -d "$ROOT_DIR/assets" ]; then
  cp -r "$ROOT_DIR/assets" "$DIST_DIR/"
fi
if [ -f "$ROOT_DIR/blab_icon.png" ]; then
  cp "$ROOT_DIR/blab_icon.png" "$DIST_DIR/"
fi

echo "✅ Web assets synchronized successfully into $DIST_DIR!"
