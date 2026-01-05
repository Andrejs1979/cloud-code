/**
 * Claude Code Pipeline Dashboard
 * Mobile-first PWA for managing coding pipeline and interacting with Claude Code
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  apiBase: window.location.origin,
  refreshInterval: 30000, // 30 seconds
};

// ============================================================================
// State Management
// ============================================================================

const state = {
  currentView: 'dashboard',
  tasks: [],
  sessions: [],
  issues: [],
  stats: null,
  isLoading: false,
  refreshTimer: null,
  currentSession: null,
  isConfigured: false,
};

// ============================================================================
// DOM Utilities (Safe methods without innerHTML)
// ============================================================================

const dom = {
  el(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('on')) {
        const event = key.substring(2).toLowerCase();
        element.addEventListener(event, value);
      } else if (key === 'type' || key === 'placeholder' || key === 'id' || key === 'href') {
        element.setAttribute(key, value);
      }
    });
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    return element;
  },

  clear(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  },
};

// ============================================================================
// API Client
// ============================================================================

const api = {
  async request(endpoint, options = {}) {
    const url = CONFIG.apiBase + endpoint;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed: ' + response.status);
    }

    return response.json().catch(() => ({}));
  },

  async getStatus() {
    return this.request('/gh-status');
  },

  async getTasks() {
    return this.request('/api/tasks');
  },

  async getSessions() {
    return this.request('/api/sessions');
  },

  async getIssues() {
    return this.request('/api/issues');
  },

  async getStats() {
    return this.request('/api/stats');
  },

  async startSession(prompt, repository, options = {}) {
    const response = await fetch(CONFIG.apiBase + '/interactive/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, repository, options }),
    });

    if (!response.ok) {
      throw new Error('Failed to start session: ' + response.statusText);
    }

    return response;
  },

  async cancelSession(sessionId) {
    return this.request('/interactive/' + sessionId, { method: 'DELETE' });
  },
};

// ============================================================================
// View Renderers
// ============================================================================

const views = {
  dashboard: {
    render(container) {
      const wrapper = dom.el('div', { className: 'slide-up' });

      wrapper.appendChild(this.renderStats());
      wrapper.appendChild(this.renderTasks());
      wrapper.appendChild(this.renderRecentActivity());

      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderStats() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Pipeline Status' });
      card.appendChild(title);

      if (!state.stats) {
        const loading = dom.el('div', {
          className: 'text-text-secondary text-center py-4',
          textContent: 'Loading statistics...'
        });
        card.appendChild(loading);
        return card;
      }

      const { totalIssues, processedIssues, activeSessions, successRate } = state.stats;
      const grid = dom.el('div', { className: 'grid grid-cols-2 gap-3' });

      const statsData = [
        { label: 'Processed', value: processedIssues || 0, colorClass: 'text-primary' },
        { label: 'Success Rate', value: (successRate || 0) + '%', colorClass: 'text-success' },
        { label: 'Active', value: activeSessions || 0, colorClass: 'text-warning' },
        { label: 'Total Issues', value: totalIssues || 0, colorClass: 'text-text-secondary' },
      ];

      statsData.forEach(stat => {
        const statBox = dom.el('div', { className: 'bg-bg rounded-lg p-3 text-center' });
        const valueEl = dom.el('div', { className: 'text-2xl font-bold ' + stat.colorClass, textContent: stat.value });
        const labelEl = dom.el('div', { className: 'text-xs text-text-secondary', textContent: stat.label });
        statBox.appendChild(valueEl);
        statBox.appendChild(labelEl);
        grid.appendChild(statBox);
      });

      card.appendChild(grid);
      return card;
    },

    renderTasks() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Active Tasks' });
      card.appendChild(title);

      if (!state.tasks.length) {
        const empty = dom.el('div', {
          className: 'text-text-secondary text-center py-4',
          textContent: 'No active tasks'
        });
        card.appendChild(empty);
        return card;
      }

      state.tasks.forEach(task => {
        const row = dom.el('div', { className: 'flex items-center justify-between py-3 border-b border-border last:border-0' });

        const left = dom.el('div', { className: 'flex items-center gap-3' });
        const dot = dom.el('div', { className: 'status-dot ' + (task.status || 'pending') });
        left.appendChild(dot);

        const info = dom.el('div', {});
        const titleEl = dom.el('div', { className: 'text-sm font-medium', textContent: task.title || 'Unnamed task' });
        const repoEl = dom.el('div', { className: 'text-xs text-text-secondary', textContent: task.repository || 'Unknown repository' });
        info.appendChild(titleEl);
        info.appendChild(repoEl);
        left.appendChild(info);

        row.appendChild(left);

        const timeEl = dom.el('div', {
          className: 'text-xs text-text-secondary',
          textContent: this.formatTime(task.createdAt)
        });
        row.appendChild(timeEl);

        card.appendChild(row);
      });

      return card;
    },

    renderRecentActivity() {
      const card = dom.el('div', { className: 'card' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Recent Activity' });
      card.appendChild(title);

      if (!state.sessions.length) {
        const empty = dom.el('div', {
          className: 'text-text-secondary text-center py-4',
          textContent: 'No recent activity'
        });
        card.appendChild(empty);
        return card;
      }

      state.sessions.slice(0, 5).forEach(session => {
        const row = dom.el('div', { className: 'flex items-center gap-3 py-2 border-b border-border last:border-0' });

        const statusClass = session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'running';
        const dot = dom.el('div', { className: 'status-dot ' + statusClass });
        row.appendChild(dot);

        const info = dom.el('div', { className: 'flex-1 min-w-0' });
        const promptEl = dom.el('div', {
          className: 'text-sm truncate',
          textContent: session.prompt || 'Session'
        });
        const timeEl = dom.el('div', {
          className: 'text-xs text-text-secondary',
          textContent: this.formatTime(session.createdAt)
        });
        info.appendChild(promptEl);
        info.appendChild(timeEl);

        row.appendChild(info);
        card.appendChild(row);
      });

      return card;
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
      return date.toLocaleDateString();
    },
  },

  sessions: {
    render(container) {
      const wrapper = dom.el('div', { className: 'slide-up' });

      wrapper.appendChild(this.renderSessions());

      if (state.currentSession) {
        wrapper.appendChild(this.renderActiveSession());
      }

      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderSessions() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Interactive Sessions' });
      card.appendChild(title);

      if (!state.sessions.length) {
        const empty = dom.el('div', { className: 'text-center py-8' });

        const icon = dom.el('svg', {
          className: 'w-12 h-12 mx-auto text-text-secondary mb-3',
          attributes: { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }
        });
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.03 9 8z"/>';

        const text = dom.el('p', { className: 'text-text-secondary mb-4', textContent: 'No sessions yet' });
        const btn = dom.el('button', {
          className: 'btn-primary px-4 py-2 rounded-lg text-sm',
          textContent: 'Start New Session',
          onclick: () => app.showNewSessionModal()
        });

        empty.appendChild(icon);
        empty.appendChild(text);
        empty.appendChild(btn);
        card.appendChild(empty);
        return card;
      }

      state.sessions.forEach(session => {
        const item = dom.el('div', { className: 'p-3 border-b border-border last:border-0' });

        const header = dom.el('div', { className: 'flex items-center justify-between mb-2' });

        const left = dom.el('div', { className: 'flex items-center gap-2' });
        const statusClass = session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'running';
        const dot = dom.el('div', { className: 'status-dot ' + statusClass });
        const label = dom.el('span', {
          className: 'text-sm font-medium',
          textContent: 'Session #' + (session.id ? session.id.slice(0, 8) : 'Unknown')
        });
        left.appendChild(dot);
        left.appendChild(label);

        const time = dom.el('span', {
          className: 'text-xs text-text-secondary',
          textContent: this.formatTime(session.createdAt)
        });

        header.appendChild(left);
        header.appendChild(time);
        item.appendChild(header);

        const prompt = dom.el('p', {
          className: 'text-sm text-text-secondary line-clamp-2',
          textContent: session.prompt || 'No prompt'
        });
        item.appendChild(prompt);

        if (session.repository) {
          const repo = dom.el('p', {
            className: 'text-xs text-text-secondary mt-1',
            textContent: session.repository
          });
          item.appendChild(repo);
        }

        card.appendChild(item);
      });

      return card;
    },

    renderActiveSession() {
      const card = dom.el('div', { className: 'card' });

      const header = dom.el('div', { className: 'flex items-center justify-between mb-3' });
      const title = dom.el('h2', { className: 'text-lg font-semibold', textContent: 'Active Session' });
      const cancelBtn = dom.el('button', {
        className: 'text-error text-sm',
        textContent: 'Cancel',
        onclick: () => app.cancelSession()
      });
      header.appendChild(title);
      header.appendChild(cancelBtn);
      card.appendChild(header);

      const output = dom.el('div', {
        id: 'sessionOutput',
        className: 'bg-bg rounded-lg p-3 min-h-[200px] max-h-[400px] overflow-y-auto font-mono text-sm mb-3'
      });
      const initializing = dom.el('div', { className: 'text-text-secondary', textContent: 'Starting session...' });
      output.appendChild(initializing);
      card.appendChild(output);

      const statusDiv = dom.el('div', { id: 'sessionStatus', className: 'flex items-center gap-2 text-sm text-text-secondary' });
      const dot = dom.el('div', { className: 'status-dot running' });
      const text = dom.el('span', { textContent: 'Initializing...' });
      statusDiv.appendChild(dot);
      statusDiv.appendChild(text);
      card.appendChild(statusDiv);

      return card;
    },

    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
  },

  issues: {
    render(container) {
      const wrapper = dom.el('div', { className: 'slide-up' });

      const header = dom.el('div', { className: 'flex items-center justify-between mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold', textContent: 'GitHub Issues' });
      const refreshBtn = dom.el('button', {
        className: 'p-2 rounded-lg hover:bg-border',
        onclick: () => app.refresh()
      });
      refreshBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>';

      header.appendChild(title);
      header.appendChild(refreshBtn);
      wrapper.appendChild(header);

      wrapper.appendChild(this.renderFilters());
      wrapper.appendChild(this.renderIssues());

      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderFilters() {
      const container = dom.el('div', { className: 'flex gap-2 mb-4 overflow-x-auto scrollbar-hide' });

      const filters = ['All', 'Open', 'Processing', 'Completed'];
      filters.forEach((filter, i) => {
        const btn = dom.el('button', {
          className: (i === 0 ? 'px-3 py-1.5 rounded-full text-sm bg-primary text-white whitespace-nowrap' : 'px-3 py-1.5 rounded-full text-sm bg-bg-secondary text-text whitespace-nowrap'),
          textContent: filter
        });
        container.appendChild(btn);
      });

      return container;
    },

    renderIssues() {
      const fragment = document.createDocumentFragment();

      if (!state.issues.length) {
        const card = dom.el('div', { className: 'card text-center py-8' });

        const icon = dom.el('svg', {
          className: 'w-12 h-12 mx-auto text-text-secondary mb-3',
        });
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>';

        const text1 = dom.el('p', { className: 'text-text-secondary', textContent: 'No issues found' });
        const text2 = dom.el('p', {
          className: 'text-xs text-text-secondary mt-1',
          textContent: 'Issues will appear here when created in your connected repository'
        });

        card.appendChild(icon);
        card.appendChild(text1);
        card.appendChild(text2);
        fragment.appendChild(card);
        return fragment;
      }

      state.issues.forEach(issue => {
        const card = dom.el('div', { className: 'card mb-3' });

        const row = dom.el('div', { className: 'flex items-start gap-3' });

        const icon = dom.el('svg', {
          className: 'w-5 h-5 mt-0.5 ' + (issue.state === 'open' ? 'text-success' : 'text-text-secondary'),
        });
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>';

        const content = dom.el('div', { className: 'flex-1 min-w-0' });

        const title = dom.el('h3', { className: 'text-sm font-medium mb-1', textContent: issue.title || 'Untitled issue' });
        const body = dom.el('p', { className: 'text-xs text-text-secondary line-clamp-2 mb-2', textContent: issue.body || 'No description' });

        const meta = dom.el('div', { className: 'flex items-center gap-3' });
        const num = dom.el('span', { className: 'text-xs text-text-secondary', textContent: '#' + (issue.number || '?') });
        const repo = dom.el('span', { className: 'text-xs text-text-secondary', textContent: issue.repository || 'Unknown' });

        meta.appendChild(num);
        meta.appendChild(repo);

        if (issue.labels?.length) {
          issue.labels.forEach(l => {
            const label = dom.el('span', { className: 'px-2 py-0.5 rounded-full text-xs bg-bg-secondary', textContent: l });
            meta.appendChild(label);
          });
        }

        content.appendChild(title);
        content.appendChild(body);
        content.appendChild(meta);

        row.appendChild(icon);
        row.appendChild(content);
        card.appendChild(row);

        fragment.appendChild(card);
      });

      return fragment;
    },
  },

  settings: {
    render(container) {
      const wrapper = dom.el('div', { className: 'slide-up' });

      wrapper.appendChild(this.renderGitHubStatus());
      wrapper.appendChild(this.renderClaudeStatus());
      wrapper.appendChild(this.renderRepositories());
      wrapper.appendChild(this.renderAbout());

      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderGitHubStatus() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'GitHub Configuration' });
      card.appendChild(title);

      if (state.isConfigured) {
        const status = dom.el('div', { className: 'flex items-center gap-2 text-success mb-3' });
        const dot = dom.el('div', { className: 'status-dot completed' });
        const text = dom.el('span', { textContent: 'GitHub App Connected' });
        status.appendChild(dot);
        status.appendChild(text);
        card.appendChild(status);

        const btn = dom.el('button', {
          className: 'btn-secondary px-4 py-2 rounded-lg text-sm w-full',
          textContent: 'Reconfigure GitHub',
          onclick: () => app.openGitHubSetup()
        });
        card.appendChild(btn);
      } else {
        const status = dom.el('div', { className: 'flex items-center gap-2 text-warning mb-3' });
        const dot = dom.el('div', { className: 'status-dot pending' });
        const text = dom.el('span', { textContent: 'GitHub Not Connected' });
        status.appendChild(dot);
        status.appendChild(text);
        card.appendChild(status);

        const btn = dom.el('button', {
          className: 'btn-primary px-4 py-2 rounded-lg text-sm w-full',
          textContent: 'Connect GitHub App',
          onclick: () => app.openGitHubSetup()
        });
        card.appendChild(btn);

        const hint = dom.el('p', {
          className: 'text-xs text-text-secondary mt-2',
          textContent: 'Install the GitHub App to enable automatic issue processing'
        });
        card.appendChild(hint);
      }

      return card;
    },

    renderClaudeStatus() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Claude API' });
      card.appendChild(title);

      const row = dom.el('div', { className: 'flex items-center justify-between' });

      const info = dom.el('div', {});
      const name = dom.el('p', { className: 'text-sm', textContent: 'Claude API Key' });
      const desc = dom.el('p', { className: 'text-xs text-text-secondary', textContent: 'Required for AI code generation' });
      info.appendChild(name);
      info.appendChild(desc);

      const btn = dom.el('button', {
        className: 'btn-secondary px-4 py-2 rounded-lg text-sm',
        textContent: state.isConfigured ? 'Update' : 'Set' + ' Key',
        onclick: () => app.showClaudeSetup()
      });

      row.appendChild(info);
      row.appendChild(btn);
      card.appendChild(row);

      return card;
    },

    renderRepositories() {
      const card = dom.el('div', { className: 'card mb-4' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Connected Repositories' });
      card.appendChild(title);

      if (!state.stats?.repositories?.length) {
        const empty = dom.el('p', {
          className: 'text-sm text-text-secondary text-center py-4',
          textContent: 'No repositories connected'
        });
        card.appendChild(empty);
        return card;
      }

      state.stats.repositories.forEach(repo => {
        const row = dom.el('div', { className: 'flex items-center justify-between py-2 border-b border-border last:border-0' });
        const name = dom.el('span', { className: 'text-sm', textContent: repo });
        const status = dom.el('span', { className: 'text-xs text-text-secondary', textContent: 'Connected' });
        row.appendChild(name);
        row.appendChild(status);
        card.appendChild(row);
      });

      return card;
    },

    renderAbout() {
      const card = dom.el('div', { className: 'card' });
      const title = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'About' });
      card.appendChild(title);

      const info = dom.el('div', { className: 'text-sm text-text-secondary space-y-2' });

      const name = dom.el('p', {});
      const strong = dom.el('strong', { textContent: 'Claude Code Pipeline' });
      name.appendChild(strong);

      const version = dom.el('p', { textContent: 'Version: 1.0.0' });
      const desc = dom.el('p', { textContent: 'AI-powered coding automation for GitHub' });

      info.appendChild(name);
      info.appendChild(version);
      info.appendChild(desc);
      card.appendChild(info);

      return card;
    },
  },
};

// ============================================================================
// Main Application
// ============================================================================

const app = {
  async init() {
    this.startAutoRefresh();
    await this.refresh();

    // Setup pull-to-refresh
    let touchStart = 0;
    document.addEventListener('touchstart', (e) => {
      touchStart = e.touches[0].clientY;
    });
    document.addEventListener('touchend', async (e) => {
      const touchEnd = e.changedTouches[0].clientY;
      if (touchEnd - touchStart > 150 && window.scrollY === 0) {
        await this.refresh();
      }
    });

    // Setup refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
  },

  async refresh() {
    state.isLoading = true;
    this.updateRefreshButton();

    try {
      const [status, tasks, sessions, issues, stats] = await Promise.all([
        api.getStatus().catch(() => ({})),
        api.getTasks().catch(() => []),
        api.getSessions().catch(() => []),
        api.getIssues().catch(() => []),
        api.getStats().catch(() => ({})),
      ]);

      state.isConfigured = status.configured || false;
      state.tasks = tasks || [];
      state.sessions = sessions || [];
      state.issues = issues || [];
      state.stats = stats;

      this.render();
    } catch (error) {
      console.error('Failed to refresh:', error);
      this.showError('Failed to load data. Please check your connection.');
    } finally {
      state.isLoading = false;
      this.updateRefreshButton();
    }
  },

  navigate(view) {
    state.currentView = view;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    const fab = document.getElementById('fab');
    fab.style.display = view === 'sessions' ? 'flex' : 'none';

    this.render();
  },

  render() {
    const mainContent = document.getElementById('mainContent');
    const view = views[state.currentView];

    if (view) {
      view.render(mainContent);
    }
  },

  showNewSessionModal() {
    const modal = document.getElementById('modalContainer');

    dom.clear(modal);

    const overlay = dom.el('div', { className: 'modal-overlay' });
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeModal();
    };

    const content = dom.el('div', { className: 'modal-content p-6' });

    const title = dom.el('h2', { className: 'text-xl font-semibold mb-4', textContent: 'New Interactive Session' });
    content.appendChild(title);

    // Prompt textarea
    const promptLabel = dom.el('label', {
      className: 'block text-sm text-text-secondary mb-2',
      textContent: 'What would you like Claude to do?'
    });
    content.appendChild(promptLabel);

    const promptArea = dom.el('textarea', {
      id: 'sessionPrompt',
      className: 'w-full p-3 rounded-lg min-h-[120px]',
      placeholder: 'e.g., Analyze this repository for security issues or Add error handling to the auth module'
    });
    content.appendChild(promptArea);

    // Repository input
    const repoLabel = dom.el('label', {
      className: 'block text-sm text-text-secondary mb-2 mt-4',
      textContent: 'Repository (optional)'
    });
    content.appendChild(repoLabel);

    const repoInput = dom.el('input', {
      id: 'sessionRepo',
      type: 'text',
      className: 'w-full p-3 rounded-lg',
      placeholder: 'owner/repo'
    });
    content.appendChild(repoInput);

    // Branch input
    const branchLabel = dom.el('label', {
      className: 'block text-sm text-text-secondary mb-2 mt-4',
      textContent: 'Branch (optional)'
    });
    content.appendChild(branchLabel);

    const branchInput = dom.el('input', {
      id: 'sessionBranch',
      type: 'text',
      className: 'w-full p-3 rounded-lg',
      placeholder: 'main'
    });
    content.appendChild(branchInput);

    // Create PR checkbox
    const checkboxLabel = dom.el('label', {
      className: 'flex items-center gap-3 mb-6 mt-4 block'
    });

    const checkbox = dom.el('input', {
      id: 'sessionCreatePR',
      type: 'checkbox',
      className: 'w-5 h-5 rounded'
    });
    const checkboxText = dom.el('span', { className: 'text-sm', textContent: 'Create Pull Request on completion' });

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);
    content.appendChild(checkboxLabel);

    // Buttons
    const btnGroup = dom.el('div', { className: 'flex gap-3' });

    const cancelBtn = dom.el('button', {
      className: 'btn-secondary flex-1 py-3 rounded-lg',
      textContent: 'Cancel',
      onclick: () => this.closeModal()
    });

    const startBtn = dom.el('button', {
      className: 'btn-primary flex-1 py-3 rounded-lg',
      textContent: 'Start Session',
      onclick: () => this.startSession()
    });

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(startBtn);
    content.appendChild(btnGroup);

    overlay.appendChild(content);
    modal.appendChild(overlay);
    modal.classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modalContainer').classList.add('hidden');
  },

  async startSession() {
    const promptEl = document.getElementById('sessionPrompt');
    const repoEl = document.getElementById('sessionRepo');
    const branchEl = document.getElementById('sessionBranch');
    const preEl = document.getElementById('sessionCreatePR');

    if (!promptEl) return;

    const prompt = promptEl.value.trim();
    const repo = repoEl?.value.trim() || '';
    const branch = branchEl?.value.trim() || '';
    const createPR = preEl?.checked || false;

    if (!prompt) {
      alert('Please enter a prompt for Claude');
      return;
    }

    this.closeModal();

    const body = {
      prompt,
      options: {
        maxTurns: 10,
        permissionMode: 'bypassPermissions',
        createPR,
      },
    };

    if (repo) {
      const [owner, name] = repo.split('/');
      body.repository = {
        url: 'https://github.com/' + repo,
        name: owner + '/' + name,
        branch: branch || 'main',
      };
    }

    try {
      const response = await api.startSession(body);
      this.navigate('sessions');
      state.currentSession = { id: Date.now().toString(), prompt };
      this.render();
      await this.streamSession(response);
    } catch (error) {
      this.showError('Failed to start session: ' + error.message);
    }
  },

  async streamSession(response) {
    const output = document.getElementById('sessionOutput');
    const status = document.getElementById('sessionStatus');

    if (!output || !status) return;

    dom.clear(output);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentContent = '';

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
              this.handleSessionEvent(data, output, status);
            } catch (e) {
              // Ignore non-JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      state.currentSession = null;
    }
  },

  handleSessionEvent(data, output, status) {
    const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString();

    switch (data.type) {
      case 'connected':
        status.innerHTML = '<div class="status-dot running"></div><span>Connected</span>';
        break;

      case 'status':
        this.appendOutput(output, '[' + timestamp + '] ' + data.message + '\n', 'status');
        status.innerHTML = '<div class="status-dot running"></div><span>' + data.message + '</span>';
        break;

      case 'claude_delta':
        this.appendOutput(output, data.content || '', 'claude');
        break;

      case 'claude_end':
        this.appendOutput(output, '\nTurn ' + data.turn + ' completed\n', 'success');
        break;

      case 'complete':
        status.innerHTML = '<div class="status-dot completed"></div><span>Complete</span>';
        this.appendOutput(output, '\nSession complete (' + data.turns + ' turns)\n', 'success');
        state.currentSession = null;
        break;

      case 'error':
        status.innerHTML = '<div class="status-dot failed"></div><span>Error</span>';
        this.appendOutput(output, '\nError: ' + data.message + '\n', 'error');
        state.currentSession = null;
        break;
    }
  },

  appendOutput(container, content, type = '') {
    const span = document.createElement('span');
    span.textContent = content;
    if (type === 'status') span.className = 'text-primary block';
    if (type === 'error') span.className = 'text-error block';
    if (type === 'success') span.className = 'text-success block';
    container.appendChild(span);
    container.scrollTop = container.scrollHeight;
  },

  async cancelSession() {
    if (state.currentSession?.id) {
      try {
        await api.cancelSession(state.currentSession.id);
        state.currentSession = null;
        this.render();
      } catch (error) {
        this.showError('Failed to cancel session: ' + error.message);
      }
    }
  },

  openGitHubSetup() {
    window.location.href = '/gh-setup';
  },

  showClaudeSetup() {
    window.location.href = '/claude-setup';
  },

  startAutoRefresh() {
    if (state.refreshTimer) {
      clearInterval(state.refreshTimer);
    }
    state.refreshTimer = setInterval(() => this.refresh(), CONFIG.refreshInterval);
  },

  updateRefreshButton() {
    const btn = document.getElementById('refreshBtn');
    if (state.isLoading) {
      btn.classList.add('animate-spin');
    } else {
      btn.classList.remove('animate-spin');
    }
  },

  showError(message) {
    alert(message);
  },
};

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/dashboard/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed: ' + err));
  });
}
