// Daywise Calendar View Module

import { api } from './api.js';

export class CalendarView {
  constructor(app) {
    this.app = app;
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.tasksForMonth = [];
    this.tasksForSelectedDate = [];
    this.isLoading = false;
  }

  async load() {
    this.isLoading = true;
    this.render();

    try {
      // Fetch all tasks to populate date indicators
      this.tasksForMonth = await api.get('/tasks', { filter_by: 'all' });
      await this.loadSelectedDateTasks();
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.renderError(err.message);
    }
  }

  async loadSelectedDateTasks() {
    const dateStr = this.formatDateIso(this.selectedDate);
    this.tasksForSelectedDate = await api.get('/tasks', { target_date: dateStr });
  }

  formatDateIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  render() {
    const container = document.getElementById('view-calendar');
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthName = this.currentDate.toLocaleString('default', { month: 'long' });

    // Calendar grid calculations
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    // Map tasks by date string
    const taskDateMap = {};
    this.tasksForMonth.forEach(task => {
      if (task.due_date) {
        if (!taskDateMap[task.due_date]) taskDateMap[task.due_date] = [];
        taskDateMap[task.due_date].push(task);
      }
    });

    const selectedIso = this.formatDateIso(this.selectedDate);
    const todayIso = this.formatDateIso(new Date());

    container.innerHTML = `
      <!-- Header -->
      <div class="px-5 pt-4 pb-2">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h1>
          <button id="cal-today-btn" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition shadow-sm">
            Today
          </button>
        </div>

        <!-- Month Navigation -->
        <div class="flex items-center justify-between mt-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
          <button id="cal-prev-month" class="p-2 text-slate-600 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition">
            <i data-lucide="chevron-left" class="w-4 h-4"></i>
          </button>
          <h2 class="text-sm font-bold text-slate-800">${monthName} ${year}</h2>
          <button id="cal-next-month" class="p-2 text-slate-600 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition">
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Calendar Grid Card -->
      <div class="px-5 py-2">
        <div class="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
          <!-- Weekdays Header -->
          <div class="grid grid-cols-7 gap-1 text-center mb-2">
            <span class="text-[11px] font-semibold text-slate-400">Su</span>
            <span class="text-[11px] font-semibold text-slate-400">Mo</span>
            <span class="text-[11px] font-semibold text-slate-400">Tu</span>
            <span class="text-[11px] font-semibold text-slate-400">We</span>
            <span class="text-[11px] font-semibold text-slate-400">Th</span>
            <span class="text-[11px] font-semibold text-slate-400">Fr</span>
            <span class="text-[11px] font-semibold text-slate-400">Sa</span>
          </div>

          <!-- Days Grid -->
          <div class="grid grid-cols-7 gap-1">
            ${this.renderCalendarDays(year, month, firstDayIndex, daysInMonth, prevDaysInMonth, taskDateMap, selectedIso, todayIso)}
          </div>
        </div>
      </div>

      <!-- Selected Date Tasks Section -->
      <div class="px-5 py-3 mb-24">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">
              ${this.selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', weekday: 'short' })}
            </h2>
            <p class="text-xs text-slate-400">${this.tasksForSelectedDate.length} scheduled task(s)</p>
          </div>
          <button id="cal-add-date-task-btn" class="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-indigo-700 transition flex items-center gap-1">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Add Task</span>
          </button>
        </div>

        <div class="space-y-2.5">
          ${this.tasksForSelectedDate.length === 0 ? `
            <div class="bg-white rounded-2xl p-6 border border-slate-100 text-center text-xs text-slate-400">
              No tasks scheduled for this date.
            </div>
          ` : this.tasksForSelectedDate.map(t => this.renderTaskCard(t)).join('')}
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents(container);
  }

  renderCalendarDays(year, month, firstDayIndex, daysInMonth, prevDaysInMonth, taskDateMap, selectedIso, todayIso) {
    let daysHtml = '';

    // Previous month filler days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDate = prevDaysInMonth - x + 1;
      daysHtml += `
        <div class="h-10 flex items-center justify-center text-xs text-slate-300 font-medium cursor-not-allowed">
          ${prevDate}
        </div>
      `;
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = dayIso === selectedIso;
      const isToday = dayIso === todayIso;
      const tasksOnDay = taskDateMap[dayIso] || [];
      const hasTasks = tasksOnDay.length > 0;
      const hasIncomplete = tasksOnDay.some(t => !t.is_completed);

      daysHtml += `
        <button 
          class="cal-day-cell h-10 rounded-2xl flex flex-col items-center justify-center text-xs font-semibold transition-all relative
            ${isSelected ? 'bg-indigo-600 text-white shadow-md' : (isToday ? 'bg-indigo-50 text-indigo-600 font-extrabold' : 'text-slate-700 hover:bg-slate-100')}"
          data-date="${dayIso}"
        >
          <span>${i}</span>
          ${hasTasks ? `
            <span class="w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : (hasIncomplete ? 'bg-indigo-500' : 'bg-emerald-400')}"></span>
          ` : '<span class="w-1.5 h-1.5 mt-0.5"></span>'}
        </button>
      `;
    }

    return daysHtml;
  }

  renderTaskCard(task) {
    const isCompleted = task.is_completed;
    return `
      <div class="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
        <input type="checkbox" class="custom-checkbox cal-task-check mt-0.5" ${isCompleted ? 'checked' : ''} data-id="${task.id}" />
        <div class="flex-1 cursor-pointer cal-task-open" data-id="${task.id}">
          <h4 class="text-sm font-semibold text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}">${this.escapeHtml(task.title)}</h4>
          ${task.due_time ? `<p class="text-xs text-slate-400 mt-0.5">${task.due_time.substring(0, 5)}</p>` : ''}
        </div>
      </div>
    `;
  }

  bindEvents(container) {
    // Prev / Next month
    container.querySelector('#cal-prev-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.load();
    });

    container.querySelector('#cal-next-month')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.load();
    });

    // Jump to Today
    container.querySelector('#cal-today-btn')?.addEventListener('click', () => {
      this.currentDate = new Date();
      this.selectedDate = new Date();
      this.load();
    });

    // Date cell click
    container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', async () => {
        const dateStr = cell.dataset.date;
        const [y, m, d] = dateStr.split('-');
        this.selectedDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        await this.loadSelectedDateTasks();
        this.render();
      });
    });

    // Add task for selected date
    container.querySelector('#cal-add-date-task-btn')?.addEventListener('click', () => {
      this.app.openTaskModal({ due_date: this.formatDateIso(this.selectedDate) });
    });

    // Checkbox completion toggle
    container.querySelectorAll('.cal-task-check').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const taskId = e.target.dataset.id;
        try {
          await api.patch(`/tasks/${taskId}/toggle-complete`);
          this.app.showToast('Task updated', 'success');
          await this.loadSelectedDateTasks();
          this.render();
        } catch (err) {
          e.target.checked = !e.target.checked;
          this.app.showToast(err.message, 'error');
        }
      });
    });

    // Open task details
    container.querySelectorAll('.cal-task-open').forEach(el => {
      el.addEventListener('click', () => {
        this.app.openTaskModal({ id: el.dataset.id });
      });
    });
  }

  renderError(msg) {
    const container = document.getElementById('view-calendar');
    if (!container) return;
    container.innerHTML = `<div class="p-6 text-center text-xs text-rose-500">${this.escapeHtml(msg)}</div>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
