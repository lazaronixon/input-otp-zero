// Browsers settle the selection, the autofill state and the composed value at
// different moments after a value change, and none of them is observable. The
// staggered retries cover fast and slow machines alike.
export function syncTimeouts(callback) {
  return [ setTimeout(callback, 0), setTimeout(callback, 10), setTimeout(callback, 50) ]
}

export function clearTimeouts(timeouts) {
  timeouts.forEach(timeout => clearTimeout(timeout))
  timeouts.length = 0
}
