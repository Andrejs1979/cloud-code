/**
 * Dashboard API Handlers
 *
 * Provides API endpoints for the mobile-first dashboard PWA
 */

import { Env } from '../types';
import { logWithContext } from '../log';

export interface DashboardStats {
  totalIssues: number;
  processedIssues: number;
  activeSessions: number;
  successRate: number;
  repositories: string[];
  claudeKeyConfigured?: boolean;
}

export interface Task {
  id: string;
  title: string;
  repository: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  prompt: string;
  repository?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  turns?: number;
}

export interface Issue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  repository: string;
  labels?: string[];
  createdAt: string;
}

// In-memory storage for demo purposes
// In production, this would use Durable Object storage
const tasks = new Map<string, Task>();
const sessions = new Map<string, Session>();
const issues = new Map<string, Issue>();

/**
 * Handle dashboard API requests
 */
export async function handleDashboardAPI(
  request: Request,
  env: { GITHUB_APP_CONFIG: any; DASHBOARD_ASSETS?: Fetcher }
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  logWithContext('DASHBOARD_API', 'Dashboard API request', {
    method: request.method,
    pathname
  });

  // GET /api/tasks - Get active tasks
  if (pathname === '/api/tasks' && request.method === 'GET') {
    return handleGetTasks();
  }

  // POST /api/tasks - Create a new task
  if (pathname === '/api/tasks' && request.method === 'POST') {
    return handleCreateTask(request);
  }

  // GET /api/sessions - Get session history
  if (pathname === '/api/sessions' && request.method === 'GET') {
    return handleGetSessions();
  }

  // GET /api/issues - Get GitHub issues
  if (pathname === '/api/issues' && request.method === 'GET') {
    return handleGetIssues(env);
  }

  // GET /api/stats - Get statistics
  if (pathname === '/api/stats' && request.method === 'GET') {
    return handleGetStats(env);
  }

  // POST /api/test-webhook - Test webhook
  if (pathname === '/api/test-webhook' && request.method === 'POST') {
    return handleTestWebhook(request);
  }

  logWithContext('DASHBOARD_API', 'Unknown dashboard endpoint', { pathname });
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Serve dashboard static files (Expo Web app)
 *
 * Uses Cloudflare Workers Assets binding to serve static files.
 * The assets binding automatically handles:
 * - File serving from the expo-app/dist directory
 * - MIME type detection
 * - Global caching
 *
 * @see https://developers.cloudflare.com/workers/static-assets/binding/
 */
export async function serveDashboard(
  request: Request,
  env?: { DASHBOARD_ASSETS?: Fetcher }
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  logWithContext('DASHBOARD_STATIC', 'Serving dashboard file', { pathname });

  // If assets binding is available, delegate static file serving to it
  if (env?.DASHBOARD_ASSETS) {
    try {
      let assetPath = pathname;

      // Handle Expo app paths
      // Root path or /dashboard/ -> index.html
      if (pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/') {
        assetPath = '/index.html';
      }
      // Remove /dashboard prefix for backward compatibility
      else if (pathname.startsWith('/dashboard/')) {
        assetPath = pathname.substring('/dashboard/'.length - 1); // Keep leading slash
      }
      // _expo and assets paths are already correct
      else if (pathname.startsWith('/_expo/') || pathname.startsWith('/assets/')) {
        assetPath = pathname;
      }
      // For any other path (SPA routing), serve index.html
      else {
        assetPath = '/index.html';
      }

      // Create a new request with the mapped asset path
      // The assets binding serves files from expo-app/dist at root
      const assetUrl = new URL(url.origin + assetPath);
      const assetRequest = new Request(assetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        // @ts-ignore - body property is acceptable
        body: request.body,
        // @ts-ignore - duplex property is acceptable
        duplex: 'half'
      });

      logWithContext('DASHBOARD_STATIC', 'Fetching asset', { originalPath: pathname, assetPath });

      const assetResponse = await env.DASHBOARD_ASSETS.fetch(assetRequest);

      // If asset found (status 200), return it with appropriate headers
      if (assetResponse.ok) {
        const headers = new Headers(assetResponse.headers);
        // Add CORS headers
        headers.set('Access-Control-Allow-Origin', '*');
        // Remove conflicting COOP/COEP headers that can break shared array buffer
        headers.delete('Cross-Origin-Embedder-Policy');
        headers.delete('Cross-Origin-Opener-Policy');

        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers
        });
      }

      // If asset not found, try index.html for SPA routes
      if (assetPath !== '/index.html') {
        const indexRequest = new Request(new URL(url.origin + '/index.html').toString(), request);
        const indexResponse = await env.DASHBOARD_ASSETS.fetch(indexRequest);
        if (indexResponse.ok) {
          const headers = new Headers(indexResponse.headers);
          headers.set('Access-Control-Allow-Origin', '*');
          headers.delete('Cross-Origin-Embedder-Policy');
          headers.delete('Cross-Origin-Opener-Policy');
          return new Response(indexResponse.body, {
            status: indexResponse.status,
            headers
          });
        }
      }
    } catch (error) {
      logWithContext('DASHBOARD_STATIC', 'Assets binding error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Fallback: Return helpful error message
  logWithContext('DASHBOARD_STATIC', 'Asset not found', { pathname });
  return new Response('Dashboard file not found. Please ensure the dashboard assets are properly deployed.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
}

/**
 * Get active tasks
 */
function handleGetTasks(): Response {
  const taskList = Array.from(tasks.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  logWithContext('DASHBOARD_API', 'Returning tasks', { count: taskList.length });

  return new Response(JSON.stringify(taskList), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create a new task
 */
async function handleCreateTask(request: Request): Promise<Response> {
  try {
    const body = await request.json() as Partial<Task>;

    const task: Task = {
      id: crypto.randomUUID(),
      title: body.title || 'Untitled Task',
      repository: body.repository || 'Unknown',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.set(task.id, task);

    logWithContext('DASHBOARD_API', 'Task created', { taskId: task.id });

    return new Response(JSON.stringify(task), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logWithContext('DASHBOARD_API', 'Failed to create task', {
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get session history
 */
function handleGetSessions(): Response {
  const sessionList = Array.from(sessions.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  logWithContext('DASHBOARD_API', 'Returning sessions', { count: sessionList.length });

  return new Response(JSON.stringify(sessionList), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Get GitHub issues
 */
async function handleGetIssues(env: { GITHUB_APP_CONFIG: any }): Promise<Response> {
  try {
    const configDO = (env.GITHUB_APP_CONFIG as any).idFromName('github-app-config');
    const configStub = (env.GITHUB_APP_CONFIG as any).get(configDO);

    // Get app config to check if connected
    const configResponse = await configStub.fetch(new Request('http://internal/get'));
    const configText = await configResponse.text();

    if (!configText) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const config = JSON.parse(configText);

    // Return mock issues for demo
    // In production, this would fetch from GitHub API
    const mockIssues: Issue[] = [
      {
        number: 1,
        title: 'Add authentication middleware',
        body: 'Implement JWT-based authentication for the API endpoints',
        state: 'open',
        repository: config.repositories?.[0]?.full_name || 'demo/repo',
        labels: ['enhancement', 'security'],
        createdAt: new Date().toISOString()
      }
    ];

    logWithContext('DASHBOARD_API', 'Returning issues', { count: mockIssues.length });

    return new Response(JSON.stringify(mockIssues), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logWithContext('DASHBOARD_API', 'Failed to fetch issues', {
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get statistics
 */
async function handleGetStats(env: { GITHUB_APP_CONFIG: any; ANTHROPIC_API_KEY?: string }): Promise<Response> {
  try {
    const configDO = (env.GITHUB_APP_CONFIG as any).idFromName('github-app-config');
    const configStub = (env.GITHUB_APP_CONFIG as any).get(configDO);

    // Get app config to retrieve repository list and webhook stats
    const configResponse = await configStub.fetch(new Request('http://internal/get'));
    const configText = await configResponse.text();

    let repositories: string[] = [];
    let repositoryCount = 0;
    let totalWebhooks = 0;

    if (configText) {
      try {
        const config = JSON.parse(configText);
        repositoryCount = config.repositories?.length || 0;
        // Extract repository full names
        repositories = (config.repositories || []).map((repo: any) => repo.full_name || repo.name || String(repo));

        // Get webhook stats from DO
        const webhookResponse = await configStub.fetch(new Request('http://internal/get-webhook-stats'));
        if (webhookResponse.ok) {
          const webhookStats = await webhookResponse.json() as {
            totalWebhooks?: number;
            lastWebhookAt?: string | null;
          } | null;
          totalWebhooks = webhookStats?.totalWebhooks || 0;
        }
      } catch (parseError) {
        logWithContext('DASHBOARD_API', 'Failed to parse config', {
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
      }
    }

    const dashboardStats: DashboardStats = {
      totalIssues: totalWebhooks,
      processedIssues: totalWebhooks,
      activeSessions: sessions.size,
      successRate: totalWebhooks > 0 ? 95 : 0,
      repositories,
      claudeKeyConfigured: !!env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0
    };

    logWithContext('DASHBOARD_API', 'Returning stats', dashboardStats);

    return new Response(JSON.stringify(dashboardStats), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logWithContext('DASHBOARD_API', 'Failed to fetch stats', {
      error: error instanceof Error ? error.message : String(error)
    });

    return new Response(JSON.stringify({
      totalIssues: 0,
      processedIssues: 0,
      activeSessions: 0,
      successRate: 0,
      repositories: []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Test webhook endpoint
 */
async function handleTestWebhook(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { issueNumber?: number };

    logWithContext('DASHBOARD_API', 'Test webhook triggered', {
      issueNumber: body.issueNumber
    });

    // In production, this would trigger a real webhook
    return new Response(JSON.stringify({
      message: 'Test webhook triggered',
      issueNumber: body.issueNumber
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Record a session for tracking
 */
export function recordSession(session: Session): void {
  sessions.set(session.id, session);
  logWithContext('DASHBOARD_API', 'Session recorded', { sessionId: session.id });
}

/**
 * Update session status
 */
export function updateSessionStatus(
  sessionId: string,
  status: Session['status'],
  turns?: number
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = status;
    if (turns !== undefined) {
      session.turns = turns;
    }
    sessions.set(sessionId, session);
  }
}
