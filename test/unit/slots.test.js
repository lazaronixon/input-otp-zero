import { computeSlots } from "src/input/slots"
import { describe, expect, test } from "vitest"

function compute(overrides) {
  return computeSlots({
    value: "",
    maxLength: 4,
    placeholder: null,
    selectionStart: null,
    selectionEnd: null,
    isFocused: false,
    ...overrides
  })
}

describe("computeSlots", () => {
  test("produces one slot per character of capacity", () => {
    expect(compute({ maxLength: 6 })).toHaveLength(6)
  })

  test("assigns the value characters and leaves the rest empty", () => {
    const slots = compute({ value: "12" })

    expect(slots.map(slot => slot.char)).toEqual([ "1", "2", null, null ])
  })

  test("shows placeholder characters only while the value is empty", () => {
    expect(compute({ placeholder: "----" }).map(slot => slot.placeholderChar)).toEqual([ "-", "-", "-", "-" ])
    expect(compute({ value: "1", placeholder: "----" }).map(slot => slot.placeholderChar)).toEqual([ null, null, null, null ])
  })

  test("marks the caret slot active when a collapsed selection sits on it", () => {
    const slots = compute({ value: "12", selectionStart: 2, selectionEnd: 2, isFocused: true })

    expect(slots.map(slot => slot.isActive)).toEqual([ false, false, true, false ])
  })

  test("marks every slot inside a range selection active", () => {
    const slots = compute({ value: "1234", selectionStart: 1, selectionEnd: 3, isFocused: true })

    expect(slots.map(slot => slot.isActive)).toEqual([ false, true, true, false ])
  })

  test("never marks a slot active while blurred", () => {
    const slots = compute({ value: "12", selectionStart: 2, selectionEnd: 2, isFocused: false })

    expect(slots.some(slot => slot.isActive)).toBe(false)
  })

  test("draws the fake caret only on an active, empty slot", () => {
    const empty = compute({ value: "12", selectionStart: 2, selectionEnd: 2, isFocused: true })
    expect(empty[2].hasFakeCaret).toBe(true)

    const filled = compute({ value: "1234", selectionStart: 1, selectionEnd: 2, isFocused: true })
    expect(filled[1].hasFakeCaret).toBe(false)
  })
})
