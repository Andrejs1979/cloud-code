import ky from 'ky';
import type { DashboardStats, Task, Session, Issue, GitHubStatus } from './types';

// Get the base URL based on platform
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Web: use relative path (same origin)
    return window.location.origin;
  }
  // Mobile: use the worker URL
  return 'https://cloud-code.finhub.workers.dev';
};

const apiClient = ky.create({
  prefixUrl: getBaseURL(),
  timeout: 30000,
  retry: 2,
});

export const api = {
  // Status endpoints
  getStatus: (): Promise<GitHubStatus> =>
    apiClient.get('gh-status').json(),

  // Tasks endpoints
  getTasks: (): Promise<Task[]> =>
    apiClient.get('api/tasks').json(),

  createTask: (task: Partial<Task>): Promise<Task> =>
    apiClient.post('api/tasks', { json: task }).json(),

  // Sessions endpoints
  getSessions: (): Promise<Session[]> =>
    apiClient.get('api/sessions').json(),

  // Issues endpoints
  getIssues: (): Promise<Issue[]> =>
    apiClient.get('api/issues').json(),

  // Stats endpoint
  getStats: (): Promise<DashboardStats> =>
    apiClient.get('api/stats').json(),

  // Test webhook
  testWebhook: (issueNumber?: number): Promise<{ message: string; issueNumber?: number }> =>
    apiClient.post('api/test-webhook', { json: { issueNumber } }).json(),
};

// SSE client for interactive sessions
export interface SSEResponse {
  body: ReadableStream | null;
}

export async function startInteractiveSession(
  prompt: string,
  repository?: { url: string; name: string; branch?: string },
  options: { maxTurns?: number; permissionMode?: string; createPR?: boolean } = {}
): Promise<SSEResponse> {
  const response = await fetch(`${getBaseURL()}/interactive/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      repository,
      options: {
        maxTurns: options.maxTurns ?? 10,
        permissionMode: options.permissionMode ?? 'bypassPermissions',
        createPR: options.createPR ?? false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start session: ${response.statusText}`);
  }

  return response as SSEResponse;
}

export async function cancelSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete(`interactive/${sessionId}`).json();
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  return apiClient.get(`interactive/status?sessionId=${sessionId}`).json();
}
