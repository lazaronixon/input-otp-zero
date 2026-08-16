import IosTextReveal from "../input/ios_text_reveal"
import PasswordManagerBadge, { BADGE_SPACE_WIDTH } from "../input/password_manager_badge"
import SelectionMirror from "../input/selection_mirror"
import SlotRenderer from "../input/slot_renderer"
import { ListenerBin } from "../helpers/listener_helper"
import { clearTimeouts, syncTimeouts } from "../helpers/timing_helper"
import { computeSlots } from "../input/slots"
import { installStyles } from "../input/styles"
import { isIOS } from "../helpers/platform_helper"
import { resolvePattern } from "../patterns"

const DEFAULT_MAX_LENGTH = 6

export default class InputOtpElement extends HTMLElement {
  static observedAttributes = [
    "value", "maxlength", "pattern", "placeholder", "disabled",
    "required", "text-align", "inputmode", "name", "autocomplete"
  ]

  pasteTransformer = null
  renderSlot = null

  #input = null
  #renderer = null
  #selection = null
  #badge = null
  #iosTextReveal = null
  #listeners = new ListenerBin()
  #resizeObserver = null
  #pendingSyncs = []
  #previousValue = ""
  #isFocused = false
  #isHovering = false
  #upgraded = false

  connectedCallback() {
    if (this.#upgraded) return
    this.#upgraded = true

    installStyles(this.getAttribute("nonce"))

    // Chrome's translation feature rewrites the slots' text nodes, and a
    // one-time code is never meaningful to translate.
    this.setAttribute("translate", "no")

    this.#adoptInput()
    this.#renderer = new SlotRenderer(this, this.#input)
    this.#warnAboutSlotCountMismatch()
    this.#renderer.build(this.maxLength)
    this.#applyAttributes()

    this.#previousValue = this.#input.value
    this.#selection = new SelectionMirror(this.#input, () => this.#render())
    this.#badge = new PasswordManagerBadge(this, () => this.#applyBadgeSpace())
    if (isIOS()) this.#iosTextReveal = new IosTextReveal(this.#input)

    this.#listenForEvents()
    this.#observeSize()
    this.#selection.observe()
    this.#badge.start(this.pushPasswordManagerStrategy)
    this.#iosTextReveal?.start()

    this.#isFocused = document.activeElement === this.#input
    if (this.#isFocused) this.#badge.trackWhileFocused()

    this.#render()
    this.#scheduleSync()

    // `autofocus` only acts on elements the parser knows about, and the inner
    // input is created too late for that.
    if (this.hasAttribute("autofocus")) this.focus()
  }

  disconnectedCallback() {
    this.#upgraded = false

    this.#listeners.dispose()
    this.#selection?.disconnect()
    this.#badge?.stop()
    this.#iosTextReveal?.stop()
    this.#resizeObserver?.disconnect()
    clearTimeouts(this.#pendingSyncs)
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#upgraded || oldValue === newValue) return

    if (name === "maxlength") {
      this.#renderer.build(this.maxLength)
      this.#applyAttributes()
      this.value = this.value.slice(0, this.maxLength)
    } else if (name === "value") {
      this.value = newValue ?? ""
    } else {
      this.#applyAttributes()
    }

    this.#render()
  }

  get value() {
    if (this.#input) return this.#input.value
    return this.getAttribute("value") ?? ""
  }

  set value(newValue) {
    const normalized = String(newValue ?? "").slice(0, this.maxLength)

    if (!this.#input) {
      this.setAttribute("value", normalized)
      return
    }

    if (this.#input.value === normalized) return

    this.#input.value = normalized
    this.#commit(normalized)
  }

  get maxLength() {
    if (this.#renderer?.providedCount) return this.#renderer.providedCount

    const attribute = Number(this.getAttribute("maxlength"))
    if (Number.isFinite(attribute) && attribute > 0) return Math.floor(attribute)

    return DEFAULT_MAX_LENGTH
  }

  set maxLength(newValue) {
    this.setAttribute("maxlength", String(newValue))
  }

  get pattern() {
    return this.getAttribute("pattern")
  }

  set pattern(newValue) {
    this.setAttribute("pattern", newValue)
  }

  get placeholder() {
    return this.getAttribute("placeholder")
  }

  set placeholder(newValue) {
    this.setAttribute("placeholder", newValue)
  }

  get disabled() {
    return this.hasAttribute("disabled")
  }

  set disabled(newValue) {
    this.toggleAttribute("disabled", Boolean(newValue))
  }

  get pushPasswordManagerStrategy() {
    return this.getAttribute("push-password-manager-strategy") ?? "increase-width"
  }

  get input() {
    return this.#input
  }

  get slots() {
    return this.#slotStates()
  }

  get isComplete() {
    return this.value.length === this.maxLength
  }

  focus(options) {
    this.#input?.focus(options)
  }

  blur() {
    this.#input?.blur()
  }

  select() {
    this.#input?.setSelectionRange(0, this.value.length)
    this.#selection?.sync()
  }

  clear() {
    this.value = ""
  }

  #adoptInput() {
    this.#input = this.querySelector("input") ?? document.createElement("input")
    // The input is always the last child so that a password manager badge — a
    // sibling injected right after it — lands outside the slots.
    this.appendChild(this.#input)
  }

  #warnAboutSlotCountMismatch() {
    const declared = Number(this.getAttribute("maxlength"))
    const provided = this.#renderer.providedCount

    if (provided > 0 && declared > 0 && declared !== provided) {
      console.warn(`input-otp-zero: maxlength is ${declared} but ${provided} slots were provided. Using the provided slots.`)
    }
  }

  #applyAttributes() {
    const input = this.#input

    input.setAttribute("data-input-otp", "")
    input.type = "text"
    input.maxLength = this.maxLength
    input.disabled = this.disabled
    input.required = this.hasAttribute("required")
    input.spellcheck = false
    input.autocomplete = this.getAttribute("autocomplete") ?? "one-time-code"
    input.inputMode = this.getAttribute("inputmode") ?? "numeric"
    input.style.textAlign = this.getAttribute("text-align") ?? "left"

    if (this.hasAttribute("name")) input.name = this.getAttribute("name")
    if (this.hasAttribute("value") && input.value === "") input.value = this.getAttribute("value")

    const placeholder = this.placeholder
    if (placeholder) {
      input.setAttribute("aria-placeholder", placeholder)
    } else {
      input.removeAttribute("aria-placeholder")
    }

    const pattern = resolvePattern(this.pattern)
    if (pattern) {
      input.setAttribute("pattern", pattern.source)
    } else {
      input.removeAttribute("pattern")
    }
  }

  #listenForEvents() {
    const input = this.#input

    this.#listeners.listen(input, "input", () => this.#didReceiveInput())
    this.#listeners.listen(input, "paste", event => this.#didPaste(event))
    this.#listeners.listen(input, "focus", () => this.#didFocus())
    this.#listeners.listen(input, "blur", () => this.#didBlur())
    this.#listeners.listen(input, "mouseover", () => this.#setHovering(true))
    this.#listeners.listen(input, "mouseleave", () => this.#setHovering(false))
  }

  // Measured on the component, not the input: on iOS the input's layout box is
  // enlarged 10x while the component keeps the true size.
  #observeSize() {
    const updateRootHeight = () => {
      this.style.setProperty("--input-otp-root-height", `${this.clientHeight}px`)
    }

    updateRootHeight()

    // Missing in older browsers; without it the height is still measured once.
    if (typeof ResizeObserver === "undefined") return

    this.#resizeObserver = new ResizeObserver(updateRootHeight)
    this.#resizeObserver.observe(this)
  }

  #didReceiveInput() {
    const input = this.#input
    const newValue = input.value.slice(0, this.maxLength)
    const pattern = resolvePattern(this.pattern)

    if (newValue.length > 0 && pattern && !pattern.test(newValue)) {
      this.#reject()
      return
    }

    if (input.value !== newValue) input.value = newValue
    if (newValue === this.#previousValue) return

    // Cutting and deleting text does not fire `selectionchange`, so the slots
    // would keep painting a stale caret without this.
    if (newValue.length < this.#previousValue.length) {
      document.dispatchEvent(new Event("selectionchange"))
    }

    this.#commit(newValue)
  }

  #reject() {
    const input = this.#input
    const { start, end } = this.#selection

    input.value = this.#previousValue
    if (start !== null && end !== null) input.setSelectionRange(start, end)

    this.#render()
  }

  #didFocus() {
    const input = this.#input
    const start = Math.min(input.value.length, this.maxLength - 1)
    const end = input.value.length

    input.setSelectionRange(start, end)
    this.#selection.set(start, end)

    this.#isFocused = true
    this.#badge.trackWhileFocused()
    this.#render()
    this.#scheduleSync()
  }

  #didBlur() {
    this.#isFocused = false
    this.#badge.stopTracking()
    this.#render()
  }

  // Safari on iOS refuses to paste into a field it considers invisible, and a
  // `pasteTransformer` needs the raw clipboard text either way — so the insert
  // is performed by hand in both cases.
  #didPaste(event) {
    const input = this.#input
    if (!this.pasteTransformer && (!isIOS() || !event.clipboardData)) return

    const pasted = event.clipboardData.getData("text/plain")
    let content = pasted
    if (this.pasteTransformer) content = this.pasteTransformer(pasted)

    event.preventDefault()

    const start = input.selectionStart
    const end = input.selectionEnd
    const value = input.value
    const maxLength = this.maxLength

    let combined
    if (start !== end) {
      combined = value.slice(0, start) + content + value.slice(end)
    } else {
      combined = value.slice(0, start) + content + value.slice(start)
    }

    const newValue = combined.slice(0, maxLength)
    const pattern = resolvePattern(this.pattern)
    if (newValue.length > 0 && pattern && !pattern.test(newValue)) return

    input.value = newValue

    const caretStart = Math.min(newValue.length, maxLength - 1)
    input.setSelectionRange(caretStart, newValue.length)
    this.#selection.set(caretStart, newValue.length)

    this.#commit(newValue)
  }

  #setHovering(isHovering) {
    this.#isHovering = isHovering
    this.#render()
  }

  #commit(newValue) {
    const previousValue = this.#previousValue
    this.#previousValue = newValue

    // A full field leaves the caret collapsed past the last slot, and the input
    // is at its maxlength there — so every further keystroke is dropped by the
    // browser until the selection is widened back onto a slot. The scheduled
    // syncs below do that too, but they are a timer: typing faster than they
    // fire would swallow characters.
    this.#selection.sync()

    this.#render()
    this.dispatchEvent(new CustomEvent("input-otp:change", { detail: { value: newValue }, bubbles: true }))

    const justCompleted = previousValue.length < this.maxLength && newValue.length === this.maxLength
    if (justCompleted) {
      this.dispatchEvent(new CustomEvent("input-otp:complete", { detail: { value: newValue }, bubbles: true }))
    }

    this.#scheduleSync()
  }

  // Browsers do not report when they are done applying an autofill or settling
  // a selection, so the state is re-read a few times right after a change.
  #scheduleSync() {
    clearTimeouts(this.#pendingSyncs)

    this.#pendingSyncs = syncTimeouts(() => {
      // Shakes off the `:autofill` state, which paints its own background.
      this.#input.dispatchEvent(new Event("input"))
      this.#selection.sync()
    })
  }

  #applyBadgeSpace() {
    const input = this.#input

    if (this.#badge.willPush) {
      input.style.width = `calc(100% + ${BADGE_SPACE_WIDTH})`
      input.style.clipPath = `inset(0 ${BADGE_SPACE_WIDTH} 0 0)`
    } else {
      input.style.width = ""
      input.style.clipPath = ""
    }
  }

  #slotStates() {
    return computeSlots({
      value: this.value,
      maxLength: this.maxLength,
      placeholder: this.placeholder,
      selectionStart: this.#selection?.start ?? null,
      selectionEnd: this.#selection?.end ?? null,
      isFocused: this.#isFocused
    })
  }

  #render() {
    if (!this.#upgraded) return

    const states = this.#slotStates()
    this.#renderer.update(states, this.renderSlot)

    this.toggleAttribute("data-focused", this.#isFocused)
    this.toggleAttribute("data-hovering", this.#isHovering && !this.disabled)
    this.toggleAttribute("data-disabled", this.disabled)
    this.toggleAttribute("data-complete", this.isComplete)
    this.toggleAttribute("data-empty", this.value.length === 0)

    this.dispatchEvent(new CustomEvent("input-otp:render", { detail: { slots: states } }))
  }
}
