// Slots live in the light DOM so they can be styled and composed by hand. When
// the host already contains `[data-input-otp-slot]` elements — grouped, with
// separators, with whatever classes — those are adopted as-is and only their
// state is painted. Otherwise a flat row is generated.
export default class SlotRenderer {
  providedCount

  #element
  #input
  #slots = []
  #generatedContainer = null

  constructor(element, input) {
    this.#element = element
    this.#input = input
    this.providedCount = this.#findProvided().length
  }

  build(maxLength) {
    if (this.providedCount > 0) {
      this.#slots = this.#findProvided()
    } else {
      this.#generate(maxLength)
    }

    this.#slots.forEach(slot => this.#prepare(slot))
  }

  update(states, renderSlot) {
    this.#slots.forEach((slot, index) => {
      const state = states[index]
      if (!state) return

      if (renderSlot) {
        renderSlot(slot, state)
      } else {
        this.#paint(slot, state)
      }
    })
  }

  get elements() {
    return [ ...this.#slots ]
  }

  #findProvided() {
    return Array.from(this.#element.querySelectorAll("[data-input-otp-slot]"))
  }

  #generate(maxLength) {
    this.#generatedContainer?.remove()

    const container = document.createElement("div")
    container.setAttribute("data-input-otp-slots", "")

    this.#slots = Array.from({ length: maxLength }, () => {
      const slot = document.createElement("div")
      slot.setAttribute("data-input-otp-slot", "")
      container.appendChild(slot)
      return slot
    })

    this.#element.insertBefore(container, this.#input)
    this.#generatedContainer = container
  }

  // Both children are guaranteed here rather than in `#generate` so that
  // hand-written slot markup gets them too without having to spell them out.
  #prepare(slot) {
    if (!slot.querySelector("[data-input-otp-char]")) {
      const char = document.createElement("span")
      char.setAttribute("data-input-otp-char", "")
      char.setAttribute("aria-hidden", "true")
      slot.appendChild(char)
    }

    if (!slot.querySelector("[data-input-otp-caret]")) {
      const caret = document.createElement("span")
      caret.setAttribute("data-input-otp-caret", "")
      caret.setAttribute("aria-hidden", "true")
      slot.appendChild(caret)
    }
  }

  #paint(slot, state) {
    const char = slot.querySelector("[data-input-otp-char]")
    const caret = slot.querySelector("[data-input-otp-caret]")

    let text = ""
    if (state.char !== null) {
      text = state.char
    } else if (state.placeholderChar !== null) {
      text = state.placeholderChar
    }

    if (char.textContent !== text) char.textContent = text

    toggle(slot, "data-active", state.isActive)
    toggle(slot, "data-filled", state.char !== null)
    toggle(slot, "data-placeholder", state.char === null && state.placeholderChar !== null)
    toggle(caret, "data-visible", state.hasFakeCaret)
  }
}

function toggle(element, attribute, present) {
  if (present) {
    element.setAttribute(attribute, "")
  } else {
    element.removeAttribute(attribute)
  }
}
