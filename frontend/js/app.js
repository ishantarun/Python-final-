// Daywise Master Application Orchestrator

import { api } from './api.js';
import { auth } from './auth.js';
import { DashboardView } from './dashboard.js';
import { TasksView } from './tasks.js';
import { CalendarView } from './calendar.js';
import { SettingsView } from './settings.js';
import { NotificationsManager } from './notifications.js';

class DaywiseApp {
  constructor() {
    this.auth = auth;
    this.currentTab = 'dashboard';
    this.dashboardView = new DashboardView(this);
    this.tasksView = new TasksView(this);
    this.calendarView = new CalendarView(this);
    this.settingsView = new SettingsView(this);
    this.notificationsManager = new NotificationsManager(this);
    this.activeTaskModalData = null;
  }

  async init() {
    this.bindGlobalEvents();
    this.bindModalEvents();

    // Listen for auth changes
    this.auth.onUserChange((user) => {
      this.handleAuthStateChange(user);
    });

    window.addEventListener('auth:required', () => {
      this.openAuthModal('signin');
    });

    // Check existing auth session
    const user = await this.auth.init();
    if (user) {
      this.onAuthenticated();
    } else {
      this.openAuthModal('signin');
    }

    // Process any initial URL hash actions (e.g. email verify or password reset links)
    this.handleUrlHash();
  }

  handleAuthStateChange(user) {
    if (user) {
      this.closeModal('auth-modal');
      this.onAuthenticated();
    } else {
      this.notificationsManager.stopPolling();
      this.openAuthModal('signin');
    }
  }

  onAuthenticated() {
    document.getElementById('app-top-bar')?.classList.remove('hidden');
    document.getElementById('bottom-nav')?.classList.remove('hidden');
    document.getElementById('main-fab')?.classList.remove('hidden');
    this.notificationsManager.startPolling();
    this.switchTab(this.currentTab);
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle view containers
    const views = ['dashboard', 'tasks', 'calendar', 'settings'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === tabName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Trigger tab loader
    if (tabName === 'dashboard') this.dashboardView.load();
    else if (tabName === 'tasks') this.tasksView.load();
    else if (tabName === 'calendar') this.calendarView.load();
    else if (tabName === 'settings') this.settingsView.load();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Toasts ---
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    let iconColor = 'text-indigo-600';
    if (type === 'success') {
      iconName = 'check-circle';
      iconColor = 'text-emerald-500';
    } else if (type === 'error') {
      iconName = 'alert-triangle';
      iconColor = 'text-rose-500';
    }

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-5 h-5 ${iconColor} flex-shrink-0"></i>
      <span class="text-xs text-slate-800 flex-1 leading-snug">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // --- Confirmation Modal ---
  confirmAction({ title, message, confirmText = 'Confirm', confirmDanger = false, onConfirm }) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    modal.querySelector('#confirm-modal-title').textContent = title;
    modal.querySelector('#confirm-modal-msg').textContent = message;
    
    const confirmBtn = modal.querySelector('#confirm-modal-action-btn');
    confirmBtn.textContent = confirmText;
    if (confirmDanger) {
      confirmBtn.className = 'flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow';
    } else {
      confirmBtn.className = 'flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow';
    }

    const handleConfirm = async () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      this.closeModal('confirm-modal');
      if (onConfirm) await onConfirm();
    };

    confirmBtn.onclick = handleConfirm;
    modal.classList.add('active');
  }

  // --- Task Modal ---
  async openTaskModal(initialData = {}) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    this.activeTaskModalData = initialData;
    let task = null;

    if (initialData.id) {
      try {
        task = await api.get(`/tasks/${initialData.id}`);
      } catch (e) {
        this.showToast('Could not load task details', 'error');
        return;
      }
    }

    // Fetch categories for dropdown
    const categories = await api.get('/categories').catch(() => []);

    // Fill form fields
    const titleInput = document.getElementById('task-input-title');
    const notesInput = document.getElementById('task-input-notes');
    const dateInput = document.getElementById('task-input-date');
    const timeInput = document.getElementById('task-input-time');
    const prioritySelect = document.getElementById('task-input-priority');
    const categorySelect = document.getElementById('task-input-category');
    const repeatSelect = document.getElementById('task-input-repeat');
    const deleteBtn = document.getElementById('task-delete-btn');
    const modalHeaderTitle = document.getElementById('task-modal-heading');

    modalHeaderTitle.textContent = task ? 'Edit Task' : 'New Task';
    titleInput.value = task ? task.title : (initialData.title || '');
    notesInput.value = task ? (task.notes || '') : '';
    dateInput.value = task ? (task.due_date || '') : (initialData.due_date || '');
    timeInput.value = task ? (task.due_time ? task.due_time.substring(0, 5) : '') : '';
    prioritySelect.value = task ? task.priority : 'medium';
    repeatSelect.value = task ? task.repeat_schedule : 'none';

    // Populate categories dropdown
    categorySelect.innerHTML = `
      <option value="">No Category</option>
      ${categories.map(c => `
        <option value="${c.id}" ${task && task.category_id === c.id ? 'selected' : ''}>${c.name}</option>
      `).join('')}
    `;

    // Render Subtasks
    this.renderSubtasksListInModal(task ? task.subtasks : []);

    // Show/hide delete button
    if (task) {
      deleteBtn.classList.remove('hidden');
      deleteBtn.onclick = () => {
        this.confirmAction({
          title: 'Delete Task?',
          message: `Are you sure you want to permanently delete "${task.title}"?`,
          confirmText: 'Delete Permanently',
          confirmDanger: true,
          onConfirm: async () => {
            try {
              await api.delete(`/tasks/${task.id}`);
              this.closeModal('task-modal');
              this.showToast('Task deleted', 'success');
              this.refreshCurrentView();
            } catch (e) {
              this.showToast(e.message, 'error');
            }
          }
        });
      };
    } else {
      deleteBtn.classList.add('hidden');
    }

    modal.classList.add('active');
    setTimeout(() => titleInput.focus(), 150);
  }

  renderSubtasksListInModal(subtasks = []) {
    const container = document.getElementById('task-subtasks-list');
    if (!container) return;

    container.innerHTML = subtasks.map(s => `
      <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 subtask-row" data-subtask-id="${s.id || ''}">
        <input type="checkbox" class="custom-checkbox subtask-modal-check" ${s.is_completed ? 'checked' : ''} ${!s.id ? 'disabled' : ''} />
        <span class="text-xs text-slate-800 flex-1 truncate ${s.is_completed ? 'line-through text-slate-400' : ''}">${this.escapeHtml(s.title)}</span>
        <button type="button" class="remove-subtask-btn text-slate-300 hover:text-rose-500 p-1">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    // Remove subtask
    container.querySelectorAll('.remove-subtask-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const row = btn.closest('.subtask-row');
        const subId = row.dataset.subtaskId;
        if (subId && this.activeTaskModalData?.id) {
          try {
            await api.delete(`/tasks/${this.activeTaskModalData.id}/subtasks/${subId}`);
          } catch (err) {
            console.warn(err);
          }
        }
        row.remove();
      });
    });

    // Toggle subtask in modal
    container.querySelectorAll('.subtask-modal-check').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const row = cb.closest('.subtask-row');
        const subId = row.dataset.subtaskId;
        if (subId && this.activeTaskModalData?.id) {
          try {
            await api.patch(`/tasks/${this.activeTaskModalData.id}/subtasks/${subId}/toggle`);
            const titleSpan = row.querySelector('span');
            if (cb.checked) titleSpan.classList.add('line-through', 'text-slate-400');
            else titleSpan.classList.remove('line-through', 'text-slate-400');
          } catch (err) {
            cb.checked = !cb.checked;
          }
        }
      });
    });
  }

  // --- Category Modal ---
  openCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    document.getElementById('cat-input-name').value = '';
    modal.classList.add('active');
  }

  // --- Verification Modal ---
  openVerificationModal(presetToken = '') {
    const modal = document.getElementById('verify-modal');
    if (!modal) return;
    const tokenInput = document.getElementById('verify-input-token');
    if (tokenInput) tokenInput.value = presetToken;
    modal.classList.add('active');
  }

  // --- Password Reset Modals ---
  openForgotPasswordModal() {
    this.closeModal('auth-modal');
    const modal = document.getElementById('forgot-modal');
    if (!modal) return;
    modal.classList.add('active');
  }

  openResetPasswordModal(presetToken = '') {
    this.closeModal('forgot-modal');
    const modal = document.getElementById('reset-modal');
    if (!modal) return;
    document.getElementById('reset-input-token').value = presetToken;
    modal.classList.add('active');
  }

  openAuthModal(initialTab = 'signin') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;

    this.switchAuthTab(initialTab);
    modal.classList.add('active');
  }

  switchAuthTab(tab) {
    const signinForm = document.getElementById('auth-signin-form');
    const signupForm = document.getElementById('auth-signup-form');
    const tabSignin = document.getElementById('auth-tab-signin');
    const tabSignup = document.getElementById('auth-tab-signup');

    if (tab === 'signup') {
      signinForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
      tabSignup.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-center bg-white text-indigo-600 shadow-sm';
      tabSignin.className = 'flex-1 py-2 rounded-xl text-xs font-semibold text-center text-slate-500 hover:text-slate-800';
    } else {
      signupForm.classList.add('hidden');
      signinForm.classList.remove('hidden');
      tabSignin.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-center bg-white text-indigo-600 shadow-sm';
      tabSignup.className = 'flex-1 py-2 rounded-xl text-xs font-semibold text-center text-slate-500 hover:text-slate-800';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  refreshCurrentView() {
    this.switchTab(this.currentTab);
  }

  handleUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#verify')) {
      const urlParams = new URLSearchParams(hash.replace('#verify', ''));
      const token = urlParams.get('token');
      if (token) {
        this.openVerificationModal(token);
      }
    } else if (hash.startsWith('#reset')) {
      const urlParams = new URLSearchParams(hash.replace('#reset', ''));
      const token = urlParams.get('token');
      if (token) {
        this.openResetPasswordModal(token);
      }
    }
  }

  bindGlobalEvents() {
    // Navigation bar buttons
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Floating action button (+)
    document.getElementById('main-fab')?.addEventListener('click', () => {
      this.openTaskModal();
    });

    // Notification bell icon
    document.getElementById('notif-bell-btn')?.addEventListener('click', () => {
      this.notificationsManager.openNotificationDrawer();
    });

    document.getElementById('close-notif-btn')?.addEventListener('click', () => {
      this.notificationsManager.closeNotificationDrawer();
    });

    document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
      this.notificationsManager.markAllRead();
    });

    // Desktop view toggle (Phone 390px vs Expanded 768px)
    document.getElementById('desktop-view-toggle')?.addEventListener('click', () => {
      const container = document.getElementById('app-container');
      const isExpanded = container.classList.toggle('expanded-mode');
      const toggleLabel = document.getElementById('view-toggle-text');
      if (toggleLabel) {
        toggleLabel.textContent = isExpanded ? 'Phone (390px)' : 'Expanded';
      }
    });

    // Close modals on clicking overlay backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    // Generic close modal buttons
    document.querySelectorAll('.close-modal-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('active');
      });
    });
  }

  bindModalEvents() {
    // --- Auth Modal Events ---
    document.getElementById('auth-tab-signin')?.addEventListener('click', () => this.switchAuthTab('signin'));
    document.getElementById('auth-tab-signup')?.addEventListener('click', () => this.switchAuthTab('signup'));

    // Sign In Form Submit
    document.getElementById('auth-signin-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const password = document.getElementById('signin-password').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        await this.auth.login(email, password);
        this.showToast('Welcome back!', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });

    // Quick Demo Account Login button (for effortless evaluation)
    document.getElementById('auth-demo-login-btn')?.addEventListener('click', async () => {
      const email = 'demo@daywise.app';
      const password = 'DaywisePassword123!';
      try {
        await this.auth.login(email, password);
        this.showToast('Signed in as Demo User!', 'success');
      } catch (err) {
        // If demo user does not exist yet, register it!
        try {
          await this.auth.register(email, password, 'Alex Morgan');
          this.showToast('Demo Account Initialized!', 'success');
        } catch (e2) {
          this.showToast(e2.message, 'error');
        }
      }
    });

    // Sign Up Form Submit
    document.getElementById('auth-signup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        await this.auth.register(email, password, fullName);
        this.showToast('Account created! Welcome to Daywise.', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });

    // Forgot Password link in Sign In
    document.getElementById('link-forgot-password')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openForgotPasswordModal();
    });

    // Forgot Password Form Submit
    document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        const res = await this.auth.forgotPassword(email);
        this.showToast(res.message, 'success');
        if (res.simulation_token) {
          // In simulation mode, pre-open reset password modal with simulation token!
          this.openResetPasswordModal(res.simulation_token);
        } else {
          this.closeModal('forgot-modal');
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Reset Password Form Submit
    document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('reset-input-token').value;
      const newPassword = document.getElementById('reset-input-new-pass').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        const res = await this.auth.resetPassword(token, newPassword);
        this.showToast(res.message, 'success');
        this.closeModal('reset-modal');
        this.openAuthModal('signin');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Verification Form Submit
    document.getElementById('verify-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('verify-input-token').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        const res = await this.auth.verifyEmail(token);
        this.showToast(res.message, 'success');
        this.closeModal('verify-modal');
        this.refreshCurrentView();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Resend verification button in verify modal
    document.getElementById('resend-verify-btn')?.addEventListener('click', async () => {
      try {
        const res = await this.auth.resendVerification();
        this.showToast(res.message, 'success');
        if (res.simulation_token) {
          document.getElementById('verify-input-token').value = res.simulation_token;
        }
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });

    // --- Task Form Save Submit ---
    document.getElementById('task-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-input-title').value.trim();
      const notes = document.getElementById('task-input-notes').value.trim();
      const dueDate = document.getElementById('task-input-date').value || null;
      const dueTime = document.getElementById('task-input-time').value ? `${document.getElementById('task-input-time').value}:00` : null;
      const priority = document.getElementById('task-input-priority').value;
      const categoryIdVal = document.getElementById('task-input-category').value;
      const categoryId = categoryIdVal ? parseInt(categoryIdVal) : null;
      const repeatSchedule = document.getElementById('task-input-repeat').value;
      const submitBtn = e.target.querySelector('button[type="submit"]');

      const isEditing = !!(this.activeTaskModalData && this.activeTaskModalData.id);

      try {
        submitBtn.disabled = true;

        if (isEditing) {
          await api.put(`/tasks/${this.activeTaskModalData.id}`, {
            title,
            notes,
            due_date: dueDate,
            due_time: dueTime,
            priority,
            category_id: categoryId,
            repeat_schedule: repeatSchedule
          });
          this.showToast('Task updated', 'success');
        } else {
          // Gather any pending subtasks from modal
          const subtaskRows = document.querySelectorAll('#task-subtasks-list .subtask-row span');
          const subtasks = Array.from(subtaskRows).map(span => span.textContent.trim()).filter(Boolean);

          await api.post('/tasks', {
            title,
            notes,
            due_date: dueDate,
            due_time: dueTime,
            priority,
            category_id: categoryId,
            repeat_schedule: repeatSchedule,
            subtasks
          });
          this.showToast('Task created', 'success');
        }

        this.closeModal('task-modal');
        this.refreshCurrentView();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    // Add subtask inline input handler
    document.getElementById('add-subtask-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('new-subtask-input');
      const val = input.value.trim();
      if (!val) return;

      const isEditing = !!(this.activeTaskModalData && this.activeTaskModalData.id);

      if (isEditing) {
        try {
          const newSub = await api.post(`/tasks/${this.activeTaskModalData.id}/subtasks`, { title: val });
          const currentList = document.querySelectorAll('#task-subtasks-list .subtask-row');
          input.value = '';
          const task = await api.get(`/tasks/${this.activeTaskModalData.id}`);
          this.renderSubtasksListInModal(task.subtasks);
        } catch (e) {
          this.showToast(e.message, 'error');
        }
      } else {
        // Just append to DOM for task creation
        const container = document.getElementById('task-subtasks-list');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 subtask-row';
        row.innerHTML = `
          <input type="checkbox" class="custom-checkbox" disabled />
          <span class="text-xs text-slate-800 flex-1 truncate">${this.escapeHtml(val)}</span>
          <button type="button" class="remove-subtask-btn text-slate-300 hover:text-rose-500 p-1">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        `;
        container.appendChild(row);
        input.value = '';
        if (window.lucide) window.lucide.createIcons();

        row.querySelector('.remove-subtask-btn').addEventListener('click', () => row.remove());
      }
    });

    // --- Custom Category Submit ---
    document.getElementById('category-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('cat-input-name').value.trim();
      const color = document.querySelector('input[name="cat-color"]:checked')?.value || '#4F46E5';
      const icon = document.getElementById('cat-input-icon').value || 'tag';

      try {
        await api.post('/categories', { name, color, icon });
        this.showToast('Category created', 'success');
        this.closeModal('category-modal');
        if (this.currentTab === 'settings') this.settingsView.load();
        else if (this.currentTab === 'tasks') this.tasksView.load();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Bootstrap app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new DaywiseApp();
  window.daywise = app;
  app.init();
});
