// Types from src/types.ts - backend API contracts

export interface DashboardStats {
  totalIssues: number;
  processedIssues: number;
  activeSessions: number;
  successRate: number;
  repositories: string[];
  claudeKeyConfigured?: boolean;
  installationUrl?: string;
}

export interface RepositoriesResponse {
  repositories: RepositoryDetail[];
  installationUrl?: string;
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
  id?: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  repository: string;
  labels?: string[];
  createdAt?: string;
  status?: 'open' | 'processing' | 'completed';
}

export interface GitHubStatus {
  configured?: boolean;
  githubAppConfigured?: boolean;
  claudeKeyConfigured?: boolean;
  claudeConfigured?: boolean;
}

export interface Repository {
  url: string;
  name: string;
  branch?: string;
  full_name?: string;
  owner?: string;
  private?: boolean;
  description?: string;
  default_branch?: string;
}

export interface RepositoryDetail {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string;
  default_branch: string;
  html_url?: string;
  issues_count?: number;
  last_updated?: string;
}

// SSE Event types for interactive sessions
export type SSEEventType =
  | 'connected'
  | 'status'
  | 'claude_start'
  | 'claude_delta'
  | 'claude_end'
  | 'claude_message'
  | 'input_request'
  | 'file_change'
  | 'complete'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  message?: string;
  turn?: number;
  turns?: number;
  timestamp?: number;
  sessionId?: string;
  [key: string]: any;
}
