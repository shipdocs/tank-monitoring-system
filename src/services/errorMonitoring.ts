import { type ErrorInfo } from 'react';

// Error monitoring configuration
export interface ErrorMonitoringConfig {
  enabled: boolean;
  service: 'sentry' | 'logRocket' | 'rollbar' | 'custom';
  apiKey?: string;
  environment?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Error context for better debugging
export interface ErrorContext {
  componentName?: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  appVersion?: string;
  tankData?: any;
  connectionStatus?: string;
  [key: string]: any;
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Main error monitoring service
export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private config: ErrorMonitoringConfig;
  private errorQueue: any[] = [];
  private isInitialized = false;

  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      service: 'custom',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  // Initialize the monitoring service
  async initialize(config?: Partial<ErrorMonitoringConfig>): Promise<void> {
    if (this.isInitialized) return;

    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      console.log('Error monitoring disabled');
      return;
    }

    try {
      switch (this.config.service) {
        case 'sentry':
          await this.initializeSentry();
          break;
        case 'logRocket':
          await this.initializeLogRocket();
          break;
        case 'rollbar':
          await this.initializeRollbar();
          break;
        default:
          console.log('Using custom error monitoring');
      }

      this.isInitialized = true;

      // Process any queued errors
      this.processErrorQueue();
    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
    }
  }

  // Initialize Sentry
  private async initializeSentry(): Promise<void> {
    // Dynamic import to avoid loading if not needed
    // const Sentry = await import('@sentry/react');
    // Sentry.init({
    //   dsn: this.config.apiKey,
    //   environment: this.config.environment,
    //   beforeSend: (event) => this.beforeSend(event),
    // });
    console.log('Sentry initialization placeholder');
  }

  // Initialize LogRocket
  private async initializeLogRocket(): Promise<void> {
    // const LogRocket = await import('logrocket');
    // LogRocket.init(this.config.apiKey!);
    // if (this.config.userId) {
    //   LogRocket.identify(this.config.userId, this.config.metadata);
    // }
    console.log('LogRocket initialization placeholder');
  }

  // Initialize Rollbar
  private async initializeRollbar(): Promise<void> {
    // const Rollbar = await import('rollbar');
    // new Rollbar({
    //   accessToken: this.config.apiKey,
    //   environment: this.config.environment,
    // });
    console.log('Rollbar initialization placeholder');
  }

  // Report an error
  reportError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: Partial<ErrorContext>,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  ): void {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      severity,
      context: this.buildContext(context),
      timestamp: new Date().toISOString(),
    };

    if (!this.isInitialized) {
      this.errorQueue.push(errorReport);
      return;
    }

    this.sendError(errorReport);
  }

  // Build complete error context
  private buildContext(partial?: Partial<ErrorContext>): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      appVersion: this.getAppVersion(),
      ...partial,
    };
  }

  // Send error to monitoring service
  private sendError(errorReport: any): void {
    if (!this.config.enabled) return;

    switch (this.config.service) {
      case 'sentry':
        // Sentry.captureException(new Error(errorReport.message), {
        //   contexts: { custom: errorReport.context },
        //   level: errorReport.severity,
        // });
        break;
      case 'logRocket':
        // LogRocket.captureException(new Error(errorReport.message));
        break;
      case 'rollbar':
        // Rollbar.error(errorReport.message, errorReport);
        break;
      default:
        this.customErrorHandler(errorReport);
    }
  }

  // Custom error handler
  private customErrorHandler(errorReport: any): void {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Message:', errorReport.message);
      console.error('Stack:', errorReport.stack);
      console.error('Context:', errorReport.context);
      console.groupEnd();
    }

    // Store in localStorage for debugging
    this.storeErrorLocally(errorReport);

    // Send to custom backend
    this.sendToBackend(errorReport);
  }

  // Store error locally
  private storeErrorLocally(errorReport: any): void {
    try {
      const errors = JSON.parse(localStorage.getItem('tankmon-error-log') || '[]');
      errors.push(errorReport);

      // Keep only last 20 errors
      if (errors.length > 20) {
        errors.shift();
      }

      localStorage.setItem('tankmon-error-log', JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  // Send to backend
  private async sendToBackend(errorReport: any): Promise<void> {
    // Implement your backend error reporting endpoint
    try {
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
      console.log('Would send to backend:', errorReport);
    } catch (error) {
      console.error('Failed to send error to backend:', error);
    }
  }

  // Process queued errors
  private processErrorQueue(): void {
    while (this.errorQueue.length > 0) {
      const errorReport = this.errorQueue.shift();
      this.sendError(errorReport);
    }
  }

  // Get session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('tankmon-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tankmon-session-id', sessionId);
    }
    return sessionId;
  }

  // Get app version
  private getAppVersion(): string {
    // This would typically come from your build process
    return process.env.REACT_APP_VERSION || '1.0.0';
  }

  // Filter sensitive data before sending
  private beforeSend(event: any): any {
    // Remove sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    if (event.user?.email) {
      event.user.email = '[REDACTED]';
    }
    return event;
  }

  // Get stored errors
  getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('tankmon-error-log') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored errors
  clearStoredErrors(): void {
    localStorage.removeItem('tankmon-error-log');
  }

  // Set user context
  setUserContext(userId: string, metadata?: Record<string, any>): void {
    this.config.userId = userId;
    this.config.metadata = metadata;

    if (this.config.service === 'logRocket' && this.isInitialized) {
      // LogRocket.identify(userId, metadata);
    }
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();
