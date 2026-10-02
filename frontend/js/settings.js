// Daywise Settings & Profile Module

import { api } from './api.js';

export class SettingsView {
  constructor(app) {
    this.app = app;
    this.preferences = null;
    this.smtpStatus = null;
    this.categories = [];
    this.isLoading = false;
  }

  async load() {
    this.isLoading = true;
    this.render();

    try {
      const [prefs, smtp, categories] = await Promise.all([
        api.get('/notifications/preferences'),
        api.get('/notifications/smtp-status'),
        api.get('/categories')
      ]);

      this.preferences = prefs;
      this.smtpStatus = smtp;
      this.categories = categories;
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.renderError(err.message);
    }
  }

  render() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    const user = this.app.auth.user || {};
    const {
      in_app_enabled = true,
      email_reminders_enabled = false,
      daily_summary_enabled = false,
      push_enabled = false,
      reminder_timing = 'at_due_time'
    } = this.preferences || {};

    const isSmtpConfigured = this.smtpStatus?.is_configured;

    container.innerHTML = `
      <!-- Header -->
      <div class="px-5 pt-4 pb-2">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
      </div>

      <div class="px-5 py-3 space-y-4 mb-24">
        <!-- Profile Card -->
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              ${(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-slate-900 truncate">${this.escapeHtml(user.full_name || 'Daywise User')}</h3>
                ${user.is_verified ? `
                  <span class="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold" title="Verified Account">
                    <i data-lucide="check" class="w-3 h-3"></i> Verified
                  </span>
                ` : `
                  <button id="verify-account-btn" class="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-full text-[10px] font-bold transition">
                    <i data-lucide="alert-circle" class="w-3 h-3"></i> Unverified
                  </button>
                `}
              </div>
              <p class="text-xs text-slate-500 truncate mt-0.5">${this.escapeHtml(user.email || '')}</p>
            </div>
          </div>

          <!-- Timezone Section -->
          <div class="mt-4 pt-4 border-t border-slate-100">
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Timezone</label>
            <div class="flex items-center gap-2">
              <select id="user-timezone-select" class="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-indigo-500">
                <option value="UTC" ${user.timezone === 'UTC' ? 'selected' : ''}>UTC (Coordinated Universal Time)</option>
                <option value="America/New_York" ${user.timezone === 'America/New_York' ? 'selected' : ''}>America/New York (EST/EDT)</option>
                <option value="America/Chicago" ${user.timezone === 'America/Chicago' ? 'selected' : ''}>America/Chicago (CST/CDT)</option>
                <option value="America/Los_Angeles" ${user.timezone === 'America/Los_Angeles' ? 'selected' : ''}>America/Los Angeles (PST/PDT)</option>
                <option value="Europe/London" ${user.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London (GMT/BST)</option>
                <option value="Europe/Paris" ${user.timezone === 'Europe/Paris' ? 'selected' : ''}>Europe/Paris (CET/CEST)</option>
                <option value="Asia/Tokyo" ${user.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Asia/Tokyo (JST)</option>
                <option value="Asia/Kolkata" ${user.timezone === 'Asia/Kolkata' ? 'selected' : ''}>Asia/Kolkata (IST)</option>
                <option value="Australia/Sydney" ${user.timezone === 'Australia/Sydney' ? 'selected' : ''}>Australia/Sydney (AEST)</option>
              </select>
              <button id="save-timezone-btn" class="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition">
                Save
              </button>
            </div>
          </div>
        </div>

        <!-- Notification Preferences Card -->
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
            <i data-lucide="bell" class="w-4 h-4 text-indigo-600"></i>
            <h2 class="text-sm font-bold text-slate-900">Notification Preferences</h2>
          </div>

          <!-- In-App Notifications -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">In-App Notifications</p>
              <p class="text-[11px] text-slate-400">Receive alerts in Daywise notification center</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="pref-in-app" class="sr-only peer" ${in_app_enabled ? 'checked' : ''} />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <!-- Email Reminders -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Email Reminders</p>
              <p class="text-[11px] text-slate-400">Receive email alerts for scheduled tasks</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="pref-email-reminders" class="sr-only peer" ${email_reminders_enabled ? 'checked' : ''} />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <!-- Daily Summaries -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Daily Summaries</p>
              <p class="text-[11px] text-slate-400">Morning digest of your tasks for the day</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="pref-daily-summary" class="sr-only peer" ${daily_summary_enabled ? 'checked' : ''} />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <!-- Browser Push -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Browser Push Notifications</p>
              <p class="text-[11px] text-slate-400">Optional desktop / phone web push alerts</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="pref-push" class="sr-only peer" ${push_enabled ? 'checked' : ''} />
              <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <!-- Reminder Timing Selector -->
          <div class="pt-2">
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Reminder Timing</label>
            <select id="pref-timing-select" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-indigo-500">
              <option value="at_due_time" ${reminder_timing === 'at_due_time' ? 'selected' : ''}>At due time</option>
              <option value="10_mins_before" ${reminder_timing === '10_mins_before' ? 'selected' : ''}>10 minutes before</option>
              <option value="1_hour_before" ${reminder_timing === '1_hour_before' ? 'selected' : ''}>1 hour before</option>
              <option value="1_day_before" ${reminder_timing === '1_day_before' ? 'selected' : ''}>1 day before</option>
            </select>
          </div>
        </div>

        <!-- SMTP & Email Status Card -->
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i data-lucide="mail" class="w-4 h-4 text-indigo-600"></i>
              <h2 class="text-sm font-bold text-slate-900">Email (SMTP) Status</h2>
            </div>
            ${isSmtpConfigured ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Configured
              </span>
            ` : `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Simulation Mode
              </span>
            `}
          </div>

          <p class="text-xs text-slate-500 leading-relaxed">
            ${isSmtpConfigured 
              ? `Connected to SMTP host: <strong>${this.escapeHtml(this.smtpStatus.host)}</strong>:${this.smtpStatus.port}`
              : `SMTP credentials are not configured in environment variables. Email verification and reminders run in <strong>Simulation / Local Mode</strong> (logged to console, with verification tokens directly available in app).`}
          </p>

          <div class="pt-2 flex items-center gap-2">
            <button id="test-smtp-btn" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Test Email Delivery</span>
            </button>
            <button id="trigger-due-check-btn" class="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition flex items-center gap-1">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
              <span>Trigger Check</span>
            </button>
          </div>
          <div id="smtp-test-result" class="text-xs hidden mt-2"></div>
        </div>

        <!-- Categories Manager Card -->
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <div class="flex items-center gap-2">
              <i data-lucide="tag" class="w-4 h-4 text-indigo-600"></i>
              <h2 class="text-sm font-bold text-slate-900">Custom Categories</h2>
            </div>
            <button id="add-custom-cat-btn" class="px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i>
              <span>Add</span>
            </button>
          </div>

          <div class="space-y-2">
            ${this.categories.map(c => `
              <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                <div class="flex items-center gap-2.5">
                  <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${c.color};"></span>
                  <span class="text-xs font-bold text-slate-800">${this.escapeHtml(c.name)}</span>
                  ${c.is_default ? `
                    <span class="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Default</span>
                  ` : ''}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-400">${c.task_count || 0} active</span>
                  ${!c.is_default ? `
                    <button class="delete-cat-btn p-1 text-slate-300 hover:text-rose-500 rounded" data-id="${c.id}" data-name="${this.escapeHtml(c.name)}">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Account Actions -->
        <div class="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h2 class="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Account</h2>
          <button id="settings-logout-btn" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2">
            <i data-lucide="log-out" class="w-4 h-4"></i>
            <span>Sign Out</span>
          </button>
          <button id="settings-delete-account-btn" class="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.bindEvents(container);
  }

  bindEvents(container) {
    // Save timezone
    container.querySelector('#save-timezone-btn')?.addEventListener('click', async () => {
      const tz = container.querySelector('#user-timezone-select').value;
      try {
        const updated = await api.put('/users/profile', { timezone: tz });
        this.app.auth.user.timezone = updated.timezone;
        this.app.showToast('Timezone updated', 'success');
      } catch (e) {
        this.app.showToast(e.message, 'error');
      }
    });

    // Verification button (if unverified)
    container.querySelector('#verify-account-btn')?.addEventListener('click', () => {
      this.app.openVerificationModal();
    });

    // Notification preference changes
    const savePrefs = async () => {
      const payload = {
        in_app_enabled: container.querySelector('#pref-in-app').checked,
        email_reminders_enabled: container.querySelector('#pref-email-reminders').checked,
        daily_summary_enabled: container.querySelector('#pref-daily-summary').checked,
        push_enabled: container.querySelector('#pref-push').checked,
        reminder_timing: container.querySelector('#pref-timing-select').value
      };

      try {
        this.preferences = await api.put('/notifications/preferences', payload);
        this.app.showToast('Preferences saved', 'success');
      } catch (e) {
        this.app.showToast(e.message, 'error');
      }
    };

    container.querySelector('#pref-in-app')?.addEventListener('change', savePrefs);
    container.querySelector('#pref-email-reminders')?.addEventListener('change', savePrefs);
    container.querySelector('#pref-daily-summary')?.addEventListener('change', savePrefs);
    container.querySelector('#pref-timing-select')?.addEventListener('change', savePrefs);

    container.querySelector('#pref-push')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const allowed = await this.app.notificationsManager.requestBrowserPush();
        if (!allowed) {
          e.target.checked = false;
        }
      }
      savePrefs();
    });

    // Test SMTP Button
    container.querySelector('#test-smtp-btn')?.addEventListener('click', async () => {
      const resultEl = container.querySelector('#smtp-test-result');
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = '<span class="text-slate-500">Testing SMTP connection...</span>';
      try {
        const res = await api.post('/notifications/test-email');
        resultEl.innerHTML = `<span class="text-emerald-600 font-semibold">${res.message}</span>`;
      } catch (e) {
        resultEl.innerHTML = `<span class="text-rose-500 font-semibold">${e.message}</span>`;
      }
    });

    // Trigger reminder check
    container.querySelector('#trigger-due-check-btn')?.addEventListener('click', async () => {
      try {
        const res = await api.post('/notifications/trigger-reminders');
        this.app.showToast(res.message, 'success');
        this.app.notificationsManager.fetchNotifications();
      } catch (e) {
        this.app.showToast(e.message, 'error');
      }
    });

    // Add Custom Category button
    container.querySelector('#add-custom-cat-btn')?.addEventListener('click', () => {
      this.app.openCategoryModal();
    });

    // Delete Category button
    container.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.dataset.id;
        const catName = btn.dataset.name;
        this.app.confirmAction({
          title: 'Delete Category?',
          message: `Are you sure you want to delete "${catName}"? Tasks in this category will not be deleted.`,
          confirmText: 'Delete Category',
          confirmDanger: true,
          onConfirm: async () => {
            try {
              await api.delete(`/categories/${catId}`);
              this.app.showToast('Category deleted', 'success');
              this.load();
            } catch (e) {
              this.app.showToast(e.message, 'error');
            }
          }
        });
      });
    });

    // Sign out button
    container.querySelector('#settings-logout-btn')?.addEventListener('click', () => {
      this.app.confirmAction({
        title: 'Sign Out?',
        message: 'Are you sure you want to sign out of Daywise?',
        confirmText: 'Sign Out',
        onConfirm: () => {
          this.app.auth.logout();
          this.app.showToast('Signed out', 'info');
        }
      });
    });

    // Delete account button
    container.querySelector('#settings-delete-account-btn')?.addEventListener('click', () => {
      this.app.confirmAction({
        title: 'Delete Account?',
        message: 'This will permanently delete your account, all your tasks, categories, and settings. This cannot be undone.',
        confirmText: 'Delete My Account',
        confirmDanger: true,
        onConfirm: async () => {
          try {
            await api.delete('/users/me');
            this.app.auth.logout();
            this.app.showToast('Account permanently deleted', 'info');
          } catch (e) {
            this.app.showToast(e.message, 'error');
          }
        }
      });
    });
  }

  renderError(msg) {
    const container = document.getElementById('view-settings');
    if (!container) return;
    container.innerHTML = `<div class="p-6 text-center text-xs text-rose-500">${this.escapeHtml(msg)}</div>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
