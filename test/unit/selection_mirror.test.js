import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import SelectionMirror from "src/input/selection_mirror"

let input
let mirror
let onUpdate

beforeEach(() => {
  document.body.innerHTML = "<input>"
  input = document.querySelector("input")
})

afterEach(() => {
  mirror?.disconnect()
  document.body.innerHTML = ""
})

// The mirror reads the selection it is constructed with as its starting point,
// so the caret is placed before it is built.
function observe({ value = "123456", maxLength = 6, start = 0, end = start } = {}) {
  input.maxLength = maxLength
  input.value = value
  input.focus()
  input.setSelectionRange(start, end)

  onUpdate = vi.fn()
  mirror = new SelectionMirror(input, onUpdate)
  mirror.observe()

  return mirror
}

function moveCaretTo(position) {
  input.setSelectionRange(position, position)
  mirror.sync()
}

function range() {
  return [ mirror.start, mirror.end ]
}

function inputRange() {
  return [ input.selectionStart, input.selectionEnd ]
}

describe("widening a caret onto a slot", () => {
  test("clamps a caret at the start onto the first slot", () => {
    observe({ start: 0 })

    expect(range()).toEqual([ 0, 1 ])
    expect(inputRange()).toEqual([ 0, 1 ])
  })

  test("clamps a caret at the end onto the last slot", () => {
    observe({ start: 6 })

    expect(range()).toEqual([ 5, 6 ])
    expect(inputRange()).toEqual([ 5, 6 ])
  })

  // At the append position a bare caret is the only meaningful state — there is
  // no character under it to select.
  test("keeps a bare caret at the append position", () => {
    observe({ value: "123", start: 3 })

    expect(range()).toEqual([ 3, 3 ])
  })

  test("leaves a range the user drew alone", () => {
    observe({ start: 1, end: 3 })

    expect(range()).toEqual([ 1, 3 ])
    expect(inputRange()).toEqual([ 1, 3 ])
  })

  test("mirrors nothing while the value is empty", () => {
    observe({ value: "", start: 0 })

    expect(range()).toEqual([ 0, 0 ])
  })

  // There is no neighbouring slot to step onto, so the caret is left as it is.
  test("leaves a caret alone in a single-slot field", () => {
    observe({ value: "1", maxLength: 1, start: 1 })

    expect(range()).toEqual([ 0, 1 ])
  })

  test("leaves a caret alone in a single-character value", () => {
    observe({ value: "12", maxLength: 6, start: 2 })
    input.value = "1"

    moveCaretTo(1)

    expect(range()).toEqual([ 1, 1 ])
  })
})

describe("inferring direction", () => {
  // Leaving insert mode is the one backward step that must not shift: the caret
  // already sits after the character the user meant to select.
  test("selects the character before the caret when leaving insert mode", () => {
    observe({ value: "123", start: 3 })

    moveCaretTo(2)

    expect(range()).toEqual([ 2, 3 ])
  })

  test("steps a whole slot left on each further backward move", () => {
    observe({ value: "123", start: 3 })
    moveCaretTo(2)

    moveCaretTo(2)

    expect(range()).toEqual([ 1, 2 ])
  })

  test("steps right without shifting", () => {
    observe({ value: "123456", start: 1, end: 2 })

    moveCaretTo(2)

    expect(range()).toEqual([ 2, 3 ])
  })

  test("hands the direction to the input so the caret keeps travelling", () => {
    observe({ start: 0 })

    expect(input.selectionDirection).toBe("forward")
  })
})

describe("focus", () => {
  test("mirrors nothing while the input is not focused", () => {
    observe({ start: 2 })
    input.blur()

    mirror.sync()

    expect(range()).toEqual([ null, null ])
  })
})

describe("notifying", () => {
  test("reports a selection that moved", () => {
    observe({ value: "123456", start: 1, end: 3 })
    onUpdate.mockClear()

    input.setSelectionRange(2, 4)
    mirror.sync()

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  test("stays quiet when nothing moved", () => {
    observe({ value: "123456", start: 1, end: 3 })
    onUpdate.mockClear()

    mirror.sync()

    expect(onUpdate).not.toHaveBeenCalled()
  })

  test("set() reports the selection it was given", () => {
    observe({ start: 0 })
    onUpdate.mockClear()

    mirror.set(2, 5)

    expect(range()).toEqual([ 2, 5 ])
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })
})

describe("lifecycle", () => {
  test("follows the document's selection changes", () => {
    observe({ value: "123456", start: 1, end: 3 })
    onUpdate.mockClear()

    input.setSelectionRange(0, 2)
    document.dispatchEvent(new Event("selectionchange"))

    expect(range()).toEqual([ 0, 2 ])
  })

  test("stops following once disconnected", () => {
    observe({ value: "123456", start: 1, end: 3 })
    mirror.disconnect()
    onUpdate.mockClear()

    input.setSelectionRange(0, 2)
    document.dispatchEvent(new Event("selectionchange"))

    expect(onUpdate).not.toHaveBeenCalled()
  })
})
