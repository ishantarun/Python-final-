// Daywise Authentication Module

import { api } from './api.js';

class AuthManager {
  constructor() {
    this.user = null;
    this.listeners = [];
  }

  onUserChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.user));
  }

  async init() {
    const token = api.getToken();
    if (!token) {
      this.user = null;
      this.notifyListeners();
      return null;
    }

    try {
      this.user = await api.get('/auth/me');
      this.notifyListeners();
      return this.user;
    } catch (e) {
      console.warn('Failed to restore session:', e);
      api.setToken(null);
      this.user = null;
      this.notifyListeners();
      return null;
    }
  }

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    api.setToken(response.access_token);
    this.user = response.user;
    this.notifyListeners();
    return response;
  }

  async register(email, password, fullName, timezone) {
    const response = await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    });
    api.setToken(response.access_token);
    this.user = response.user;
    this.notifyListeners();
    return response;
  }

  async verifyEmail(token) {
    const response = await api.post('/auth/verify-email', { token });
    if (this.user) {
      this.user.is_verified = true;
      this.notifyListeners();
    }
    return response;
  }

  async resendVerification() {
    return await api.post('/auth/resend-verification');
  }

  async forgotPassword(email) {
    return await api.post('/auth/forgot-password', { email });
  }

  async resetPassword(token, newPassword) {
    return await api.post('/auth/reset-password', {
      token,
      new_password: newPassword
    });
  }

  logout() {
    api.setToken(null);
    this.user = null;
    this.notifyListeners();
    window.location.hash = '';
  }

  isAuthenticated() {
    return !!this.user;
  }
}

export const auth = new AuthManager();
