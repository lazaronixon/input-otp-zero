import { ListenerBin } from "../helpers/listener_helper"

// Failsafe: only fires when a gesture is interrupted before `pointerup`.
// Generous on purpose — a normal interaction ends by typing, blur or scroll long
// before this, and being late here is harmless while being early can dismiss the
// native edit menu.
const BACKSTOP_MS = 5000

// On iOS the input's text is parked offscreen (see `native_styles.js`) so the
// native selection artifact is never visible at rest. The copy/paste menu,
// however, only appears when the tap lands near an on-screen caret rect — so the
// text is revealed while the user is interacting and hidden again afterwards.
//
// Hiding is event-driven rather than timed: the edit menu tracks its anchor rect
// while it presents, so a timer racing that animation can dismiss the menu.
// Instead we hide on the events that actually mean "the interaction is over" —
// typing, blur, scroll — and keep a long backstop purely so an interrupted
// gesture can't leave the text revealed indefinitely.
export default class IosTextReveal {
  #input
  #listeners = new ListenerBin()
  #isPointerDown = false
  #pointerX = 0
  #backstop

  constructor(input) {
    this.#input = input
  }

  start() {
    const input = this.#input

    this.#listeners.listen(input, "pointerdown", event => this.#didPointerDown(event))
    this.#listeners.listen(input, "pointerup", () => this.#didPointerUp())
    this.#listeners.listen(input, "pointercancel", () => this.#didPointerUp())
    this.#listeners.listen(input, "focus", () => this.#didFocus())
    this.#listeners.listen(input, "input", () => this.#hide())
    this.#listeners.listen(input, "blur", () => this.#hide())
    // Scrolling dismisses the edit menu natively, so it is a reliable
    // end-of-interaction signal.
    this.#listeners.listen(window, "scroll", () => this.#hide(), { capture: true, passive: true })
  }

  stop() {
    clearTimeout(this.#backstop)
    this.#listeners.dispose()
  }

  #didPointerDown(event) {
    this.#isPointerDown = true
    this.#pointerX = event.offsetX
    if (document.activeElement === this.#input) this.#reveal()
  }

  #didPointerUp() {
    this.#isPointerDown = false
    this.#armBackstop()
  }

  // Long-press on an unfocused input: focus arrives while the pointer is still
  // down and the menu will anchor on release.
  #didFocus() {
    if (this.#isPointerDown) this.#reveal()
  }

  // The text is revealed at the pointer's x position so the ~2px artifact
  // renders under the fingertip and the edit menu anchors at the touch point.
  // `offsetX` is in the input's pre-transform coordinate space, matching
  // `text-indent`.
  #reveal() {
    this.#input.style.setProperty("text-indent", `${Math.max(0, this.#pointerX)}px`, "important")
    this.#armBackstop()
  }

  #hide() {
    clearTimeout(this.#backstop)
    this.#input.style.removeProperty("text-indent")
  }

  // Armed whenever the text is revealed — not only on pointerup, since iOS's
  // text-interaction gesture recognizer can swallow pointerup entirely, which
  // would leave the text revealed indefinitely.
  #armBackstop() {
    clearTimeout(this.#backstop)
    this.#backstop = setTimeout(() => this.#hide(), BACKSTOP_MS)
  }
}
