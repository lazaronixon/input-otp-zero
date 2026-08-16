import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import IosTextReveal from "src/input/ios_text_reveal"
import { eventWith } from "./test_helper"

let input
let reveal

beforeEach(() => {
  vi.useFakeTimers()

  document.body.innerHTML = "<input>"
  input = document.querySelector("input")
  reveal = new IosTextReveal(input)
  reveal.start()
})

afterEach(() => {
  reveal.stop()
  document.body.innerHTML = ""
  vi.useRealTimers()
})

function pointerDown(offsetX) {
  input.dispatchEvent(eventWith("pointerdown", { offsetX }))
}

function textIndent() {
  return input.style.textIndent
}

describe("revealing", () => {
  // The text is parked offscreen at rest, and brought back under the fingertip
  // so the native edit menu has an on-screen rect to anchor to.
  test("brings the text back at the pointer while the input is focused", () => {
    input.focus()

    pointerDown(42)

    expect(textIndent()).toBe("42px")
  })

  test("stays hidden when the pointer lands on an unfocused input", () => {
    pointerDown(42)

    expect(textIndent()).toBe("")
  })

  // Long-pressing an unfocused input focuses it while the finger is still down,
  // and the menu anchors on release.
  test("reveals when focus arrives while the pointer is still down", () => {
    pointerDown(30)

    input.dispatchEvent(new Event("focus"))

    expect(textIndent()).toBe("30px")
  })

  test("never indents by a negative amount", () => {
    input.focus()

    pointerDown(-5)

    expect(textIndent()).toBe("0px")
  })
})

describe("hiding", () => {
  beforeEach(() => {
    input.focus()
    pointerDown(42)
  })

  test("hides once the user types", () => {
    input.dispatchEvent(new Event("input"))

    expect(textIndent()).toBe("")
  })

  test("hides on blur", () => {
    input.dispatchEvent(new Event("blur"))

    expect(textIndent()).toBe("")
  })

  // Scrolling dismisses the edit menu natively, so it means the interaction is
  // over.
  test("hides when the page scrolls", () => {
    window.dispatchEvent(new Event("scroll"))

    expect(textIndent()).toBe("")
  })

  // iOS can swallow `pointerup` entirely when its own gesture recogniser takes
  // over, so a cancelled gesture has to arm the backstop just the same.
  test("hides on its own after a cancelled gesture", () => {
    input.dispatchEvent(new Event("pointercancel"))

    vi.advanceTimersByTime(5000)

    expect(textIndent()).toBe("")
  })

  test("hides on its own if the gesture is never finished", () => {
    input.dispatchEvent(new Event("pointerup"))

    vi.advanceTimersByTime(5000)

    expect(textIndent()).toBe("")
  })

  test("stays revealed until the backstop is reached", () => {
    input.dispatchEvent(new Event("pointerup"))

    vi.advanceTimersByTime(4999)

    expect(textIndent()).toBe("42px")
  })
})

describe("stop", () => {
  test("stops responding to pointers", () => {
    input.focus()

    reveal.stop()
    pointerDown(42)

    expect(textIndent()).toBe("")
  })

  test("cancels a pending backstop", () => {
    input.focus()
    pointerDown(42)

    reveal.stop()
    vi.advanceTimersByTime(5000)

    // The teardown leaves the text as it was; it just stops the timer from
    // touching an input the component no longer owns.
    expect(textIndent()).toBe("42px")
  })
})
