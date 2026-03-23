/**
 * Platform detection utilities for APAS
 * Detects whether the app is running inside the Android APK (Capacitor WebView)
 * or in a regular mobile/desktop browser.
 */

/** Check if running inside the Capacitor Android WebView (APK mode) */
export function isApkMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Capacitor injects a native bridge object
  const win = window as Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
  if (win.Capacitor?.isNativePlatform?.()) return true;
  if (win.Capacitor?.getPlatform?.() === 'android') return true;

  // Fallback: check user agent for APAS Android WebView marker
  if (navigator.userAgent.includes('APASAndroidApp')) return true;

  return false;
}

/** Check if the device is a mobile device (regardless of APK or browser) */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
}

/** Get the current platform identifier */
export function getPlatform(): 'apk' | 'mobile-browser' | 'desktop' {
  if (isApkMode()) return 'apk';
  if (isMobileDevice()) return 'mobile-browser';
  return 'desktop';
}
