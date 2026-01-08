import { create } from 'zustand';
import type { DashboardStats, Task, Session, Issue, GitHubStatus, RepositoryDetail } from './types';
import { api } from './api';

// Re-export types for convenience
export type { DashboardStats, Task, Session, Issue, GitHubStatus, RepositoryDetail };

interface AppState {
  // Data
  stats: DashboardStats | null;
  tasks: Task[];
  sessions: Session[];
  issues: Issue[];
  repositories: RepositoryDetail[];
  status: GitHubStatus | null;

  // UI state
  isLoading: boolean;
  isConfigured: boolean;
  selectedIssueFilter: 'All' | 'Open' | 'Processing' | 'Completed';

  // Active session
  currentSession: {
    id: string;
    prompt: string;
    output: string[];
    status: 'starting' | 'running' | 'completed' | 'error';
  } | null;

  // Actions
  refresh: () => Promise<void>;
  setStats: (stats: DashboardStats) => void;
  setTasks: (tasks: Task[]) => void;
  setSessions: (sessions: Session[]) => void;
  setIssues: (issues: Issue[]) => void;
  setRepositories: (repos: RepositoryDetail[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedIssueFilter: (filter: 'All' | 'Open' | 'Processing' | 'Completed') => void;

  // Session actions
  setCurrentSession: (session: AppState['currentSession']) => void;
  appendSessionOutput: (output: string) => void;
  clearCurrentSession: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  stats: null,
  tasks: [],
  sessions: [],
  issues: [],
  repositories: [],
  status: null,
  isLoading: false,
  isConfigured: false,
  selectedIssueFilter: 'All',
  currentSession: null,

  // Actions
  setStats: (stats) => set({ stats }),
  setTasks: (tasks) => set({ tasks }),
  setSessions: (sessions) => set({ sessions }),
  setIssues: (issues) => set({ issues }),
  setRepositories: (repositories) => set({ repositories }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedIssueFilter: (filter) => set({ selectedIssueFilter: filter }),

  setCurrentSession: (session) => set({ currentSession: session, sessions: [] }),

  appendSessionOutput: (output) =>
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, output: [...state.currentSession.output, output] }
        : null,
    })),

  clearCurrentSession: () => set({ currentSession: null }),

  // Refresh all data
  refresh: async () => {
    set({ isLoading: true });

    try {
      const [statusRes, tasksRes, sessionsRes, issuesRes, statsRes, reposRes] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getTasks().catch(() => []),
        api.getSessions().catch(() => []),
        api.getIssues().catch(() => []),
        api.getStats().catch(() => null),
        api.getRepositories().catch(() => []),
      ]);

      set({
        status: statusRes,
        tasks: tasksRes,
        sessions: sessionsRes,
        issues: issuesRes,
        stats: statsRes,
        repositories: reposRes,
        isConfigured: statusRes?.configured ?? false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
      set({ isLoading: false });
    }
  },
}));
