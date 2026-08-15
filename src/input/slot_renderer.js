const SLOT_TAG = "input-otp-slot"
const GROUP_TAG = "input-otp-group"

// Slots live in the light DOM so they can be styled and composed by hand. When
// the component already contains `<input-otp-slot>` elements — grouped, with
// separators, with whatever classes — those are adopted as-is and only their
// state is painted. Otherwise a flat row is generated.
export default class SlotRenderer {
  providedCount

  #element
  #input
  #slots = []
  #generatedGroup = null

  constructor(element, input) {
    this.#element = element
    this.#input = input
    this.providedCount = this.#findProvided().length
  }

  build(maxLength) {
    // A slot paints itself, so it has to be upgraded before it is used, and the
    // order the parser reaches the two definitions does not guarantee that.
    customElements.upgrade(this.#element)

    if (this.providedCount > 0) {
      this.#slots = this.#findProvided()
    } else {
      this.#generate(maxLength)
    }
  }

  update(states, renderSlot) {
    this.#slots.forEach((slot, index) => {
      const state = states[index]
      if (!state) return

      if (renderSlot) {
        renderSlot(slot, state)
      } else {
        slot.update(state)
      }
    })
  }

  get elements() {
    return [ ...this.#slots ]
  }

  #findProvided() {
    return Array.from(this.#element.querySelectorAll(SLOT_TAG))
  }

  #generate(maxLength) {
    this.#generatedGroup?.remove()

    const group = document.createElement(GROUP_TAG)
    this.#slots = Array.from({ length: maxLength }, () => group.appendChild(document.createElement(SLOT_TAG)))

    this.#element.insertBefore(group, this.#input)
    this.#generatedGroup = group
  }
}
