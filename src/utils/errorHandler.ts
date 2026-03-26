/**
 * Centralized Error Handling Utility for APAS
 *
 * Provides consistent error handling patterns across the application.
 * All error handling should go through these utilities instead of
 * using raw try/catch with console.error or silent swallows.
 */

export enum ErrorSeverity {
  /** Informational — no action needed */
  INFO = 'info',
  /** Something unexpected happened but the app can continue */
  WARNING = 'warning',
  /** A feature failed; user should be informed */
  ERROR = 'error',
  /** The app is in an unrecoverable state */
  CRITICAL = 'critical',
}

export interface AppError {
  message: string;
  severity: ErrorSeverity;
  context?: string;
  originalError?: unknown;
  timestamp: number;
}

type ErrorListener = (error: AppError) => void;

const listeners: ErrorListener[] = [];

/**
 * Subscribe to application errors. Returns an unsubscribe function.
 */
export function onError(listener: ErrorListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notify(error: AppError): void {
  for (const listener of listeners) {
    try {
      listener(error);
    } catch {
      // Prevent listener errors from breaking the error pipeline
    }
  }
}

/**
 * Log and broadcast an application error.
 */
export function handleError(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context?: string,
  originalError?: unknown
): AppError {
  const appError: AppError = {
    message,
    severity,
    context,
    originalError,
    timestamp: Date.now(),
  };

  const prefix = context ? `[${context}]` : '[APAS]';

  switch (severity) {
    case ErrorSeverity.INFO:
      console.info(`${prefix} ${message}`);
      break;
    case ErrorSeverity.WARNING:
      console.warn(`${prefix} ${message}`);
      break;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      console.error(`${prefix} ${message}`, originalError ?? '');
      break;
  }

  notify(appError);
  return appError;
}

/**
 * Wrap an async operation with consistent error handling.
 * Returns [result, null] on success or [null, AppError] on failure.
 */
export async function trySafe<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<[T, null] | [null, AppError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const appError = handleError(message, ErrorSeverity.ERROR, context, err);
    return [null, appError];
  }
}

/**
 * Wrap a synchronous operation with consistent error handling.
 * Returns [result, null] on success or [null, AppError] on failure.
 */
export function trySafeSync<T>(
  fn: () => T,
  context?: string
): [T, null] | [null, AppError] {
  try {
    const result = fn();
    return [result, null];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const appError = handleError(message, ErrorSeverity.ERROR, context, err);
    return [null, appError];
  }
}

/**
 * Extract a human-readable message from any thrown value.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
