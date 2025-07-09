// Authentication utilities for the tank monitoring system

const TOKEN_KEY = 'tankmon_token';
const USER_KEY = 'tankmon_user';

export interface User {
  username: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private isElectron: boolean = false;

  constructor() {
    // Detect if running in Electron
    this.isElectron = !!(window as any).electronAPI ||
                      navigator.userAgent.toLowerCase().includes('electron') ||
                      process?.versions?.electron !== undefined;

    this.loadFromStorage();

    // If running in Electron and no token exists, create a default one
    if (this.isElectron && !this.token) {
      this.setupElectronAuth();
    }
  }

  private loadFromStorage(): void {
    this.token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (userJson) {
      try {
        this.user = JSON.parse(userJson);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        this.user = null;
      }
    }
  }

  private setupElectronAuth(): void {
    // Create a default token and user for Electron apps
    const defaultToken = 'electron-default-token';
    const defaultUser: User = {
      username: 'electron-user',
      role: 'admin'
    };

    this.token = defaultToken;
    this.user = defaultUser;
    localStorage.setItem(TOKEN_KEY, defaultToken);
    localStorage.setItem(USER_KEY, JSON.stringify(defaultUser));

    console.log('🔧 Electron mode: Using default authentication');
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data;
      } else {
        return {
          success: false,
          message: data.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // In Electron mode, don't redirect to login, just reload the app
    if (this.isElectron) {
      window.location.reload();
    } else {
      window.location.href = '/login';
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  async verifyToken(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.valid;
      }
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  // Add authorization header to fetch requests
  getAuthHeaders(): HeadersInit {
    if (this.token) {
      return {
        'Authorization': `Bearer ${this.token}`,
      };
    }
    return {};
  }

  // Get WebSocket connection URL with authentication
  getWebSocketUrl(baseUrl: string): string {
    if (this.token) {
      return `${baseUrl}?token=${encodeURIComponent(this.token)}`;
    }
    return baseUrl;
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
