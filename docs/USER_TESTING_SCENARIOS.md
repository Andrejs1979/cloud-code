# User Testing Scenarios - Cloud Code Production

**Environment:** https://cloud-code.finhub.workers.dev

## Prerequisites

1. GitHub account with access to create issues
2. Test repository where you have admin permissions
3. GitHub App installed on the test repository

---

## Scenario 1: Interactive Chat Mode (No Repository)

**Purpose:** Test basic Claude Code integration without GitHub context

**Steps:**
1. Open terminal or use curl
2. Send a POST request to `/interactive/start`:
   ```bash
   curl -N -X POST https://cloud-code.finhub.workers.dev/interactive/start \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Explain what you are in one sentence."}'
   ```
3. Observe the SSE stream response

**Expected Results:**
- ✅ SSE connection established (`event: connected`)
- ✅ Status updates show "Starting general chat mode"
- ✅ `claude_delta` event contains Claude's response
- ✅ `event: complete` is sent at the end
- ✅ Response is coherent and answers the question

**Success Criteria:**
- Response time < 30 seconds
- No errors in stream
- Complete response received

---

## Scenario 2: Interactive Mode with Repository Context

**Purpose:** Test Claude Code with ability to read repository code

**Steps:**
1. Send request with repository context:
   ```bash
   curl -N -X POST https://cloud-code.finhub.workers.dev/interactive/start \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "List the main TypeScript files in this repo and briefly describe what each does",
       "repository": {
         "url": "https://github.com/Andrejs1979/cloud-code",
         "name": "Andrejs1979/cloud-code",
         "branch": "main"
       },
       "options": {
         "maxTurns": 1,
         "createPR": false
       }
     }'
   ```

**Expected Results:**
- ✅ Repository is cloned successfully (status message)
- ✅ Claude can read and analyze the codebase
- ✅ Response includes accurate file descriptions
- ✅ No PR is created (createPR: false)

**Success Criteria:**
- Correctly identifies main files (src/index.ts, src/handlers/, etc.)
- Descriptions match actual functionality
- No errors in cloning or analysis

---

## Scenario 3: Multi-Turn Interactive Session

**Purpose:** Test conversation context preservation

**Steps:**
1. Start a session with a request:
   ```bash
   curl -N -X POST https://cloud-code.finhub.workers.dev/interactive/start \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "I want to add a new feature. Remember that I want to add a cache layer.",
       "options": {"maxTurns": 3}
     }'
   ```
2. Note the sessionId from the complete event
3. Ask a follow-up question (simulate multi-turn - currently requires re-initiating)

**Expected Results:**
- ✅ Claude acknowledges the feature request
- ✅ Session ID is returned
- ✅ Response is context-aware

---

## Scenario 4: Health Check & Monitoring

**Purpose:** Verify system health endpoints

**Steps:**
1. Check health endpoint:
   ```bash
   curl https://cloud-code.finhub.workers.dev/health | jq '.'
   ```
2. Check metrics endpoint:
   ```bash
   curl https://cloud-code.finhub.workers.dev/metrics | jq '.'
   ```

**Expected Results:**
**Health Check:**
- ✅ `status: "healthy"`
- ✅ `environment: "production"`
- ✅ `components.claudeApiKey.configured: true`
- ✅ `components.rateLimit.configured: true`
- ✅ `components.durableObjects.status: "operational"`

**Metrics:**
- ✅ Request count tracked
- ✅ Response time metrics available
- ✅ No errors in recent requests

---

## Scenario 5: Rate Limiting

**Purpose:** Verify rate protection works

**Steps:**
1. Send 20 rapid requests to the health endpoint:
   ```bash
   for i in {1..25}; do
     curl -s https://cloud-code.finhub.workers.dev/health | jq '.status'
   done
   ```

**Expected Results:**
- ✅ First 20 requests succeed (status: 200)
- ✅ Requests 21+ get rate limited (status: 429)
- ✅ Response includes `Retry-After` header
- ✅ Error message: "Rate limit exceeded"

---

## Scenario 6: Error Handling

**Purpose:** Verify graceful error handling

**Steps:**
1. Send malformed request:
   ```bash
   curl -X POST https://cloud-code.finhub.workers.dev/interactive/start \
     -H "Content-Type: application/json" \
     -d '{"invalid": "missing required prompt field"}'
   ```

**Expected Results:**
- ✅ Returns 400 or 500 status
- ✅ Error message is descriptive
- ✅ No crash or hang

---

## Scenario 7: GitHub Status Check

**Purpose:** Check GitHub App configuration status

**Steps:**
```bash
curl https://cloud-code.finhub.workers.dev/gh-status | jq '.'
```

**Expected Results:**
- ✅ Returns configuration status
- ✅ Shows whether GitHub App is configured
- ✅ Shows repository count if configured

---

## Scenario 8: Debug Endpoints (Production - Should Be Blocked)

**Purpose:** Verify security - debug endpoints disabled in production

**Steps:**
```bash
curl https://cloud-code.finhub.workers.dev/debug-env
curl https://cloud-code.finhub.workers.dev/container
```

**Expected Results:**
- ✅ Returns 404 status
- ✅ Message: "Debug endpoints are disabled in production"

---

## Scenario 9: Large Prompt Handling

**Purpose:** Test system handles longer inputs

**Steps:**
```bash
curl -N -X POST https://cloud-code.finhub.workers.dev/interactive/start \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a detailed explanation of how Durable Objects work in Cloudflare Workers, including their persistence model, isolation guarantees, and typical use cases.",
    "options": {"maxTurns": 1}
  }'
```

**Expected Results:**
- ✅ Accepts long prompt without error
- ✅ Returns detailed response
- ✅ Response completes within 60 seconds

---

## Scenario 10: Concurrent Sessions

**Purpose:** Test system handles multiple simultaneous users

**Steps:**
1. Open 3 separate terminal windows
2. In each, run an interactive request simultaneously:
   ```bash
   curl -N -X POST https://cloud-code.finhub.workers.dev/interactive/start \
     -H "Content-Type: application/json" \
     -d '{"prompt": "What is 2 + 2? Just give the number."}'
   ```

**Expected Results:**
- ✅ All 3 requests complete successfully
- ✅ Each gets a unique sessionId
- ✅ No mixing of responses between sessions
- ✅ All complete within reasonable time

---

## Test Results Template

| Scenario | Status | Notes | Date |
|----------|--------|-------|------|
| 1. Interactive Chat (No Repo) | ⬜ Pass / ❌ Fail | | |
| 2. Interactive with Repository | ⬜ Pass / ❌ Fail | | |
| 3. Multi-Turn Session | ⬜ Pass / ❌ Fail | | |
| 4. Health Check | ⬜ Pass / ❌ Fail | | |
| 5. Rate Limiting | ⬜ Pass / ❌ Fail | | |
| 6. Error Handling | ⬜ Pass / ❌ Fail | | |
| 7. GitHub Status | ⬜ Pass / ❌ Fail | | |
| 8. Debug Endpoints Blocked | ⬜ Pass / ❌ Fail | | |
| 9. Large Prompt | ⬜ Pass / ❌ Fail | | |
| 10. Concurrent Sessions | ⬜ Pass / ❌ Fail | | |

---

## Performance Benchmarks

Record these metrics during testing:

| Metric | Target | Actual |
|--------|--------|--------|
| Interactive mode cold start | < 10s | |
| Interactive mode warm start | < 5s | |
| Health check response | < 100ms | |
| Time to first SSE event | < 2s | |
| Full response time (simple) | < 10s | |
| Full response time (complex) | < 30s | |
| Max concurrent sessions | ≥ 5 | |

---

## Bug Reporting Format

If a test fails, document:

```
**Scenario:** [Scenario number and name]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected:** [What should happen]

**Actual:** [What actually happened]

**Error Message:** [If any]

**Environment:**
- URL: [production/staging]
- Time: [Timestamp]
- Session ID: [If applicable]

**Logs:**
[Paste relevant error logs or curl output]
```
