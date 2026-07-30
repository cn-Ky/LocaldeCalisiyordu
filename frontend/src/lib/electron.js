// Bu proje hem tarayıcıda (web sürümü) hem de Electron içinde (masaüstü
// sürümü) çalışır. `window.electronAPI`, yalnızca Electron'un preload
// betiği tarafından tanımlanır (bkz. electron/preload.cjs). Tarayıcıda bu
// nesne bulunmadığından aşağıdaki yardımcılar sessizce hiçbir şey yapmaz.

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export function minimizeWindow() {
  window.electronAPI?.minimize?.();
}

export function toggleMaximizeWindow() {
  window.electronAPI?.maximize?.();
}

export function closeWindow() {
  window.electronAPI?.close?.();
}

export function notify(title, body) {
  window.electronAPI?.notify?.(title, body);
}

export function setBadge(count) {
  window.electronAPI?.setBadge?.(count);
}

// callback(isMaximized) çağrılır; abonelikten çıkmak için dönen fonksiyonu kullan.
export function onMaximizedChange(callback) {
  if (!window.electronAPI?.onMaximizedChange) return () => {};
  return window.electronAPI.onMaximizedChange(callback);
}
