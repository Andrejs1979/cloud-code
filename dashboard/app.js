/**
 * Claude Code Pipeline Dashboard - shadcn/ui Edition
 * Mobile-first PWA for managing coding pipeline and interacting with Claude Code
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  apiBase: window.location.origin,
  refreshInterval: 30000,
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
  selectedIssueFilter: 'All',
};

// ============================================================================
// SVG Icons Helper
// ============================================================================

function createSVG(pathData, options = {}) {
  const { className = '', viewBox = '0 0 24 24', fill = 'none', stroke = 'currentColor', strokeWidth = 2 } = options;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', fill);
  svg.setAttribute('stroke', stroke);
  svg.setAttribute('stroke-width', strokeWidth);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (className) svg.setAttribute('class', className);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);

  return svg;
}

const Icons = {
  refresh: (className = 'h-4 w-4') => createSVG('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', { className }),
  spinner: (className = 'h-4 w-4') => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className + ' animate-spin');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', '0 0 24 24');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'opacity-25');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '4');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'opacity-75');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z');
    svg.appendChild(circle);
    svg.appendChild(path);
    return svg;
  },
  plus: (className = 'h-6 w-6') => createSVG('M12 4v16m8-8H4', { className }),
  messageSquare: (className = 'h-12 w-12') => createSVG('M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.03 9 8z', { className, strokeWidth: 1.5 }),
  clipboard: (className = 'h-12 w-12') => createSVG('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', { className, strokeWidth: 1.5 }),
  checkCircle: (className = 'h-5 w-5') => createSVG('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', { className }),
  circle: (className = 'h-5 w-5') => createSVG('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', { className, viewBox: '0 0 24 24', stroke: 'none', fill: 'none' }),
  github: (className = 'h-5 w-5') => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z');
    svg.appendChild(path);
    return svg;
  },
  x: (className = 'h-4 w-4') => createSVG('M6 18L18 6M6 6l12 12', { className }),
  zap: (className = 'h-4 w-4') => createSVG('M13 10V3L4 14h7v7l9-11h-7z', { className }),
  externalLink: (className = 'h-4 w-4') => createSVG('M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', { className }),
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
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on')) {
        const event = key.substring(2).toLowerCase();
        element.addEventListener(event, value);
      } else {
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

  fragment(children = []) {
    const frag = document.createDocumentFragment();
    if (Array.isArray(children)) {
      children.forEach(child => {
      if (typeof child === 'string') {
        frag.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        frag.appendChild(child);
      }
      });
    }
    return frag;
  },
};

// ============================================================================
// UI Component Builders
// ============================================================================

const UI = {
  statusDot(status) {
    return dom.el('div', { className: `status-dot ${status}` });
  },

  badge({ label, variant = 'default' } = {}) {
    const variantClasses = {
      default: 'badge-default',
      secondary: 'badge-secondary',
      outline: 'badge-outline',
      destructive: 'badge-destructive',
      success: 'badge-success',
      warning: 'badge-warning',
    };
    return dom.el('span', {
      className: `badge ${variantClasses[variant] || 'badge-default'}`,
      textContent: label,
    });
  },

  button({ label, icon, variant = 'primary', className = '', onclick, disabled = false } = {}) {
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      destructive: 'btn-destructive',
    };
    const btn = dom.el('button', {
      className: `btn ${variantClasses[variant] || 'btn-primary'} ${className}`.trim(),
      disabled,
      onclick,
    });
    if (icon) {
      btn.appendChild(icon.cloneNode(true));
      const space = document.createTextNode(' ');
      btn.appendChild(space);
    }
    if (label) {
      btn.appendChild(document.createTextNode(label));
    }
    return btn;
  },

  input({ id, type = 'text', placeholder, className = '', oninput } = {}) {
    return dom.el('input', {
      type,
      id,
      placeholder,
      className: `input ${className}`.trim(),
      oninput,
    });
  },

  textarea({ id, placeholder, className = '', rows = 3, oninput } = {}) {
    return dom.el('textarea', {
      id,
      placeholder,
      className: `input ${className}`.trim(),
      rows: rows.toString(),
      oninput,
    });
  },

  card({ title, content } = {}) {
    const card = dom.el('div', { className: 'card' });
    if (title) {
      const titleEl = dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: title });
      card.appendChild(titleEl);
    }
    if (content) {
      if (typeof content === 'string') {
        card.appendChild(document.createTextNode(content));
      } else if (content instanceof Node) {
        card.appendChild(content);
      }
    }
    return card;
  },
};

// ============================================================================
// Toast Notifications
// ============================================================================

const toast = {
  show(message, options = {}) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const { variant = 'default', duration = 5000 } = options;

    const toastEl = dom.el('div', {
      className: `toast toast-${variant} slide-in-right pointer-events-auto`,
    });

    const content = dom.el('div', {});
    const msgEl = dom.el('div', { className: 'toast-description', textContent: message });
    content.appendChild(msgEl);
    toastEl.appendChild(content);

    const closeBtn = dom.el('button', {
      className: 'absolute top-2 right-2 text-muted-foreground hover:text-foreground',
      onclick: () => toastEl.remove(),
    });
    closeBtn.appendChild(Icons.x());
    toastEl.appendChild(closeBtn);

    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(100%)';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  },

  success(message) { this.show(message, { variant: 'success' }); },
  error(message) { this.show(message, { variant: 'destructive' }); },
  info(message) { this.show(message, { variant: 'default' }); },
};

// ============================================================================
// Modal/Dialog
// ============================================================================

const modal = {
  show({ title, content, footer, onClose } = {}) {
    const container = document.getElementById('modalContainer');
    if (!container) return;

    dom.clear(container);

    const overlay = dom.el('div', {
      className: 'dialog-overlay',
      onclick: (e) => { if (e.target === overlay) this.close(); },
    });

    const dialog = dom.el('div', { className: 'dialog-content' });

    if (title) {
      const header = dom.el('div', { className: 'dialog-header' });
      header.appendChild(dom.el('h2', { className: 'dialog-title', textContent: title }));
      dialog.appendChild(header);
    }

    if (content) {
      if (typeof content === 'string') {
        dialog.appendChild(document.createTextNode(content));
      } else if (content instanceof Node) {
        dialog.appendChild(content);
      }
    }

    if (footer) {
      const footerEl = dom.el('div', { className: 'dialog-footer' });
      if (typeof footer === 'string') {
        footerEl.appendChild(document.createTextNode(footer));
      } else if (footer instanceof Node) {
        footerEl.appendChild(footer);
      }
      dialog.appendChild(footerEl);
    }

    overlay.appendChild(dialog);
    container.appendChild(overlay);
    container.classList.remove('hidden');

    this.onCloseCallback = onClose;
  },

  close() {
    const container = document.getElementById('modalContainer');
    if (container) {
      container.classList.add('hidden');
      dom.clear(container);
    }
    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
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
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed: ' + response.status);
    }
    return response.json().catch(() => ({}));
  },

  async getStatus() { return this.request('/gh-status'); },
  async getTasks() { return this.request('/api/tasks'); },
  async getSessions() { return this.request('/api/sessions'); },
  async getIssues() { return this.request('/api/issues'); },
  async getStats() { return this.request('/api/stats'); },

  async startSession(prompt, repository, options = {}) {
    const response = await fetch(CONFIG.apiBase + '/interactive/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, repository, options }),
    });
    if (!response.ok) throw new Error('Failed to start session: ' + response.statusText);
    return response;
  },

  async cancelSession(sessionId) {
    return this.request('/interactive/' + sessionId, { method: 'DELETE' });
  },
};

// ============================================================================
// Format Utilities
// ============================================================================

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString();
}

function formatTimeShort(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// View Renderers
// ============================================================================

const views = {
  dashboard: {
    render(container) {
      const wrapper = dom.el('div', { className: 'space-y-4 slide-up' });
      wrapper.appendChild(this.renderStats());
      wrapper.appendChild(this.renderTasks());
      wrapper.appendChild(this.renderRecentActivity());
      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderStats() {
      if (!state.stats) {
        const skeleton = dom.el('div', { className: 'stats-grid' });
        for (let i = 0; i < 4; i++) {
          skeleton.appendChild(dom.el('div', { className: 'skeleton stat-card' }));
        }
        return UI.card({ title: 'Pipeline Status', content: skeleton });
      }

      const { totalIssues, processedIssues, activeSessions, successRate } = state.stats;
      const stats = [
        { label: 'Processed', value: processedIssues || 0, colorClass: 'text-primary' },
        { label: 'Success Rate', value: (successRate || 0) + '%', colorClass: 'text-green-500' },
        { label: 'Active', value: activeSessions || 0, colorClass: 'text-yellow-500' },
        { label: 'Total Issues', value: totalIssues || 0, colorClass: 'text-muted-foreground' },
      ];

      const grid = dom.el('div', { className: 'stats-grid' });
      stats.forEach(stat => {
        const statCard = dom.el('div', { className: 'stat-card' });
        statCard.appendChild(dom.el('div', {
          className: `stat-value ${stat.colorClass}`,
          textContent: stat.value.toString(),
        }));
        statCard.appendChild(dom.el('div', { className: 'stat-label', textContent: stat.label }));
        grid.appendChild(statCard);
      });

      return UI.card({ title: 'Pipeline Status', content: grid });
    },

    renderTasks() {
      if (!state.tasks.length) {
        return UI.card({
          title: 'Active Tasks',
          content: dom.el('div', { className: 'text-center py-8 text-muted-foreground', textContent: 'No active tasks' }),
        });
      }

      const card = dom.el('div', { className: 'card' });
      card.appendChild(dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Active Tasks' }));

      state.tasks.forEach(task => {
        const row = dom.el('div', { className: 'flex items-center justify-between py-3 px-1 rounded-lg hover:bg-accent transition-colors' });
        const left = dom.el('div', { className: 'flex items-center gap-3' });
        left.appendChild(UI.statusDot(task.status || 'pending'));
        const info = dom.el('div', {});
        info.appendChild(dom.el('div', { className: 'text-sm font-medium', textContent: task.title || 'Unnamed task' }));
        info.appendChild(dom.el('div', { className: 'text-xs text-muted-foreground', textContent: task.repository || 'Unknown repository' }));
        left.appendChild(info);
        row.appendChild(left);
        row.appendChild(dom.el('div', { className: 'text-xs text-muted-foreground', textContent: formatTime(task.createdAt) }));
        card.appendChild(row);
      });

      return card;
    },

    renderRecentActivity() {
      if (!state.sessions.length) {
        return UI.card({
          title: 'Recent Activity',
          content: dom.el('div', { className: 'text-center py-8 text-muted-foreground', textContent: 'No recent activity' }),
        });
      }

      const card = dom.el('div', { className: 'card' });
      card.appendChild(dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Recent Activity' }));

      state.sessions.slice(0, 5).forEach(session => {
        const row = dom.el('div', { className: 'flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-accent transition-colors' });
        const statusClass = session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'running';
        row.appendChild(UI.statusDot(statusClass));
        const info = dom.el('div', { className: 'flex-1 min-w-0' });
        info.appendChild(dom.el('div', { className: 'text-sm truncate', textContent: session.prompt || 'Session' }));
        info.appendChild(dom.el('div', { className: 'text-xs text-muted-foreground', textContent: formatTime(session.createdAt) }));
        row.appendChild(info);
        card.appendChild(row);
      });

      return card;
    },
  },

  sessions: {
    render(container) {
      const wrapper = dom.el('div', { className: 'space-y-4 slide-up' });
      wrapper.appendChild(this.renderSessionsList());
      if (state.currentSession) wrapper.appendChild(this.renderActiveSession());
      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderSessionsList() {
      if (!state.sessions.length) {
        const card = dom.el('div', { className: 'card text-center py-12' });
        const icon = dom.el('div', { className: 'flex justify-center mb-4 text-muted-foreground' });
        icon.appendChild(Icons.messageSquare());
        card.appendChild(icon);
        card.appendChild(dom.el('h3', { className: 'text-lg font-semibold mb-2', textContent: 'No sessions yet' }));
        card.appendChild(dom.el('p', { className: 'text-sm text-muted-foreground mb-6', textContent: 'Start a new interactive session with Claude Code' }));
        const startBtn = UI.button({ label: 'Start New Session', icon: Icons.plus(), className: 'btn-full', onclick: () => app.showNewSessionModal() });
        card.appendChild(startBtn);
        return card;
      }

      const card = dom.el('div', { className: 'card' });
      card.appendChild(dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Interactive Sessions' }));

      state.sessions.forEach(session => {
        const item = dom.el('div', { className: 'p-3 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer mb-2 last:mb-0' });
        const header = dom.el('div', { className: 'flex items-center justify-between mb-2' });
        const left = dom.el('div', { className: 'flex items-center gap-2' });
        const statusClass = session.status === 'completed' ? 'completed' : session.status === 'failed' ? 'failed' : 'running';
        left.appendChild(UI.statusDot(statusClass));
        left.appendChild(dom.el('span', { className: 'text-sm font-medium', textContent: 'Session #' + (session.id ? session.id.slice(0, 8) : 'Unknown') }));
        header.appendChild(left);
        header.appendChild(dom.el('span', { className: 'text-xs text-muted-foreground', textContent: formatTimeShort(session.createdAt) }));
        item.appendChild(header);
        item.appendChild(dom.el('p', { className: 'text-sm text-muted-foreground line-clamp-2', textContent: session.prompt || 'No prompt' }));
        if (session.repository) {
          const repo = dom.el('div', { className: 'flex items-center gap-1 mt-2' });
          repo.appendChild(Icons.github('h-4 w-4'));
          repo.appendChild(dom.el('span', { className: 'text-xs text-muted-foreground ml-1', textContent: session.repository }));
          item.appendChild(repo);
        }
        card.appendChild(item);
      });

      return card;
    },

    renderActiveSession() {
      const card = dom.el('div', { className: 'card' });
      const header = dom.el('div', { className: 'flex items-center justify-between mb-4' });
      header.appendChild(dom.el('h3', { className: 'text-lg font-semibold', textContent: 'Active Session' }));
      header.appendChild(UI.button({ label: 'Cancel', variant: 'destructive', size: 'sm', onclick: () => app.cancelSession() }));
      card.appendChild(header);

      const output = dom.el('div', { id: 'sessionOutput', className: 'terminal-output min-h-[200px] max-h-[400px] overflow-y-auto mb-3' });
      output.appendChild(dom.el('div', { className: 'text-muted-foreground', textContent: 'Starting session...' }));
      card.appendChild(output);

      const statusDiv = dom.el('div', { id: 'sessionStatus', className: 'flex items-center gap-2 text-sm text-muted-foreground' });
      statusDiv.appendChild(UI.statusDot('running'));
      statusDiv.appendChild(dom.el('span', { textContent: 'Initializing...' }));
      card.appendChild(statusDiv);

      return card;
    },
  },

  issues: {
    render(container) {
      const wrapper = dom.el('div', { className: 'space-y-4 slide-up' });
      const header = dom.el('div', { className: 'flex items-center justify-between' });
      header.appendChild(dom.el('h2', { className: 'text-lg font-semibold', textContent: 'GitHub Issues' }));
      const refreshBtn = UI.button({ icon: Icons.refresh(), variant: 'outline', size: 'sm', onclick: () => app.refresh() });
      header.appendChild(refreshBtn);
      wrapper.appendChild(header);
      wrapper.appendChild(this.renderFilters());
      wrapper.appendChild(this.renderIssues());
      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderFilters() {
      const filters = ['All', 'Open', 'Processing', 'Completed'];
      const container = dom.el('div', { className: 'tabs-list w-full' });

      filters.forEach(filter => {
        const isActive = state.selectedIssueFilter === filter;
        const btn = dom.el('button', {
          className: 'tabs-trigger flex-1',
          dataset: { active: isActive.toString() },
          textContent: filter,
          onclick: () => { state.selectedIssueFilter = filter; app.render(); },
        });
        container.appendChild(btn);
      });

      return container;
    },

    renderIssues() {
      let filteredIssues = state.issues;
      if (state.selectedIssueFilter === 'Open') filteredIssues = state.issues.filter(i => i.state === 'open');
      else if (state.selectedIssueFilter === 'Processing') filteredIssues = state.issues.filter(i => i.status === 'processing');
      else if (state.selectedIssueFilter === 'Completed') filteredIssues = state.issues.filter(i => i.status === 'completed');

      if (!filteredIssues.length) {
        const card = dom.el('div', { className: 'card text-center py-12' });
        const icon = dom.el('div', { className: 'flex justify-center mb-4 text-muted-foreground' });
        icon.appendChild(Icons.clipboard());
        card.appendChild(icon);
        card.appendChild(dom.el('h3', { className: 'text-lg font-semibold mb-2', textContent: 'No issues found' }));
        const desc = state.selectedIssueFilter === 'All'
          ? 'Issues will appear here when created in your connected repository'
          : `No ${state.selectedIssueFilter.toLowerCase()} issues`;
        card.appendChild(dom.el('p', { className: 'text-sm text-muted-foreground', textContent: desc }));
        return card;
      }

      const fragment = dom.fragment();
      filteredIssues.forEach(issue => {
        const card = dom.el('div', { className: 'issue-card' });
        const icon = dom.el('div', { className: 'issue-icon ' + (issue.state === 'open' ? 'text-green-500' : 'text-muted-foreground') });
        icon.appendChild(Icons.checkCircle());
        const content = dom.el('div', { className: 'issue-content' });
        const header = dom.el('div', { className: 'flex items-start justify-between gap-2' });
        header.appendChild(dom.el('h3', { className: 'issue-title', textContent: issue.title || 'Untitled issue' }));
        header.appendChild(UI.badge({ label: issue.state === 'open' ? 'Open' : 'Closed', variant: issue.state === 'open' ? 'success' : 'secondary' }));
        content.appendChild(header);
        content.appendChild(dom.el('p', { className: 'issue-body', textContent: issue.body || 'No description' }));

        const meta = dom.el('div', { className: 'issue-meta' });
        meta.appendChild(dom.el('span', { className: 'text-xs text-muted-foreground font-mono', textContent: '#' + (issue.number || '?') }));
        if (issue.repository) meta.appendChild(dom.el('span', { className: 'text-xs text-muted-foreground', textContent: issue.repository }));
        if (issue.labels?.length) {
          issue.labels.slice(0, 3).forEach(l => {
            if (typeof l === 'string') {
              meta.appendChild(UI.badge({ label: l, variant: 'outline', className: 'text-xs' }));
            }
          });
        }
        content.appendChild(meta);

        card.appendChild(icon);
        card.appendChild(content);
        fragment.appendChild(card);
      });

      return fragment;
    },
  },

  settings: {
    render(container) {
      const wrapper = dom.el('div', { className: 'space-y-4 slide-up' });
      wrapper.appendChild(this.renderGitHubStatus());
      wrapper.appendChild(this.renderClaudeStatus());
      wrapper.appendChild(this.renderRepositories());
      wrapper.appendChild(this.renderAbout());
      dom.clear(container);
      container.appendChild(wrapper);
    },

    renderGitHubStatus() {
      const content = dom.el('div', { className: 'space-y-4' });
      const statusRow = dom.el('div', { className: 'flex items-center gap-2' });
      statusRow.appendChild(UI.statusDot(state.isConfigured ? 'completed' : 'pending'));
      statusRow.appendChild(dom.el('span', {
        className: 'text-sm font-medium ' + (state.isConfigured ? 'text-green-500' : 'text-yellow-500'),
        textContent: state.isConfigured ? 'GitHub App Connected' : 'GitHub Not Connected',
      }));
      content.appendChild(statusRow);
      content.appendChild(dom.el('p', {
        className: 'text-sm text-muted-foreground',
        textContent: state.isConfigured ? 'Your GitHub App is properly configured and connected.' : 'Install the GitHub App to enable automatic issue processing.',
      }));
      content.appendChild(UI.button({
        label: state.isConfigured ? 'Reconfigure GitHub' : 'Connect GitHub App',
        icon: Icons.github(),
        variant: state.isConfigured ? 'outline' : 'primary',
        className: 'btn-full',
        onclick: () => app.openGitHubSetup(),
      }));

      return UI.card({ title: 'GitHub Configuration', content });
    },

    renderClaudeStatus() {
      const isConfigured = state.stats?.claudeKeyConfigured;
      const content = dom.el('div', {});
      const row = dom.el('div', { className: 'flex items-center justify-between' });
      const info = dom.el('div', {});
      info.appendChild(dom.el('p', { className: 'text-sm font-medium', textContent: 'Claude API (Centralized)' }));
      info.appendChild(dom.el('p', { className: 'text-xs text-muted-foreground', textContent: 'Managed by service administrator' }));
      row.appendChild(info);
      row.appendChild(UI.badge({ label: isConfigured ? 'Configured' : 'Not Set', variant: isConfigured ? 'success' : 'warning' }));
      content.appendChild(row);
      content.appendChild(dom.el('p', { className: 'text-xs text-muted-foreground mt-3', textContent: 'Contact your administrator to configure the Claude API key' }));

      return UI.card({ title: 'Claude API', content });
    },

    renderRepositories() {
      const repos = Array.isArray(state.stats?.repositories) ? state.stats.repositories : [];
      if (!repos.length) {
        return UI.card({
          title: 'Connected Repositories',
          content: dom.el('p', { className: 'text-sm text-muted-foreground text-center py-4', textContent: 'No repositories connected' }),
        });
      }

      const card = dom.el('div', { className: 'card' });
      card.appendChild(dom.el('h2', { className: 'text-lg font-semibold mb-3', textContent: 'Connected Repositories' }));

      repos.forEach(repo => {
        const row = dom.el('div', { className: 'flex items-center justify-between py-2 px-1 rounded-lg hover:bg-accent transition-colors' });
        const left = dom.el('div', { className: 'flex items-center gap-2' });
        left.appendChild(Icons.github());
        left.appendChild(dom.el('span', { className: 'text-sm', textContent: repo }));
        row.appendChild(left);
        row.appendChild(UI.badge({ label: 'Connected', variant: 'secondary', className: 'text-xs' }));
        card.appendChild(row);
      });

      return card;
    },

    renderAbout() {
      const content = dom.el('div', { className: 'space-y-3' });
      const name = dom.el('p', { className: 'font-semibold' });
      name.appendChild(Icons.zap());
      name.appendChild(document.createTextNode(' Claude Code Pipeline'));
      content.appendChild(name);
      content.appendChild(dom.el('p', { className: 'text-sm text-muted-foreground', textContent: 'Version: 2.0.0 (shadcn/ui Edition)' }));
      content.appendChild(dom.el('p', { className: 'text-sm text-muted-foreground', textContent: 'AI-powered coding automation for GitHub' }));

      return UI.card({ title: 'About', content });
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

    let touchStart = 0;
    document.addEventListener('touchstart', (e) => { touchStart = e.touches[0].clientY; });
    document.addEventListener('touchend', async (e) => {
      if (e.changedTouches[0].clientY - touchStart > 150 && window.scrollY === 0) await this.refresh();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
    document.getElementById('fab').addEventListener('click', () => this.showNewSessionModal());

    // Add navigation click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) this.navigate(view);
      });
    });
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
      toast.error('Failed to load data. Please check your connection.');
    } finally {
      state.isLoading = false;
      this.updateRefreshButton();
    }
  },

  navigate(view) {
    state.currentView = view;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.dataset.active = (item.dataset.view === view).toString();
    });
    document.getElementById('fab').style.display = view === 'sessions' ? 'flex' : 'none';
    this.render();
  },

  render() {
    const mainContent = document.getElementById('mainContent');
    const view = views[state.currentView];
    if (view) view.render(mainContent);
  },

  showNewSessionModal() {
    const content = dom.el('div', { className: 'space-y-4' });

    // Prompt
    content.appendChild(dom.el('label', { className: 'block text-sm mb-1', textContent: 'Prompt' }));
    content.appendChild(dom.el('p', { className: 'text-xs text-muted-foreground mb-2', textContent: 'What would you like Claude to do?' }));
    content.appendChild(UI.textarea({
      id: 'sessionPrompt',
      placeholder: 'e.g., Analyze this repository for security issues',
      className: 'min-h-[120px]',
    }));

    // Repository
    content.appendChild(dom.el('label', { className: 'block text-sm mb-1 mt-4', textContent: 'Repository' }));
    content.appendChild(dom.el('p', { className: 'text-xs text-muted-foreground mb-2', textContent: 'Optional: Specify a GitHub repository' }));
    content.appendChild(UI.input({ id: 'sessionRepo', placeholder: 'owner/repo' }));

    // Branch
    content.appendChild(dom.el('label', { className: 'block text-sm mb-1 mt-4', textContent: 'Branch' }));
    content.appendChild(dom.el('p', { className: 'text-xs text-muted-foreground mb-2', textContent: 'Optional: Specify a branch (default: main)' }));
    content.appendChild(UI.input({ id: 'sessionBranch', placeholder: 'main' }));

    // Create PR checkbox
    const checkboxLabel = dom.el('label', { className: 'flex items-center gap-3 cursor-pointer mt-4' });
    const checkbox = dom.el('input', { id: 'sessionCreatePR', type: 'checkbox', className: 'checkbox' });
    const checkboxText = dom.el('span', { className: 'text-sm', textContent: 'Create Pull Request on completion' });
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);
    content.appendChild(checkboxLabel);

    // Footer
    const footer = dom.el('div', { className: 'flex gap-3' });
    footer.appendChild(UI.button({ label: 'Cancel', variant: 'outline', className: 'flex-1', onclick: () => modal.close() }));
    footer.appendChild(UI.button({ label: 'Start Session', className: 'flex-1', onclick: () => this.startSession() }));

    modal.show({ title: 'New Interactive Session', description: 'Start a conversation with Claude Code', content, footer });
  },

  async startSession() {
    const promptEl = document.getElementById('sessionPrompt');
    const repoEl = document.getElementById('sessionRepo');
    const branchEl = document.getElementById('sessionBranch');
    const prEl = document.getElementById('sessionCreatePR');

    if (!promptEl) return;
    const prompt = promptEl.value.trim();
    const repo = repoEl?.value.trim() || '';
    const branch = branchEl?.value.trim() || '';
    const createPR = prEl?.checked || false;

    if (!prompt) { toast.error('Please enter a prompt for Claude'); return; }

    modal.close();

    const body = { prompt, options: { maxTurns: 10, permissionMode: 'bypassPermissions', createPR } };
    if (repo) {
      const [owner, name] = repo.split('/');
      body.repository = { url: 'https://github.com/' + repo, name: owner + '/' + name, branch: branch || 'main' };
    }

    try {
      toast.info('Starting session...');
      const response = await api.startSession(body);
      this.navigate('sessions');
      state.currentSession = { id: Date.now().toString(), prompt };
      this.render();
      await this.streamSession(response);
    } catch (error) {
      toast.error('Failed to start session: ' + error.message);
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
            } catch (e) { /* Ignore */ }
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
        dom.clear(status);
        status.appendChild(UI.statusDot('running'));
        status.appendChild(document.createTextNode('Connected'));
        break;

      case 'status':
        this.appendOutput(output, '[' + timestamp + '] ' + data.message + '\n', 'status');
        dom.clear(status);
        status.appendChild(UI.statusDot('running'));
        status.appendChild(document.createTextNode(data.message));
        break;

      case 'claude_delta':
        this.appendOutput(output, data.content || '', 'content');
        break;

      case 'claude_end':
        this.appendOutput(output, '\nTurn ' + data.turn + ' completed\n', 'success');
        break;

      case 'complete':
        dom.clear(status);
        status.appendChild(UI.statusDot('completed'));
        status.appendChild(document.createTextNode('Complete'));
        this.appendOutput(output, '\nSession complete (' + data.turns + ' turns)\n', 'success');
        toast.success('Session completed successfully');
        state.currentSession = null;
        break;

      case 'error':
        dom.clear(status);
        status.appendChild(UI.statusDot('failed'));
        status.appendChild(document.createTextNode('Error'));
        this.appendOutput(output, '\nError: ' + data.message + '\n', 'error');
        toast.error('Session error: ' + data.message);
        state.currentSession = null;
        break;
    }
  },

  appendOutput(container, content, type) {
    const span = document.createElement('span');
    span.textContent = content;
    const typeClasses = { status: 'status-line', error: 'error-line', success: 'success-line', content: 'content-line' };
    if (typeClasses[type]) span.className = typeClasses[type];
    container.appendChild(span);
    container.scrollTop = container.scrollHeight;
  },

  async cancelSession() {
    if (state.currentSession?.id) {
      try {
        await api.cancelSession(state.currentSession.id);
        state.currentSession = null;
        this.render();
        toast.info('Session cancelled');
      } catch (error) {
        toast.error('Failed to cancel session: ' + error.message);
      }
    }
  },

  openGitHubSetup() { window.location.href = '/gh-setup'; },

  startAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(() => this.refresh(), CONFIG.refreshInterval);
  },

  updateRefreshButton() {
    const refreshIcon = document.getElementById('refreshIcon');
    const loadingIcon = document.getElementById('loadingIcon');
    if (state.isLoading) {
      refreshIcon.classList.add('hidden');
      loadingIcon.classList.remove('hidden');
    } else {
      refreshIcon.classList.remove('hidden');
      loadingIcon.classList.add('hidden');
    }
  },
};

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', () => app.init());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/dashboard/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed: ' + err));
  });
}
