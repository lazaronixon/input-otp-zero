const BADGE_MARGIN_RIGHT = 18
const BADGE_SPACE_WIDTH_PX = 40

export const BADGE_SPACE_WIDTH = `${BADGE_SPACE_WIDTH_PX}px`

const BADGE_SELECTORS = [
  "[data-lastpass-icon-root]",
  "com-1password-button",
  "[data-dashlanecreated]",
  "[style$=\"2147483647 !important;\"]"
].join(",")

// Password managers drop a badge over the right edge of a field, which lands on
// top of the last slot. The fix is to widen the input past the component and
// clip the overhang, so the badge anchors outside the slots without any visible
// layout shift — but only when the extra 40px actually fits.
export default class PasswordManagerBadge {
  willPush = false

  #element
  #onChange
  #strategy = "increase-width"
  #hasBadge = false
  #hasSpace = false
  #done = false
  #interval = null
  #timers = []

  constructor(element, onChange) {
    this.#element = element
    this.#onChange = onChange
  }

  start(strategy) {
    this.#strategy = strategy
    if (strategy === "none") return

    this.#measureSpace()
    this.#interval = setInterval(() => this.#measureSpace(), 1000)
  }

  // Badges are injected asynchronously and only once the field matters to the
  // extension, so detection is retried for a few seconds after focus.
  trackWhileFocused() {
    if (this.#strategy === "none" || this.#done) return

    this.stopTracking()
    this.#timers = [
      setTimeout(() => this.#detect(), 0),
      setTimeout(() => this.#detect(), 2000),
      setTimeout(() => this.#detect(), 5000),
      setTimeout(() => { this.#done = true }, 6000)
    ]
  }

  stopTracking() {
    this.#timers.forEach(timer => clearTimeout(timer))
    this.#timers = []
  }

  stop() {
    this.stopTracking()
    clearInterval(this.#interval)
    this.#interval = null
  }

  #detect() {
    if (this.#done) return

    const element = this.#element
    const rect = element.getBoundingClientRect()
    const x = rect.left + element.offsetWidth - BADGE_MARGIN_RIGHT
    const y = rect.top + element.offsetHeight / 2

    if (document.querySelectorAll(BADGE_SELECTORS).length === 0) {
      // Nothing well-known is present, so probe the corner where badges land.
      // Hitting the component itself means there is most likely no badge.
      if (document.elementFromPoint(x, y) === element) return
    }

    // Re-measure before committing: the interval copy can be a second stale and
    // the layout may have changed since, e.g. a validation message appearing.
    this.#measureSpace()
    this.#hasBadge = true
    this.#done = true
    this.#update()
  }

  #measureSpace() {
    const hasSpace = availableSpace(this.#element) >= BADGE_SPACE_WIDTH_PX
    if (hasSpace === this.#hasSpace) return

    this.#hasSpace = hasSpace
    this.#update()
  }

  #update() {
    const willPush = this.#strategy !== "none" && this.#hasBadge && this.#hasSpace
    if (willPush === this.willPush) return

    this.willPush = willPush
    this.#onChange()
  }
}

// The gutter has to fit inside whatever box constrains horizontal overflow
// around the component. Otherwise the overhang either becomes scrollable
// overflow — a scrollbar appears and shifts the whole layout — or gets clipped,
// and some password managers refuse to render a badge anchored in a clipped
// region.
function availableSpace(element) {
  const right = element.getBoundingClientRect().right

  // Start at the component itself: its own overflow also clips the absolutely
  // positioned input inside it.
  let current = element
  while (current) {
    if (getComputedStyle(current).overflowX !== "visible") {
      const rect = current.getBoundingClientRect()
      return rect.left + current.clientLeft + current.clientWidth - right
    }
    current = current.parentElement
  }

  // No constraining ancestor — the viewport is the limit. Unlike
  // `window.innerWidth`, `clientWidth` excludes a vertical scrollbar.
  return document.documentElement.clientWidth - right
}
