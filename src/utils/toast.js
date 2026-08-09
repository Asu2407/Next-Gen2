/**
 * Lightweight global toast pub-sub.
 * Replaces raw alert() calls so error/success messages match the app's
 * dark control-room theme instead of an OS-native popup breaking the
 * demo flow. Mounted once via <ToastHost /> in App.jsx.
 */

let listeners = []

export function showToast(message, type = 'error') {
  const toast = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, type }
  listeners.forEach(fn => fn(toast))
}

export function subscribeToast(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
