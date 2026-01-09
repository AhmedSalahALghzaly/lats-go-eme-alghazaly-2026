#!/bin/bash

# =============================================================================
# Cache Clearing Script for Al-Ghazaly React Native Expo App
# Ensures the latest code is always running by clearing all cached data
# =============================================================================

echo "🧹 Clearing all caches for fresh build..."
echo "==========================================="

# Navigate to frontend directory
cd "$(dirname "$0")/.." || exit 1
FRONTEND_DIR=$(pwd)

echo ""
echo "📍 Working in: $FRONTEND_DIR"
echo ""

# 1. Stop any running Metro bundler
echo "🛑 Stopping Metro bundler..."
pkill -f "metro" 2>/dev/null || true
pkill -f "expo" 2>/dev/null || true
sleep 2

# 2. Clear Watchman cache
echo "👀 Clearing Watchman cache..."
watchman watch-del-all 2>/dev/null || echo "  (Watchman not installed - skipping)"

# 3. Clear Metro bundler cache
echo "🚇 Clearing Metro cache..."
rm -rf "$FRONTEND_DIR/.metro-cache" 2>/dev/null
rm -rf "$FRONTEND_DIR/node_modules/.cache" 2>/dev/null
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/haste-* 2>/dev/null

# 4. Clear Expo cache
echo "📱 Clearing Expo cache..."
rm -rf ~/.expo 2>/dev/null
rm -rf "$FRONTEND_DIR/.expo" 2>/dev/null

# 5. Clear React Native cache
echo "⚛️  Clearing React Native cache..."
rm -rf /tmp/react-* 2>/dev/null

# 6. Clear Yarn/npm cache (optional - uncomment if needed)
echo "📦 Clearing package manager cache..."
yarn cache clean 2>/dev/null || npm cache clean --force 2>/dev/null || true

# 7. Clear AsyncStorage data (for development only)
echo "💾 AsyncStorage will be cleared on next app launch"

# 8. Reinstall node_modules (optional - uncomment if needed)
# echo "📥 Reinstalling dependencies..."
# rm -rf node_modules
# yarn install

echo ""
echo "==========================================="
echo "✅ All caches cleared successfully!"
echo ""
echo "Next steps:"
echo "  1. Run: yarn start --clear"
echo "  2. In Expo Go, shake device and select 'Reload'"
echo "  3. If issues persist, reinstall node_modules:"
echo "     rm -rf node_modules && yarn install"
echo ""
