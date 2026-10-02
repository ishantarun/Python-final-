// Daywise API Client Wrapper

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('daywise_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('daywise_token', token);
    } else {
      localStorage.removeItem('daywise_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('daywise_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:required'));
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail = data?.detail || data?.message || `Request failed with status ${response.status}`;
        throw new Error(errorDetail);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
