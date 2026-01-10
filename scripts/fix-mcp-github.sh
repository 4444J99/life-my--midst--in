#!/bin/bash
# AUTONOMOUS FIX SCRIPT FOR GITHUB MCP

echo "🔍 Checking 1Password status..."
if ! op whoami >/dev/null 2>&1; then
    echo "🔒 1Password is locked. Attempting to sign in..."
    eval $(op signin)
fi

echo "🔄 Fetching and sanitizing token..."
# Try to find the token. We search for the first item containing 'github' and 'token'
ITEM_NAME=$(op item list --format json | jq -r '.[] | select(.title | test("github"; "i")) | select(.title | test("token"; "i")) | .title' | head -n 1)

if [ -z "$ITEM_NAME" ]; then
    ITEM_NAME="GitHub Personal Access Token"
fi

echo "📦 Using 1Password item: $ITEM_NAME"
RAW_TOKEN=$(op read "op://Private/$ITEM_NAME/credential" 2>/dev/null || op read "op://Personal/$ITEM_NAME/credential" 2>/dev/null)

if [ -z "$RAW_TOKEN" ]; then
    echo "❌ Could not find token in Private or Personal vaults."
    exit 1
fi

export GITHUB_PERSONAL_ACCESS_TOKEN=$(echo "$RAW_TOKEN" | tr -d '\n')
export GITHUB_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"

echo "✅ Token Loaded and Sanitized."
echo "🚀 Restarting Gemini session is recommended, but you can try running /mcp-add github now."
