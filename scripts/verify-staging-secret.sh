#!/bin/bash

# Script to verify and fix staging secrets

echo "==================================="
echo "Staging Secret Verification & Fix"
echo "==================================="
echo ""

# Check current status
echo "1. Checking current secret status..."
curl -s https://cloud-code-staging.finhub.workers.dev/debug-env | jq '{hasAnthropicKey, anthropicKeyTruthy, anthropicKeyPrefix}'

echo ""
echo "2. To fix the empty secret, run this command and paste your API key when prompted:"
echo ""
echo "   npx wrangler secret put ANTHROPIC_API_KEY --env staging"
echo ""
echo "   Then paste your API key (sk-ant-... or gsk-...) and press Enter"
echo ""

# List secrets
echo "3. Current secrets in staging:"
npx wrangler secret list --env staging

echo ""
echo "4. After setting the secret, verify with:"
echo "   curl https://cloud-code-staging.finhub.workers.dev/health | jq .components.claudeApiKey"
echo ""
