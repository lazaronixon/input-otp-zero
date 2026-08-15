const CHAR_TAG = "input-otp-char"
const CARET_TAG = "input-otp-caret"

// A slot paints itself from the state the component hands it. Authored
// attributes are bare (`maxlength`, `pattern`); anything written by the script
// is `data-*`, so it always reads as state rather than configuration.
export default class InputOtpSlotElement extends HTMLElement {
  #char
  #caret

  update({ char, placeholderChar, isActive, hasFakeCaret }) {
    let text = ""
    if (char !== null) {
      text = char
    } else if (placeholderChar !== null) {
      text = placeholderChar
    }

    if (this.char.textContent !== text) this.char.textContent = text

    this.toggleAttribute("data-active", isActive)
    this.toggleAttribute("data-filled", char !== null)
    this.toggleAttribute("data-placeholder", char === null && placeholderChar !== null)
    this.caret.toggleAttribute("data-visible", hasFakeCaret)
  }

  get char() {
    this.#char ??= this.#part(CHAR_TAG)
    return this.#char
  }

  get caret() {
    this.#caret ??= this.#part(CARET_TAG)
    return this.#caret
  }

  // Created on demand rather than required in markup, so an empty
  // `<input-otp-slot></input-otp-slot>` is all anyone has to write.
  #part(tag) {
    const existing = this.querySelector(tag)
    if (existing) return existing

    const element = document.createElement(tag)
    element.setAttribute("aria-hidden", "true")
    this.appendChild(element)

    return element
  }
}
