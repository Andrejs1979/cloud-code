/**
 * Interactive Mode Test Client
 *
 * Demonstrates how to use the Claude Code interactive mode API.
 *
 * Usage:
 *   node test-client.js --prompt "Analyze this codebase" --repo "owner/repo"
 *
 * Or use the HTML client in a browser.
 */

import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';

// ============================================================================
// Configuration
// ============================================================================

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';

// ============================================================================
// Interactive Session Client
// ============================================================================

class InteractiveSessionClient {
  private baseUrl: string;
  private sessionId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Start an interactive session
   */
  async startSession(prompt: string, repository?: { url: string; name: string; branch?: string }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/interactive/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        repository,
        options: {
          maxTurns: 10,
          permissionMode: 'bypassPermissions',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start session: ${error}`);
    }

    // The response is an SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    console.log('\n🤖 Claude Code Interactive Session Started\n');
    console.log('═'.repeat(60));

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              this.handleSSEEvent(data);
            } catch (e) {
              console.log(line.slice(6));
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Session completed\n');
  }

  /**
   * Handle Server-Sent Events from the stream
   */
  private handleSSEEvent(event: any): void {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();

    switch (event.type) {
      case 'connected':
        console.log(`[${timestamp}] ✓ Connected to session`);
        break;

      case 'status':
        console.log(`[${timestamp}] ℹ️  ${event.message}`);
        break;

      case 'claude_start':
        console.log(`\n[${timestamp}] 🔄 Turn ${event.turn}: ${event.prompt.substring(0, 60)}...\n`);
        break;

      case 'claude_delta':
        // Stream Claude's response in real-time
        process.stdout.write(event.content);
        break;

      case 'claude_end':
        console.log(`\n[${timestamp}] ✓ Turn ${event.turn} completed`);
        break;

      case 'input_request':
        console.log(`\n[${timestamp}] ❓ Claude asks: ${event.prompt}`);
        break;

      case 'file_change':
        console.log(`\n[${timestamp}] 📝 ${event.message}`);
        break;

      case 'complete':
        console.log(`\n[${timestamp}] ✅ Complete (${event.turns} turns)`);
        break;

      case 'error':
        console.error(`\n[${timestamp}] ❌ Error: ${event.message}`);
        break;

      default:
        console.log(`[${timestamp}] ${event.type}:`, event);
    }
  }

  /**
   * Send a user message to the active session (for future implementation)
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    const response = await fetch(`${this.baseUrl}/interactive/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${await response.text()}`);
    }
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const rl = createInterface({ input, output });

  // Parse command line arguments
  const promptIndex = args.indexOf('--prompt');
  const repoIndex = args.indexOf('--repo');
  const branchIndex = args.indexOf('--branch');

  let prompt = '';
  let repo: string | undefined;
  let branch: string | undefined;

  if (promptIndex >= 0 && args[promptIndex + 1]) {
    prompt = args[promptIndex + 1];
  }

  if (repoIndex >= 0 && args[repoIndex + 1]) {
    repo = args[repoIndex + 1];
  }

  if (branchIndex >= 0 && args[branchIndex + 1]) {
    branch = args[branchIndex + 1];
  }

  // Interactive prompt if not provided
  if (!prompt) {
    console.log('🤖 Claude Code Interactive Mode Test Client\n');
    prompt = await question('Enter your prompt for Claude: ', rl);
  }

  if (!repo) {
    const shouldUseRepo = await question('Include a repository? (y/N): ', rl);
    if (shouldUseRepo.toLowerCase() === 'y') {
      repo = await question('Repository (owner/repo): ', rl);
      const branchAnswer = await question('Branch (default: main): ', rl);
      if (branchAnswer) branch = branchAnswer;
    }
  }

  rl.close();

  // Build repository config
  let repository;
  if (repo) {
    const [owner, name] = repo.split('/');
    repository = {
      url: `https://github.com/${repo}`,
      name: `${owner}/${name}`,
      branch: branch || 'main',
    };
  }

  // Start the session
  const client = new InteractiveSessionClient(WORKER_URL);

  try {
    await client.startSession(prompt, repository);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function question(query: string, rl: ReturnType<typeof createInterface>): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { InteractiveSessionClient };
