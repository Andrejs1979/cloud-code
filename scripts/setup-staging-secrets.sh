#!/bin/bash

# Staging Secrets Setup Script
# Run this to configure staging environment secrets

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           STAGING SECRETS SETUP                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler not found. Install with: npm install -g wrangler"
    exit 1
fi

echo "Setting up secrets for staging environment..."
echo ""

# ANTHROPIC_API_KEY
echo "1️⃣  Setting ANTHROPIC_API_KEY for staging..."
echo "   Enter the SAME value as production (sk-ant-... or gsk-...)"
npx wrangler secret put ANTHROPIC_API_KEY --env staging
echo ""

# ENCRYPTION_KEY
echo "2️⃣  Setting ENCRYPTION_KEY for staging..."
echo "   Enter a 32-byte hex string (or same as production)"
npx wrangler secret put ENCRYPTION_KEY --env staging
echo ""

# Verify
echo "3️⃣  Verifying staging configuration..."
sleep 2
HEALTH=$(curl -s https://cloud-code-staging.finhub.workers.dev/health)
CLAUDE_CONFIGURED=$(echo "$HEALTH" | jq -r '.components.claudeApiKey.configured // false')
RATE_LIMIT_CONFIGURED=$(echo "$HEALTH" | jq -r '.components.rateLimit.configured // false')

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                    STATUS"
echo "═══════════════════════════════════════════════════════════════"

if [ "$CLAUDE_CONFIGURED" = "true" ]; then
    echo "✅ Claude API Key:     configured"
else
    echo "❌ Claude API Key:     NOT configured"
fi

if [ "$RATE_LIMIT_CONFIGURED" = "true" ]; then
    echo "✅ Rate Limiting:      configured"
else
    echo "❌ Rate Limiting:      NOT configured"
fi

echo ""
echo "Staging URL: https://cloud-code-staging.finhub.workers.dev"
echo ""

if [ "$CLAUDE_CONFIGURED" = "true" ]; then
    echo "🎉 Staging is ready for testing!"
else
    echo "⚠️  Some secrets are missing. Please run the setup again."
fi
