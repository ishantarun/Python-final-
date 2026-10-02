// Daywise Notifications Module

import { api } from './api.js';

export class NotificationsManager {
  constructor(app) {
    this.app = app;
    this.notifications = [];
    this.unreadCount = 0;
    this.pollInterval = null;
  }

  startPolling() {
    this.fetchNotifications();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchNotifications(), 30000);
  }

  stopPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async fetchNotifications() {
    if (!this.app.auth.isAuthenticated()) return;
    try {
      this.notifications = await api.get('/notifications');
      this.unreadCount = this.notifications.filter(n => !n.is_read).length;
      this.updateBadge();
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  }

  updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  openNotificationDrawer() {
    const drawer = document.getElementById('notification-modal');
    if (!drawer) return;

    this.renderDrawerContent();
    drawer.classList.add('active');
  }

  closeNotificationDrawer() {
    const drawer = document.getElementById('notification-modal');
    if (!drawer) return;
    drawer.classList.remove('active');
  }

  renderDrawerContent() {
    const container = document.getElementById('notification-list-container');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <i data-lucide="bell-off" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
          <p class="text-xs">No notifications yet.</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="space-y-2">
          ${this.notifications.map(n => `
            <div class="p-3.5 rounded-2xl border transition-all ${n.is_read ? 'bg-white border-slate-100' : 'bg-indigo-50/50 border-indigo-100'} flex items-start gap-3">
              <div class="w-8 h-8 rounded-full ${n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white'} flex items-center justify-center flex-shrink-0 mt-0.5">
                <i data-lucide="bell" class="w-4 h-4"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold ${n.is_read ? 'text-slate-700' : 'text-slate-900'}">${this.escapeHtml(n.title)}</h4>
                  <span class="text-[10px] text-slate-400">${this.formatTime(n.created_at)}</span>
                </div>
                <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${this.escapeHtml(n.message)}</p>
                ${!n.is_read ? `
                  <button class="mark-single-read-btn text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 mt-2" data-id="${n.id}">
                    Mark as read
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (window.lucide) window.lucide.createIcons();

    // Mark single as read
    container.querySelectorAll('.mark-single-read-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        try {
          await api.patch(`/notifications/${id}/read`);
          await this.fetchNotifications();
          this.renderDrawerContent();
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  async markAllRead() {
    try {
      await api.post('/notifications/mark-all-read');
      this.app.showToast('All notifications marked as read', 'success');
      await this.fetchNotifications();
      this.renderDrawerContent();
    } catch (e) {
      this.app.showToast(e.message, 'error');
    }
  }

  async requestBrowserPush() {
    if (!('Notification' in window)) {
      this.app.showToast('Browser push notifications are not supported in this browser.', 'error');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Daywise Notifications Enabled', {
          body: 'You will receive reminders for your upcoming tasks.',
          icon: '/assets/icon.svg'
        });
        return true;
      }
    }
    return false;
  }

  formatTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
