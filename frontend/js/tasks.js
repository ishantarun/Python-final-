// Daywise Tasks Management View Module

import { api } from './api.js';

export class TasksView {
  constructor(app) {
    this.app = app;
    this.tasks = [];
    this.categories = [];
    this.isLoading = false;
    this.filterBy = 'all'; // all, today, upcoming, completed
    this.selectedCategory = null;
    this.selectedPriority = null;
    this.searchQuery = '';
    this.sortBy = 'due_date';
    this.sortOrder = 'asc';
    this.searchDebounceTimer = null;
  }

  async load() {
    this.isLoading = true;
    this.render();

    try {
      const [categories, tasks] = await Promise.all([
        api.get('/categories'),
        this.fetchTasks()
      ]);

      this.categories = categories;
      this.tasks = tasks;
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.renderError(err.message);
    }
  }

  async fetchTasks() {
    const params = {
      filter_by: this.filterBy,
      sort_by: this.sortBy,
      sort_order: this.sortOrder
    };
    if (this.selectedCategory) params.category_id = this.selectedCategory;
    if (this.selectedPriority) params.priority = this.selectedPriority;
    if (this.searchQuery) params.search = this.searchQuery;

    return await api.get('/tasks', params);
  }

  setFilter(filter) {
    this.filterBy = filter;
    this.load();
  }

  render() {
    const container = document.getElementById('view-tasks');
    if (!container) return;

    container.innerHTML = `
      <!-- Header -->
      <div class="px-5 pt-4 pb-2">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Tasks</h1>
          <button id="tasks-add-btn" class="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 hover:bg-indigo-700 transition">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Add Task</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="mt-3 relative">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
          <input 
            type="text" 
            id="tasks-search-input" 
            placeholder="Search tasks, notes..." 
            value="${this.escapeHtml(this.searchQuery)}"
            class="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
          />
          ${this.searchQuery ? `
            <button id="clear-search-btn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Quick Filter Tabs -->
      <div class="px-5 py-2">
        <div class="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl">
          <button class="task-tab-btn flex-1 py-1.5 rounded-xl text-xs font-semibold text-center transition-all ${this.filterBy === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-tab="all">
            All
          </button>
          <button class="task-tab-btn flex-1 py-1.5 rounded-xl text-xs font-semibold text-center transition-all ${this.filterBy === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-tab="today">
            Today
          </button>
          <button class="task-tab-btn flex-1 py-1.5 rounded-xl text-xs font-semibold text-center transition-all ${this.filterBy === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-tab="upcoming">
            Upcoming
          </button>
          <button class="task-tab-btn flex-1 py-1.5 rounded-xl text-xs font-semibold text-center transition-all ${this.filterBy === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-tab="completed">
            Done
          </button>
        </div>
      </div>

      <!-- Filter & Sort Bar (Category, Priority, Sorting) -->
      <div class="px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <!-- Category Filter -->
        <select id="tasks-category-select" class="text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm">
          <option value="">All Categories</option>
          ${this.categories.map(c => `
            <option value="${c.id}" ${this.selectedCategory == c.id ? 'selected' : ''}>${c.name}</option>
          `).join('')}
        </select>

        <!-- Priority Filter -->
        <select id="tasks-priority-select" class="text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm">
          <option value="">All Priorities</option>
          <option value="high" ${this.selectedPriority === 'high' ? 'selected' : ''}>High Priority</option>
          <option value="medium" ${this.selectedPriority === 'medium' ? 'selected' : ''}>Medium Priority</option>
          <option value="low" ${this.selectedPriority === 'low' ? 'selected' : ''}>Low Priority</option>
        </select>

        <!-- Sort Select -->
        <select id="tasks-sort-select" class="text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm">
          <option value="due_date" ${this.sortBy === 'due_date' ? 'selected' : ''}>Sort: Due Date</option>
          <option value="priority" ${this.sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
          <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Sort: Title</option>
          <option value="created_at" ${this.sortBy === 'created_at' ? 'selected' : ''}>Sort: Created</option>
        </select>
      </div>

      <!-- Task Cards List -->
      <div class="px-5 py-3 mb-24">
        ${this.isLoading ? this.renderSkeletons() : (
          this.tasks.length === 0 ? this.renderEmptyState() : `
            <div class="space-y-2.5">
              ${this.tasks.map(t => this.renderTaskCard(t)).join('')}
            </div>
          `
        )}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents(container);
  }

  renderTaskCard(task) {
    const isCompleted = task.is_completed;
    const priorityBadge = this.getPriorityBadge(task.priority);
    const categoryBadge = task.category 
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style="background-color: ${task.category.color}15; color: ${task.category.color};">
           <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${task.category.color};"></span>
           ${task.category.name}
         </span>` 
      : '';

    const formattedTime = task.due_time ? task.due_time.substring(0, 5) : '';
    const dateLabel = task.due_date ? `<span class="text-[11px] text-slate-500 font-medium">${task.due_date}</span>` : '';
    const subtaskSummary = task.subtasks && task.subtasks.length > 0
      ? `<span class="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
           <i data-lucide="check-square" class="w-3 h-3"></i>
           ${task.subtasks.filter(s => s.is_completed).length}/${task.subtasks.length}
         </span>`
      : '';

    return `
      <div class="task-card bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-3 relative group" data-task-id="${task.id}">
        <input type="checkbox" class="custom-checkbox task-check-btn mt-0.5" ${isCompleted ? 'checked' : ''} data-id="${task.id}" />
        
        <div class="flex-1 min-width-0 cursor-pointer task-detail-trigger" data-id="${task.id}">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900 truncate ${isCompleted ? 'line-through text-slate-400' : ''}">${this.escapeHtml(task.title)}</h3>
            ${priorityBadge}
          </div>

          ${task.notes ? `<p class="text-xs text-slate-500 line-clamp-1 mt-0.5 ${isCompleted ? 'line-through text-slate-400' : ''}">${this.escapeHtml(task.notes)}</p>` : ''}

          <div class="flex items-center flex-wrap gap-2 mt-2">
            ${categoryBadge}
            ${dateLabel}
            ${formattedTime ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                ${formattedTime}
              </span>
            ` : ''}
            ${subtaskSummary}
            ${task.repeat_schedule && task.repeat_schedule !== 'none' ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                <i data-lucide="repeat" class="w-3 h-3"></i>
                ${task.repeat_schedule}
              </span>
            ` : ''}
          </div>
        </div>

        <button class="task-delete-quick-btn text-slate-300 hover:text-rose-500 p-1 rounded-lg" data-id="${task.id}" data-title="${this.escapeHtml(task.title)}" title="Delete task">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }

  getPriorityBadge(priority) {
    if (priority === 'high') {
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-150">High</span>`;
    }
    if (priority === 'medium') {
      return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-150">Med</span>`;
    }
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">Low</span>`;
  }

  renderEmptyState() {
    let title = 'No tasks found';
    let sub = 'Tap Add Task to create a new task!';
    if (this.filterBy === 'completed') {
      title = 'No completed tasks';
      sub = 'Tasks marked as done will appear here.';
    } else if (this.searchQuery) {
      title = 'No matching tasks';
      sub = `No results found for "${this.escapeHtml(this.searchQuery)}"`;
    }

    return `
      <div class="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center mt-4">
        <div class="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3">
          <i data-lucide="inbox" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-800">${title}</h3>
        <p class="text-xs text-slate-500 max-w-[220px] mt-1">${sub}</p>
        <button id="empty-tasks-add-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-indigo-700 transition">
          + Create Task
        </button>
      </div>
    `;
  }

  renderSkeletons() {
    return `
      <div class="space-y-3 pt-2">
        <div class="h-20 w-full skeleton rounded-2xl"></div>
        <div class="h-20 w-full skeleton rounded-2xl"></div>
        <div class="h-20 w-full skeleton rounded-2xl"></div>
      </div>
    `;
  }

  renderError(msg) {
    const container = document.getElementById('view-tasks');
    if (!container) return;
    container.innerHTML = `
      <div class="p-8 text-center">
        <p class="text-sm text-rose-500 font-semibold mb-2">Error loading tasks</p>
        <p class="text-xs text-slate-500 mb-4">${this.escapeHtml(msg)}</p>
        <button id="tasks-retry-btn" class="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">Retry</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    document.getElementById('tasks-retry-btn')?.addEventListener('click', () => this.load());
  }

  bindEvents(container) {
    // Search input debounce
    const searchInput = container.querySelector('#tasks-search-input');
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = setTimeout(async () => {
        this.searchQuery = e.target.value.trim();
        this.tasks = await this.fetchTasks();
        this.render();
      }, 300);
    });

    // Clear search
    container.querySelector('#clear-search-btn')?.addEventListener('click', async () => {
      this.searchQuery = '';
      this.tasks = await this.fetchTasks();
      this.render();
    });

    // Filter tab buttons (All, Today, Upcoming, Done)
    container.querySelectorAll('.task-tab-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.filterBy = btn.dataset.tab;
        this.tasks = await this.fetchTasks();
        this.render();
      });
    });

    // Category select filter
    container.querySelector('#tasks-category-select')?.addEventListener('change', async (e) => {
      this.selectedCategory = e.target.value ? parseInt(e.target.value) : null;
      this.tasks = await this.fetchTasks();
      this.render();
    });

    // Priority select filter
    container.querySelector('#tasks-priority-select')?.addEventListener('change', async (e) => {
      this.selectedPriority = e.target.value || null;
      this.tasks = await this.fetchTasks();
      this.render();
    });

    // Sort select
    container.querySelector('#tasks-sort-select')?.addEventListener('change', async (e) => {
      this.sortBy = e.target.value;
      this.tasks = await this.fetchTasks();
      this.render();
    });

    // Add Task buttons
    container.querySelector('#tasks-add-btn')?.addEventListener('click', () => {
      this.app.openTaskModal();
    });
    container.querySelector('#empty-tasks-add-btn')?.addEventListener('click', () => {
      this.app.openTaskModal();
    });

    // Checkbox completion toggle
    container.querySelectorAll('.task-check-btn').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const taskId = e.target.dataset.id;
        try {
          await api.patch(`/tasks/${taskId}/toggle-complete`);
          this.app.showToast('Task updated', 'success');
          this.tasks = await this.fetchTasks();
          this.render();
        } catch (err) {
          e.target.checked = !e.target.checked;
          this.app.showToast(err.message, 'error');
        }
      });
    });

    // Task details click
    container.querySelectorAll('.task-detail-trigger').forEach(el => {
      el.addEventListener('click', () => {
        const taskId = el.dataset.id;
        this.app.openTaskModal({ id: taskId });
      });
    });

    // Quick delete button with confirmation
    container.querySelectorAll('.task-delete-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.id;
        const taskTitle = btn.dataset.title;
        this.app.confirmAction({
          title: 'Delete Task?',
          message: `Are you sure you want to permanently delete "${taskTitle}"? This cannot be undone.`,
          confirmText: 'Delete Task',
          confirmDanger: true,
          onConfirm: async () => {
            try {
              await api.delete(`/tasks/${taskId}`);
              this.app.showToast('Task deleted permanently', 'success');
              this.tasks = await this.fetchTasks();
              this.render();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          }
        });
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
