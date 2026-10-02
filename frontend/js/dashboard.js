// Daywise Mobile Dashboard Module

import { api } from './api.js';

export class DashboardView {
  constructor(app) {
    this.app = app;
    this.stats = null;
    this.todayTasks = [];
    this.upcomingTasks = [];
    this.isLoading = false;
  }

  async load() {
    this.isLoading = true;
    this.render();

    try {
      const [stats, todayTasks, upcomingTasks] = await Promise.all([
        api.get('/tasks/stats/dashboard'),
        api.get('/tasks', { filter_by: 'today' }),
        api.get('/tasks', { filter_by: 'upcoming' })
      ]);

      this.stats = stats;
      this.todayTasks = todayTasks;
      this.upcomingTasks = upcomingTasks.slice(0, 3); // Top 3 upcoming preview
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.renderError(err.message);
    }
  }

  render() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;

    if (this.isLoading && !this.stats) {
      container.innerHTML = this.renderSkeletons();
      return;
    }

    const {
      greeting = 'Hello!',
      today_date = '',
      today_total = 0,
      today_completed = 0,
      today_percentage = 0,
      upcoming_total = 0
    } = this.stats || {};

    // Progress circle stroke calculation
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (today_percentage / 100) * circumference;

    container.innerHTML = `
      <!-- Top Greeting & Date Header -->
      <div class="px-5 pt-4 pb-2">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600">${today_date}</p>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">${greeting}</h1>
          </div>
          <button id="dashboard-refresh-btn" class="p-2 text-slate-400 hover:text-indigo-600 active:scale-95 transition-all rounded-full hover:bg-slate-100" title="Refresh">
            <i data-lucide="rotate-cw" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Daily Progress Card -->
      <div class="px-5 py-3">
        <div class="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div class="flex items-center justify-between relative z-10">
            <div>
              <span class="inline-block px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm mb-2">
                Daily Focus
              </span>
              <h2 class="text-lg font-bold">Today's Progress</h2>
              <p class="text-xs text-indigo-100 mt-1">
                ${today_total === 0 
                  ? 'No tasks scheduled for today yet.' 
                  : `${today_completed} of ${today_total} tasks completed`}
              </p>
            </div>

            <!-- Circular Progress Ring -->
            <div class="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg class="w-24 h-24" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="${radius}" stroke="rgba(255, 255, 255, 0.2)" stroke-width="8" fill="none" />
                <circle class="progress-ring-circle" cx="50" cy="50" r="${radius}" stroke="#ffffff" stroke-width="8" stroke-linecap="round" fill="none"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-lg font-extrabold">${today_percentage}%</span>
              </div>
            </div>
          </div>

          <!-- Quick Motivational Subtext -->
          <div class="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100">
            <span>${this.getMotivationalMessage(today_percentage, today_total)}</span>
            <button id="dashboard-add-today-btn" class="font-semibold underline hover:text-white flex items-center gap-1">
              <span>+ Add Task</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Filter Chips -->
      <div class="px-5 py-2">
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button class="dash-filter-btn px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 flex-shrink-0" data-filter="today">
            <i data-lucide="sun" class="w-3.5 h-3.5"></i>
            <span>Today (${today_total})</span>
          </button>
          <button class="dash-filter-btn px-4 py-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0" data-filter="upcoming">
            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
            <span>Upcoming (${upcoming_total})</span>
          </button>
          <button class="dash-filter-btn px-4 py-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0" data-filter="completed">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
            <span>Completed</span>
          </button>
          <button class="dash-filter-btn px-4 py-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0" data-filter="all">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
            <span>All Tasks</span>
          </button>
        </div>
      </div>

      <!-- Today's Tasks Section -->
      <div class="px-5 py-3">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Today's Tasks</span>
            <span class="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">${this.todayTasks.length}</span>
          </h2>
          <button id="view-all-tasks-btn" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            <span>See all</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="space-y-2.5">
          ${this.todayTasks.length === 0 ? this.renderEmptyToday() : this.todayTasks.map(t => this.renderTaskCard(t)).join('')}
        </div>
      </div>

      <!-- Upcoming Section Preview -->
      <div class="px-5 py-3 mb-20">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Upcoming Preview</span>
            <span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">${upcoming_total}</span>
          </h2>
          <button id="view-upcoming-tasks-btn" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            <span>Calendar</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="space-y-2.5">
          ${this.upcomingTasks.length === 0 ? this.renderEmptyUpcoming() : this.upcomingTasks.map(t => this.renderTaskCard(t, true)).join('')}
        </div>
      </div>
    `;

    // Re-initialize Lucide icons in new DOM
    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.bindEvents(container);
  }

  getMotivationalMessage(percentage, total) {
    if (total === 0) return 'Take it easy or plan tasks for the day!';
    if (percentage === 100) return '🎉 Fantastic job! All today’s tasks completed!';
    if (percentage >= 70) return '🔥 Almost there! Keep up the momentum!';
    if (percentage >= 40) return '⚡ Good steady progress underway!';
    return '💪 Let’s tackle your top priority today!';
  }

  renderTaskCard(task, isUpcoming = false) {
    const isCompleted = task.is_completed;
    const priorityBadge = this.getPriorityBadge(task.priority);
    const categoryBadge = task.category 
      ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style="background-color: ${task.category.color}15; color: ${task.category.color};">
           <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${task.category.color};"></span>
           ${task.category.name}
         </span>` 
      : '';

    const formattedTime = task.due_time ? task.due_time.substring(0, 5) : '';
    const dateLabel = isUpcoming && task.due_date ? `<span class="text-[11px] text-slate-400 font-medium">${task.due_date}</span>` : '';
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
            ${formattedTime ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                <i data-lucide="clock" class="w-3 h-3 text-slate-400"></i>
                ${formattedTime}
              </span>
            ` : ''}
            ${dateLabel}
            ${subtaskSummary}
            ${task.repeat_schedule && task.repeat_schedule !== 'none' ? `
              <span class="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                <i data-lucide="repeat" class="w-3 h-3"></i>
                ${task.repeat_schedule}
              </span>
            ` : ''}
          </div>
        </div>

        <button class="task-menu-btn text-slate-300 hover:text-slate-600 p-1 rounded-lg" data-id="${task.id}" title="Task options">
          <i data-lucide="more-vertical" class="w-4 h-4"></i>
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

  renderEmptyToday() {
    return `
      <div class="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
        <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
          <i data-lucide="sparkles" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-800">Clear Horizon</h3>
        <p class="text-xs text-slate-500 max-w-[200px] mt-1">No tasks due today. Tap the button below to add your first priority!</p>
        <button id="empty-add-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-indigo-700 transition">
          + Add Today's Task
        </button>
      </div>
    `;
  }

  renderEmptyUpcoming() {
    return `
      <div class="bg-white rounded-2xl p-5 border border-slate-100 text-center text-xs text-slate-400">
        No upcoming tasks scheduled. You're completely up to date!
      </div>
    `;
  }

  renderSkeletons() {
    return `
      <div class="px-5 pt-4 space-y-4">
        <div class="h-6 w-32 skeleton"></div>
        <div class="h-10 w-48 skeleton"></div>
        <div class="h-44 w-full skeleton rounded-3xl"></div>
        <div class="h-8 w-full skeleton rounded-xl"></div>
        <div class="space-y-2.5 pt-2">
          <div class="h-16 w-full skeleton rounded-2xl"></div>
          <div class="h-16 w-full skeleton rounded-2xl"></div>
        </div>
      </div>
    `;
  }

  renderError(msg) {
    const container = document.getElementById('view-dashboard');
    if (!container) return;
    container.innerHTML = `
      <div class="p-6 text-center">
        <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <i data-lucide="alert-circle" class="w-6 h-6"></i>
        </div>
        <h3 class="text-sm font-bold text-slate-800">Unable to load dashboard</h3>
        <p class="text-xs text-slate-500 mt-1">${this.escapeHtml(msg)}</p>
        <button id="retry-dashboard-btn" class="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">
          Try Again
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    document.getElementById('retry-dashboard-btn')?.addEventListener('click', () => this.load());
  }

  bindEvents(container) {
    // Refresh
    container.querySelector('#dashboard-refresh-btn')?.addEventListener('click', () => this.load());

    // Add task triggers
    container.querySelector('#dashboard-add-today-btn')?.addEventListener('click', () => {
      this.app.openTaskModal({ due_date: new Date().toISOString().split('T')[0] });
    });
    container.querySelector('#empty-add-btn')?.addEventListener('click', () => {
      this.app.openTaskModal({ due_date: new Date().toISOString().split('T')[0] });
    });

    // Filter chip clicks
    container.querySelectorAll('.dash-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = btn.dataset.filter;
        this.app.switchTab('tasks');
        this.app.tasksView.setFilter(filter);
      });
    });

    // See all tasks button
    container.querySelector('#view-all-tasks-btn')?.addEventListener('click', () => {
      this.app.switchTab('tasks');
    });

    // See upcoming / calendar button
    container.querySelector('#view-upcoming-tasks-btn')?.addEventListener('click', () => {
      this.app.switchTab('calendar');
    });

    // Checkbox completion toggle
    container.querySelectorAll('.task-check-btn').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const taskId = e.target.dataset.id;
        try {
          await api.patch(`/tasks/${taskId}/toggle-complete`);
          this.app.showToast('Task updated', 'success');
          this.load();
        } catch (err) {
          e.target.checked = !e.target.checked;
          this.app.showToast(err.message, 'error');
        }
      });
    });

    // Task card click (open detail/edit modal)
    container.querySelectorAll('.task-detail-trigger, .task-menu-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const taskId = el.dataset.id;
        this.app.openTaskModal({ id: taskId });
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
