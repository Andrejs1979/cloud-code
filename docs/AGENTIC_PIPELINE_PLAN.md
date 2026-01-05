# Agentic Coding Pipeline - Technical Plan

**Status:** Planning Phase
**Created:** 2025-01-04
**Technology:** Cloudflare Workers + Sandbox SDK + Claude Code

## Executive Summary

This document outlines a comprehensive agentic coding pipeline built on Cloudflare's Sandbox SDK. The system will autonomously handle GitHub issues, pull request reviews, and automated testing by leveraging Claude Code's AI capabilities within isolated sandbox environments.

### Vision

Build an autonomous software engineering assistant that can:
1. **Resolve GitHub Issues** - Analyze, implement fixes, test, and create PRs
2. **Review Pull Requests** - Analyze code changes, suggest improvements, find bugs
3. **Run Test Pipelines** - Execute tests, generate coverage reports, validate quality

### Key Differentiator from Current Implementation

| Aspect | Current (`claude-code-containers`) | Proposed (Sandbox SDK) |
|--------|-----------------------------------|------------------------|
| API | `@cloudflare/containers` (beta, v0.0.8) | `@cloudflare/sandbox` (stable) |
| Git Operations | Manual spawn of git processes | Built-in `sandbox.gitCheckout()` |
| Streaming | Manual process handling | `sandbox.execStream()` + SSE parsing |
| File Operations | Via exec commands | Native `writeFile()`/`readFile()` |
| Preview URLs | Custom implementation | Built-in `proxyToSandbox()` |
| Sandbox Lifecycle | Manual management | Automatic with ID-based reuse |
| Session Management | None | Sessions API for caching dependencies |

---

## Architecture Overview

### System Components

```
GitHub Events (Issues, PRs, Pushes, Comments)
         │
         ▼
Cloudflare Worker
├── Request Router & Handler
├── Credential Management (DO)
└── Task Orchestration Layer
         │
         ▼
Sandbox SDK (Isolated Environments)
├── Issue Processing Sandboxes
├── PR Review Sandboxes
├── Test Pipeline Sandboxes
└── Cached Session Sandboxes
         │
         ▼
Claude Code SDK + GitHub API
```

### Data Flow: Issue Resolution Pipeline

```
1. GitHub Issue Event (webhook)
   │
   ▼
2. Signature Verification → Parse Payload
   │
   ▼
3. Task Created in Queue (Durable Object)
   │
   ▼
4. Get/Create Sandbox (ID: issue-{number})
   │
   ▼
5. Clone Repository (sandbox.gitCheckout)
   │
   ▼
6. Detect Project Type (package.json, requirements.txt, go.mod)
   │
   ▼
7. Install Dependencies (cached session if available)
   │
   ▼
8. Run Initial Tests (establish baseline)
   │
   ▼
9. Claude Code Analysis
   │
   ▼
10. Generate Solution (Claude creates/modifies files)
    │
    ▼
11. Run Tests Again (validate fix)
    │
    ▼
12. If Tests Fail → Loop back to step 9 with feedback
    │
    ▼
13. Create Git Branch → Commit → Push
    │
    ▼
14. Create Pull Request with summary
```

---

## API Design

### Core Interfaces

```typescript
// ============================================================================
// Environment Configuration
// ============================================================================

interface Env {
  // Sandbox binding - primary execution environment
  Sandbox: DurableObjectNamespace<Sandbox>;

  // Credential storage
  GITHUB_APP_CONFIG: DurableObjectNamespace<GitHubAppConfigDO>;

  // Task queue for async processing
  TASK_QUEUE: DurableObjectNamespace<TaskQueueDO>;

  // Session cache for dependency caching
  SESSION_CACHE: DurableObjectNamespace<SessionCacheDO>;

  // Optional: R2 for artifact storage
  ARTIFACTS?: R2Bucket;

  // Secrets (set via wrangler secret put)
  ANTHROPIC_API_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
}

// ============================================================================
// Task Types
// ============================================================================

type TaskType = 'issue-resolution' | 'pr-review' | 'test-pipeline' | 'custom';

interface Task {
  id: string;
  type: TaskType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  data: IssueResolutionTask | PRReviewTask | TestPipelineTask;
  result?: TaskResult;
}

interface IssueResolutionTask {
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  repository: {
    owner: string;
    name: string;
    cloneUrl: string;
    defaultBranch: string;
  };
  author: string;
  labels: string[];
}

interface PRReviewTask {
  prNumber: number;
  prTitle: string;
  prBody: string;
  repository: {
    owner: string;
    name: string;
    cloneUrl: string;
  };
  baseSha: string;
  headSha: string;
  changedFiles: PRFile[];
}

interface TestPipelineTask {
  repository: {
    owner: string;
    name: string;
    cloneUrl: string;
  };
  branch: string;
  commitSha: string;
  triggeredBy: 'push' | 'pr' | 'manual';
}

interface TaskResult {
  success: boolean;
  message: string;
  output?: any;
  error?: string;
  artifacts?: string[];
  metrics?: TaskMetrics;
}

// ============================================================================
// GitHub Integration
// ============================================================================

interface PRFile {
  sha: string;
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  patch: string;
}
```

### Worker API Endpoints

```
POST /webhook/github
  - GitHub webhook receiver
  - Handles: issues, pull_request, push, installation events

GET  /status
  - System status check
  - Returns: active tasks, sandbox count, credential status

GET  /task/{taskId}
  - Get task status and results

POST /api/submit
  - Manually submit a task (alternative to webhooks)

GET  /sandbox/list
  - List active sandboxes

POST /sandbox/{id}/destroy
  - Manually destroy a sandbox

POST /session/clear
  - Clear all cached sessions
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goals:** Set up project infrastructure and basic Sandbox SDK integration.

**Tasks:**
1. Create new project using `cloudflare/sandbox-sdk/examples/minimal` template
2. Configure `wrangler.jsonc` with Sandbox bindings
3. Implement credential storage DO (GitHub App config, Claude API key)
4. Create basic webhook receiver with signature verification
5. Implement health check endpoint

**Deliverables:**
- Deployable Worker with Sandbox SDK
- Working GitHub webhook receiver
- Secure credential storage

**Acceptance Criteria:**
- Can receive and verify GitHub webhooks
- Can create and execute commands in a sandbox
- Credentials are encrypted at rest

---

### Phase 2: Issue Resolution Pipeline (Week 2)

**Goals:** Build end-to-end automated issue resolution.

**Tasks:**
1. Implement task queue DO for async processing
2. Create sandbox factory with automatic cleanup
3. Implement `processIssue()` flow:
   - Clone repository with `sandbox.gitCheckout()`
   - Detect project type
   - Run baseline tests
   - Invoke Claude Code with issue context
   - Detect and commit changes
   - Run tests again
   - Create PR on success
4. Add progress comments to GitHub issue
5. Implement error handling and retry logic

**Claude Prompt Template:**
```
You are working on GitHub issue #{issueNumber}: "{title}"

{repoContext}

Issue Description:
{body}

Labels: {labels}
Author: {author}

Please:
1. Explore the codebase to understand the structure
2. Analyze the issue requirements
3. Implement a solution that addresses the issue
4. Write appropriate tests
5. Run tests to verify your solution

If you make changes, create a file .claude-pr-summary.md with:
- First line: PR title (concise)
- Rest: Detailed description of changes

Work step by step and explain your approach.
```

**Deliverables:**
- Working issue resolution pipeline
- Automatic PR creation
- Progress updates on issues

**Acceptance Criteria:**
- Can clone and analyze a repository
- Claude can make file changes
- Changes are committed and pushed
- PR is created with proper description
- Tests pass before PR creation

---

### Phase 3: PR Review Bot (Week 3)

**Goals:** Add automated pull request code review.

**Tasks:**
1. Implement `reviewPR()` flow:
   - Fetch changed files from GitHub API
   - Clone repository at PR head
   - Read file contents and diffs
   - Invoke Claude for analysis
   - Generate review comments
   - Post review to PR
2. Add support for line-specific comments
3. Implement review categories (bugs, security, style, performance)
4. Add diff summarization for large PRs

**Claude Prompt Template:**
```
Review this pull request:

Title: {prTitle}
Description: {prBody}

Changed Files:
{files}

Please provide a code review focusing on:
1. **Bugs** - Potential errors or incorrect logic
2. **Security** - Vulnerabilities or unsafe practices
3. **Best Practices** - Language/framework conventions
4. **Performance** - Potential optimizations
5. **Style** - Code readability and consistency

For each issue, provide:
- File path and line number
- Severity (error/warning/info/suggestion)
- Brief explanation
- Suggested fix (if applicable)

Format your response as a structured review.
```

**Deliverables:**
- Working PR review bot
- Structured review comments
- Support for incremental reviews

---

### Phase 4: Test Pipeline (Week 3-4)

**Goals:** Build automated testing pipeline with coverage.

**Tasks:**
1. Implement `runTestPipeline()` flow:
   - Clone repository
   - Detect project type and test framework
   - Install dependencies (with session caching)
   - Run tests with streaming output
   - Parse test results
   - Generate coverage report if possible
2. Add support for multiple test frameworks:
   - Jest/Vitest (JavaScript/TypeScript)
   - pytest (Python)
   - go test (Go)
   - cargo test (Rust)
3. Implement result caching
4. Add status checks to GitHub

**Test Command Mapping:**
```typescript
const TEST_COMMANDS = {
  'javascript': {
    install: 'npm ci',
    test: 'npm test -- --coverage --json',
    framework: ['jest', 'vitest', 'mocha']
  },
  'python': {
    install: 'pip install -e .',
    test: 'pytest --cov=. --cov-report=json --junitxml=junit.xml',
    framework: ['pytest', 'unittest']
  },
  'go': {
    install: 'go mod download',
    test: 'go test -coverprofile=coverage.out -json ./...',
    framework: ['testing']
  },
  'rust': {
    install: 'cargo fetch',
    test: 'cargo test',
    framework: ['cargo']
  }
};
```

**Deliverables:**
- Multi-language test pipeline
- Coverage reports
- GitHub status integration

---

### Phase 5: Session Caching & Optimization (Week 4)

**Goals:** Add dependency caching and performance optimizations.

**Tasks:**
1. Implement Session Cache DO:
   - Store sandboxes with installed dependencies
   - Reuse sessions across tasks
   - Implement TTL-based expiration
2. Add streaming output for long-running commands
3. Implement parallel task processing
4. Add metrics and monitoring

**Session Cache Strategy:**
```typescript
// Session ID format: {owner}-{repo}-{branch}-{project-hash}
const sessionId = `${owner}-${repo}-${branch}-${dependencyHash}`;

// Check for existing session
const cached = await sessionCache.get(sessionId);
if (cached && !isExpired(cached)) {
  return { sandbox: getSandbox(env.Sandbox, sessionId), cached: true };
}

// Create new session
const sandbox = getSandbox(env.Sandbox, sessionId);
await installDependencies(sandbox, projectType);
await sessionCache.set(sessionId, sandbox.metadata);
```

**Deliverables:**
- Working session cache
- Reduced cold-start times
- Performance metrics

---

### Phase 6: Advanced Features (Week 5+)

**Goals:** Add advanced capabilities for production use.

**Tasks:**
1. **Multi-file editing** - Handle large changes across multiple files
2. **Iterative refinement** - Loop with Claude until tests pass
3. **Conflict resolution** - Handle merge conflicts automatically
4. **Rollback** - Revert changes if tests fail after deployment
5. **Custom prompts** - Allow repository-specific Claude instructions
6. **Artifact storage** - Store test reports and coverage in R2
7. **Web dashboard** - Real-time task monitoring
8. **Slack integration** - Notifications for task completion

---

## Security Considerations

### Credential Management

All credentials stored in Durable Objects must be encrypted using AES-256-GCM:

```typescript
async function encryptSecret(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}
```

### GitHub Webhook Security

Signature verification using HMAC-SHA256:

```typescript
async function verifyWebhook(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const [algo, hash] = signature.split('=');
  if (algo !== 'sha256') return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expected = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body)
  );

  const expectedHash = Array.from(new Uint8Array(expected))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hash === expectedHash;
}
```

### Rate Limiting

```typescript
interface RateLimit {
  repository: string;
  windowStart: number;
  requestCount: number;
}

const LIMITS = {
  perHour: 10,        // Max tasks per hour per repo
  concurrent: 2,      // Max concurrent tasks per repo
  globalPerMinute: 100 // Global rate limit
};
```

---

## Migration Strategy from Current Implementation

### Option A: Parallel Migration (Recommended)

1. Keep existing `claude-code-containers` running
2. Deploy new Sandbox SDK version as separate Worker
3. Route 10% of traffic to new system
4. Monitor and compare results
5. Gradually increase traffic share
6. Full cutover after 2 weeks

### Option B: Code Migration

1. Create new branch in existing repo
2. Replace `@cloudflare/containers` with `@cloudflare/sandbox`
3. Update container communication patterns
4. Migrate DO storage to new format
5. Deploy and test
6. Cut over

### Option C: Hybrid Approach

1. Keep current system for production
2. Build new capabilities on Sandbox SDK
3. Use feature flags to route specific task types
4. Migrate incrementally by feature

**Recommended:** Option A (Parallel Migration) for lowest risk.

---

## Monitoring & Observability

### Metrics to Track

```typescript
interface SystemMetrics {
  // Task metrics
  totalTasks: number;
  tasksByType: Record<TaskType, number>;
  tasksByStatus: Record<string, number>;
  averageTaskDuration: number;

  // Sandbox metrics
  activeSandboxes: number;
  totalSandboxesCreated: number;
  averageSandboxLifetime: number;

  // Session metrics
  cacheHitRate: number;
  averageSessionAge: number;

  // Error metrics
  errorRate: number;
  errorsByType: Record<string, number>;

  // GitHub metrics
  apiCallCount: number;
  rateLimitHits: number;
  averageApiResponseTime: number;
}
```

---

## Success Criteria

### Phase 1 (Foundation)
- Project scaffolding complete
- Can receive and verify webhooks
- Sandbox executes commands successfully

### Phase 2 (Issue Resolution)
- Can resolve at least 80% of simple bug reports
- Average resolution time < 10 minutes
- Created PRs pass all tests

### Phase 3 (PR Review)
- Reviews posted within 2 minutes of PR opening
- False positive rate < 10%
- Actionable suggestions in > 90% of comments

### Phase 4 (Test Pipeline)
- Supports JS, Python, Go, Rust
- Test results parsed correctly
- Coverage reports generated

### Phase 5 (Optimization)
- Cache hit rate > 50%
- Cold start time < 30 seconds
- Warm start time < 5 seconds

---

## Appendix: Sandbox SDK Key Methods

```typescript
import { getSandbox, parseSSEStream, type Sandbox } from '@cloudflare/sandbox';

// Get or create sandbox by ID (reuses existing sandbox for same ID)
const sandbox = getSandbox(env.Sandbox, 'my-sandbox-id');

// Execute command and get result
const result = await sandbox.exec('ls -la');
// Returns: { stdout, stderr, exitCode, success }

// Stream output for long-running commands
const stream = await sandbox.execStream('npm test');
for await (const event of parseSSEStream(stream)) {
  if (event.type === 'stdout') console.log(event.data);
}

// Git operations - built-in
await sandbox.gitCheckout('https://github.com/owner/repo', {
  branch: 'main',
  depth: 1,
  targetDir: 'repo'
});

// File operations
await sandbox.writeFile('/workspace/file.txt', 'content');
const file = await sandbox.readFile('/workspace/file.txt');
// Returns: { content, size }

// Cleanup
await sandbox.destroy();
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-04
