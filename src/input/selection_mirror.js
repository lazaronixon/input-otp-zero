// A caret sitting between two characters belongs to no slot, so every selection
// change is rewritten into a one-character range — except at the append
// position, where a bare caret is the only meaningful state. The mirrored
// `start`/`end` are what the slots are painted from.
export default class SelectionMirror {
  start = null
  end = null

  #input
  #onUpdate
  #previous
  #sync

  constructor(input, onUpdate) {
    this.#input = input
    this.#onUpdate = onUpdate
    this.#previous = [ input.selectionStart, input.selectionEnd, input.selectionDirection ]
    this.#sync = () => this.sync()
  }

  observe() {
    document.addEventListener("selectionchange", this.#sync, { capture: true })
    this.sync()
  }

  disconnect() {
    document.removeEventListener("selectionchange", this.#sync, { capture: true })
  }

  set(start, end, direction = "none") {
    this.#commit(start, end, direction)
  }

  sync() {
    const input = this.#input

    if (document.activeElement !== input) {
      this.#commit(null, null, "none")
      return
    }

    const selectionStart = input.selectionStart
    const selectionEnd = input.selectionEnd
    const value = input.value
    const maxLength = input.maxLength

    let start = -1
    let end = -1
    let direction

    if (value.length !== 0 && selectionStart !== null && selectionEnd !== null) {
      const isSingleCaret = selectionStart === selectionEnd
      const isInsertMode = selectionStart === value.length && value.length < maxLength

      if (isSingleCaret && !isInsertMode) {
        const caret = selectionStart

        if (caret === 0) {
          start = 0
          end = 1
          direction = "forward"
        } else if (caret === maxLength) {
          start = caret - 1
          end = caret
          direction = "backward"
        } else if (maxLength > 1 && value.length > 1) {
          const [ previousStart, previousEnd ] = this.#previous
          let offset = 0

          if (previousStart !== null && previousEnd !== null) {
            if (caret < previousEnd) {
              direction = "backward"
            } else {
              direction = "forward"
            }

            const wasPreviouslyInserting = previousStart === previousEnd && previousStart < maxLength
            if (direction === "backward" && !wasPreviouslyInserting) offset = -1
          }

          start = offset + caret
          end = offset + caret + 1
        }
      }

      if (start !== -1 && end !== -1 && start !== end) {
        input.setSelectionRange(start, end, direction)
      }
    }

    let mirroredStart = selectionStart
    let mirroredEnd = selectionEnd
    if (start !== -1) mirroredStart = start
    if (end !== -1) mirroredEnd = end

    this.#commit(mirroredStart, mirroredEnd, direction ?? input.selectionDirection)
  }

  #commit(start, end, direction) {
    const changed = this.start !== start || this.end !== end

    this.start = start
    this.end = end
    this.#previous = [ start, end, direction ]

    if (changed) this.#onUpdate()
  }
}
