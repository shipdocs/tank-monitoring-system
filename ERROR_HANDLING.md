# Error Handling in Tank Monitoring System

This document describes the comprehensive error handling system implemented in the Tank Monitoring application.

## Overview

The application uses React Error Boundaries to catch and handle errors gracefully, preventing the entire application from crashing when individual components fail. The system includes:

1. **Error Boundaries** - React components that catch JavaScript errors
2. **Error Monitoring Service** - Centralized error reporting and logging
3. **User-Friendly Error UI** - Clear error messages with recovery options
4. **Developer Tools** - Error log viewer and debugging utilities

## Components

### 1. ErrorBoundary (`/src/components/ErrorBoundary.tsx`)

The base error boundary component that provides:
- Error catching and state management
- Customizable error UI
- Error recovery mechanism
- Integration with error monitoring service

**Usage:**
```tsx
<ErrorBoundary
  componentName="MyComponent"
  isolate={true}
  onError={(error, errorInfo) => {
    console.log('Component error:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

**Props:**
- `componentName`: Name for error identification
- `isolate`: Prevent error propagation to parent
- `onError`: Custom error handler callback
- `fallbackComponent`: Custom error UI component

### 2. AppErrorBoundary (`/src/components/AppErrorBoundary.tsx`)

Top-level error boundary for the entire application:
- Catches any unhandled errors in the app
- Provides application-level recovery options
- Shows detailed error information
- Offers "Reset Application" functionality

**Usage:**
```tsx
<AppErrorBoundary>
  <App />
</AppErrorBoundary>
```

### 3. TankErrorBoundary (`/src/components/TankErrorBoundary.tsx`)

Specialized error boundary for individual tank components:
- Isolates tank-specific errors
- Shows tank identification in error messages
- Compact error UI suitable for grid layouts
- Prevents one tank error from affecting others

**Usage:**
```tsx
<TankErrorBoundary tankId="123" tankName="Port Tank 1">
  <TankCard tank={tank} />
</TankErrorBoundary>
```

### 4. Error Monitoring Service (`/src/services/errorMonitoring.ts`)

Centralized service for error reporting and monitoring:

**Features:**
- Configurable error reporting (Sentry, LogRocket, custom)
- Error severity levels
- Local error storage
- Session tracking
- Sensitive data filtering

**Configuration:**
```typescript
errorMonitoring.initialize({
  enabled: true,
  service: 'sentry', // or 'logRocket', 'rollbar', 'custom'
  apiKey: 'your-api-key',
  environment: 'production'
});
```

**Manual Error Reporting:**
```typescript
import { errorMonitoring, ErrorSeverity } from './services/errorMonitoring';

try {
  // risky operation
} catch (error) {
  errorMonitoring.reportError(
    error,
    undefined,
    { component: 'DataLoader', action: 'fetchTankData' },
    ErrorSeverity.HIGH
  );
}
```

### 5. useErrorHandler Hook

Custom hook for manual error reporting:

```typescript
import { useErrorHandler } from './components/ErrorBoundary';

function MyComponent() {
  const reportError = useErrorHandler();
  
  const handleAsyncError = async () => {
    try {
      await riskyAsyncOperation();
    } catch (error) {
      reportError(error);
    }
  };
}
```

## Error Recovery Strategies

### 1. Component-Level Recovery
- "Try Again" button resets component state
- Preserves application state
- Suitable for transient errors

### 2. Application-Level Recovery
- Full page reload
- Clear local storage option
- Reset to default state

### 3. Automatic Recovery
- Error count tracking
- Prevents infinite error loops
- Automatic fallback after repeated failures

## Developer Tools

### ErrorLogViewer Component

Available in development mode through the Controls Sidebar:
- View all logged errors
- Expand for detailed stack traces
- Export error logs as JSON
- Clear error history

### Error Debugging

1. **Console Logging**: All errors are logged with full context
2. **Local Storage**: Errors stored in `tankmon-error-log` key
3. **Component Stack**: Shows React component hierarchy
4. **Error Context**: Includes timestamp, URL, user agent

## Best Practices

### 1. Strategic Placement
```tsx
// Wrap critical sections
<ErrorBoundary componentName="CriticalSection" isolate={true}>
  <DataProcessor />
  <ResultsDisplay />
</ErrorBoundary>
```

### 2. Custom Error Messages
```tsx
<ErrorBoundary
  fallbackComponent={({ error, resetError }) => (
    <CustomErrorUI 
      message="Failed to load tank data"
      error={error}
      onRetry={resetError}
    />
  )}
>
  <TankDataLoader />
</ErrorBoundary>
```

### 3. Error Context
```tsx
// Add context for better debugging
errorMonitoring.reportError(
  error,
  errorInfo,
  {
    tankId: tank.id,
    action: 'updateTankLevel',
    previousLevel: oldLevel,
    newLevel: newLevel
  }
);
```

### 4. Async Error Handling
```tsx
// For async operations
const loadData = async () => {
  try {
    const data = await fetchTankData();
    setTankData(data);
  } catch (error) {
    reportError(error);
    // Show user-friendly message
    setError('Failed to load tank data');
  }
};
```

## Integration with External Services

### Sentry Integration
```typescript
// In errorMonitoring.ts
import * as Sentry from '@sentry/react';

private async initializeSentry(): Promise<void> {
  Sentry.init({
    dsn: this.config.apiKey,
    environment: this.config.environment,
    beforeSend: (event) => this.beforeSend(event),
  });
}
```

### LogRocket Integration
```typescript
import LogRocket from 'logrocket';

private async initializeLogRocket(): Promise<void> {
  LogRocket.init(this.config.apiKey!);
  if (this.config.userId) {
    LogRocket.identify(this.config.userId);
  }
}
```

## Testing Error Boundaries

See `/src/tests/ErrorBoundary.test.tsx` for comprehensive tests.

**Testing Tips:**
1. Use `ThrowError` component for controlled error simulation
2. Suppress console errors in tests
3. Test error recovery flows
4. Verify error isolation

## Production Considerations

1. **Error Monitoring**: Enable external monitoring service
2. **Performance**: Error boundaries add minimal overhead
3. **User Experience**: Always provide clear recovery options
4. **Privacy**: Filter sensitive data before reporting
5. **Rate Limiting**: Implement error reporting throttling

## Troubleshooting

### Common Issues

1. **Error boundary not catching errors**
   - Ensure error occurs during render, not in event handlers
   - Use try-catch for event handlers and async code

2. **Infinite error loops**
   - Error boundary tracks error count
   - Automatically stops catching after 5 errors

3. **Missing error details**
   - Check browser console for full error info
   - Enable development mode for error log viewer

### Debug Commands

```javascript
// View stored errors
const errors = JSON.parse(localStorage.getItem('tankmon-error-log'));
console.table(errors);

// Clear error history
localStorage.removeItem('tankmon-error-log');

// Force error for testing
throw new Error('Test error');
```

## Future Enhancements

1. **Error Analytics Dashboard**
   - Error frequency tracking
   - Error pattern analysis
   - Performance impact metrics

2. **Smart Error Recovery**
   - Automatic retry with backoff
   - Fallback data sources
   - Offline error queue

3. **User Feedback Integration**
   - Error reporting form
   - Screenshot capture
   - Session replay