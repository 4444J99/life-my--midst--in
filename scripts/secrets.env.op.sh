# Hydrates secrets from 1Password
# Usage: source secrets.env.op.sh

if ! command -v op >/dev/null; then
    echo "⚠️  'op' command not found." >&2
    return 1
fi

# Check sign-in status
if ! op whoami >/dev/null 2>&1; then
    # If running inside direnv, we can't be interactive
    if [ -n "$DIRENV_DIR" ]; then
        echo "⚠️  1Password is locked. Direnv cannot unlock it interactively." >&2
        echo "👉 Run 'eval $(op signin)' manually, then 'direnv reload'." >&2
        return 1
    else
        echo "🔒 1Password is locked. Attempting to sign in..." >&2
        eval $(op signin)
    fi
fi

# Dynamic Search Logic (adapted from scripts/fix-mcp-github.sh)
ITEM_NAME=""
if command -v jq >/dev/null; then
    # Search for item with "github" and "token" in title
    ITEM_NAME=$(op item list --format json | jq -r '.[] | select(.title | test("github"; "i")) | select(.title | test("token"; "i")) | .title' | head -n 1)
fi

# Fallback
if [ -z "$ITEM_NAME" ]; then
    ITEM_NAME="GitHub Personal Access Token"
fi

# Read Token
# Try Private, then Personal, then assume it might be in Employee or just check the item name directly if generic
token=$(op read "op://Private/$ITEM_NAME/credential" 2>/dev/null || \
        op read "op://Personal/$ITEM_NAME/credential" 2>/dev/null || \
        op read "op://Employee/$ITEM_NAME/credential" 2>/dev/null)

if [ -n "$token" ]; then
    # Sanitize (Trim Newlines)
    clean_token=$(echo "$token" | tr -d '\n')
    export GITHUB_PERSONAL_ACCESS_TOKEN="$clean_token"
    export GITHUB_TOKEN="$clean_token"
    echo "✅ Loaded GITHUB_PERSONAL_ACCESS_TOKEN from 1Password item: '$ITEM_NAME'"
else
    echo "❌ Failed to load token. Could not find item '$ITEM_NAME' in standard vaults." >&2
    return 1
fi