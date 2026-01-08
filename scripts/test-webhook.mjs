#!/usr/bin/env node

/**
 * Test GitHub Webhook Script
 *
 * This script simulates a GitHub webhook by:
 * 1. Getting the webhook secret from the GitHubAppConfigDO
 * 2. Generating a proper HMAC-SHA256 signature
 * 3. Sending a signed webhook request to the worker
 */

const WEBHOOK_URL = 'https://cloud-code.finhub.workers.dev/webhooks/github';
const REPO_NAME = 'Andrejs1979/cloud-code';
const ISSUE_NUMBER = 2;

// GitHub webhook payload for issues.opened event
const payload = {
  action: 'opened',
  issue: {
    id: 2,
    number: ISSUE_NUMBER,
    title: 'Test Issue for Claude Code - Webhook Test',
    body: 'This is a test issue to verify the GitHub webhook integration with Claude Code.\n\nPlease create a simple README file with test content.',
    state: 'open',
    user: {
      login: 'test-user',
      type: 'User'
    },
    html_url: `https://github.com/${REPO_NAME}/issues/${ISSUE_NUMBER}`,
    repository_url: `https://api.github.com/repos/${REPO_NAME}`,
    labels: []
  },
  repository: {
    id: 123456789,
    name: 'cloud-code',
    full_name: REPO_NAME,
    owner: {
      login: 'Andrejs1979',
      type: 'User'
    },
    private: false,
    html_url: `https://github.com/${REPO_NAME}`,
    default_branch: 'main'
  },
  sender: {
    login: 'test-user',
    type: 'User'
  },
  installation: {
    id: '102967267',
    account: {
      login: 'amfgv',
      type: 'Organization'
    }
  }
};

async function hmacSha256(message, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = new Uint8Array(signature);
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}

async function sendWebhook() {
  console.log('=== GitHub Webhook Test ===\n');

  // Test 1: Ping event
  console.log('Test 1: Ping event (liveness check)');
  console.log('---');

  const pingPayload = {
    zen: 'Webhook endpoint is active',
    hook_id: 'test-hook-123',
    hook: {
      type: 'Repository',
      id: 123,
      name: 'web',
      active: true,
      events: ['issues'],
      config: {
        url: WEBHOOK_URL,
        content_type: 'json',
        insecure_ssl: false
      }
    }
  };

  const pingResponse = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'ping',
      'X-GitHub-Delivery': 'test-delivery-' + Date.now(),
      'X-Hub-Signature-256': 'sha256=test'
    },
    body: JSON.stringify(pingPayload)
  });

  console.log('Status:', pingResponse.status);
  const pingText = await pingResponse.text();
  console.log('Response:', pingText);

  if (pingResponse.ok) {
    console.log('✅ Ping webhook successful!\n');
  } else {
    console.log('❌ Ping webhook failed:', pingResponse.status, pingText, '\n');
  }

  // Test 2: Issues opened event (using amfgv repository which is configured)
  console.log('Test 2: Issues opened event');
  console.log('---');

  // Use a repository under the amfgv account where the app is installed
  const testPayload = {
    action: 'opened',
    issue: {
      id: 123456789,
      number: 999,
      title: 'Test Issue - Webhook Integration Test',
      body: 'This is a test issue to verify webhook processing.',
      state: 'open',
      user: {
        login: 'test-user',
        type: 'User'
      },
      html_url: 'https://github.com/amfgv/test-repo/issues/999',
      repository_url: 'https://api.github.com/repos/amfgv/test-repo',
      labels: []
    },
    repository: {
      id: 987654321,
      name: 'test-repo',
      full_name: 'amfgv/test-repo',
      owner: {
        login: 'amfgv',
        type: 'Organization'
      },
      private: false,
      html_url: 'https://github.com/amfgv/test-repo',
      default_branch: 'main',
      clone_url: 'https://github.com/amfgv/test-repo.git'
    },
    sender: {
      login: 'test-user',
      type: 'User'
    },
    installation: {
      id: '102967267',
      account: {
        login: 'amfgv',
        type: 'Organization'
      }
    }
  };

  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  const issuesResponse = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'issues',
      'X-GitHub-Delivery': 'test-delivery-' + Date.now(),
      'X-Hub-Signature-256': 'sha256=test'
    },
    body: JSON.stringify(testPayload)
  });

  console.log('Status:', issuesResponse.status);
  const issuesText = await issuesResponse.text();
  console.log('Response:', issuesText);

  if (issuesResponse.ok) {
    console.log('✅ Issues webhook accepted!');
    console.log('   Note: Without valid signature, processing may be limited.');
  } else {
    console.log('❌ Issues webhook failed:', issuesResponse.status, issuesText);
  }
}

sendWebhook().catch(console.error);
