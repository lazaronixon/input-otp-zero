import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { backspace, mount, paste, setSelection, slotState, type, unmount } from "./test_helper"

afterEach(() => {
  unmount()
  vi.useRealTimers()
})

describe("rendering", () => {
  test("renders one slot per character and an invisible input", () => {
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")

    expect(element.querySelectorAll("[data-input-otp-slot]")).toHaveLength(6)
    expect(element.input).toBeInstanceOf(HTMLInputElement)
    expect(element.input.maxLength).toBe(6)
    expect(element.input.hasAttribute("data-input-otp")).toBe(true)
  })

  test("defaults to six slots", () => {
    const element = mount("<input-otp></input-otp>")

    expect(element.maxLength).toBe(6)
    expect(element.querySelectorAll("[data-input-otp-slot]")).toHaveLength(6)
  })

  test("gives every slot a character and a caret element", () => {
    const element = mount("<input-otp maxlength=\"2\"></input-otp>")

    element.querySelectorAll("[data-input-otp-slot]").forEach(slot => {
      expect(slot.querySelector("[data-input-otp-char]")).not.toBeNull()
      expect(slot.querySelector("[data-input-otp-caret]")).not.toBeNull()
    })
  })

  test("keeps the input as the last child so a badge lands outside the slots", () => {
    const element = mount("<input-otp maxlength=\"3\"><input name=\"code\"></input-otp>")

    expect(element.lastElementChild).toBe(element.input)
    expect(element.input.name).toBe("code")
  })

  test("adopts hand-written slot markup instead of generating its own", () => {
    const element = mount(`
      <input-otp>
        <div data-input-otp-group>
          <div data-input-otp-slot class="mine"></div>
          <div data-input-otp-slot class="mine"></div>
        </div>
        <div data-input-otp-separator></div>
        <div data-input-otp-group>
          <div data-input-otp-slot class="mine"></div>
          <div data-input-otp-slot class="mine"></div>
        </div>
      </input-otp>
    `)

    const slots = element.querySelectorAll("[data-input-otp-slot]")
    expect(slots).toHaveLength(4)
    expect(element.maxLength).toBe(4)
    expect(element.querySelector("[data-input-otp-slots]")).toBeNull()
    slots.forEach(slot => expect(slot.classList.contains("mine")).toBe(true))
  })

  test("warns when maxlength disagrees with the provided slots", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    mount("<input-otp maxlength=\"6\"><div data-input-otp-slot></div></input-otp>")

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("maxlength is 6 but 1 slots were provided"))
    warn.mockRestore()
  })

  test("rebuilds the slots when maxlength changes", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    element.value = "1234"

    element.setAttribute("maxlength", "2")

    expect(element.querySelectorAll("[data-input-otp-slot]")).toHaveLength(2)
    expect(element.value).toBe("12")
    expect(element.input.maxLength).toBe(2)
  })
})

describe("attributes", () => {
  test("configures the input for one-time codes by default", () => {
    const element = mount("<input-otp></input-otp>")

    expect(element.input.autocomplete).toBe("one-time-code")
    expect(element.input.inputMode).toBe("numeric")
    expect(element.input.spellcheck).toBe(false)
    expect(element.input.type).toBe("text")
  })

  test("forwards name, inputmode, autocomplete and required to the input", () => {
    const element = mount("<input-otp name=\"otp\" inputmode=\"text\" autocomplete=\"off\" required></input-otp>")

    expect(element.input.name).toBe("otp")
    expect(element.input.inputMode).toBe("text")
    expect(element.input.autocomplete).toBe("off")
    expect(element.input.required).toBe(true)
  })

  test("mirrors the pattern onto the input and exposes it as a placeholder hint", () => {
    const element = mount("<input-otp pattern=\"digits\" placeholder=\"------\"></input-otp>")

    expect(element.input.getAttribute("pattern")).toBe("^\\d+$")
    expect(element.input.getAttribute("aria-placeholder")).toBe("------")
  })

  test("seeds the value from the attribute", () => {
    const element = mount("<input-otp value=\"123\"></input-otp>")

    expect(element.value).toBe("123")
    expect(element.input.value).toBe("123")
    expect(slotState(element).map(slot => slot.char)).toEqual([ "1", "2", "3", "", "", "" ])
  })

  test("disables the inner input and flags the host", () => {
    const element = mount("<input-otp disabled></input-otp>")

    expect(element.input.disabled).toBe(true)
    expect(element.hasAttribute("data-disabled")).toBe(true)
  })

  test("aligns the text of the invisible input", () => {
    const element = mount("<input-otp text-align=\"center\"></input-otp>")

    expect(element.input.style.textAlign).toBe("center")
  })

  test("opts the slots out of machine translation", () => {
    const element = mount("<input-otp></input-otp>")

    expect(element.getAttribute("translate")).toBe("no")
  })

  test("takes focus on autofocus, which the parser cannot do for a late input", () => {
    const element = mount("<input-otp autofocus></input-otp>")

    expect(document.activeElement).toBe(element.input)
  })
})

describe("custom painting", () => {
  test("hands each slot to renderSlot instead of painting it", () => {
    document.body.innerHTML = "<input-otp maxlength=\"3\"></input-otp>"
    const element = document.querySelector("input-otp")
    element.renderSlot = (slot, state) => {
      slot.textContent = state.char ?? "."
      slot.toggleAttribute("data-mine", state.isActive)
    }

    element.value = "12"

    const slots = Array.from(element.querySelectorAll("[data-input-otp-slot]"))
    expect(slots.map(slot => slot.textContent)).toEqual([ "1", "2", "." ])
  })

  test("exposes the slot state as data", () => {
    const element = mount("<input-otp maxlength=\"3\" value=\"1\"></input-otp>")

    expect(element.slots).toEqual([
      { index: 0, char: "1", placeholderChar: null, isActive: false, hasFakeCaret: false },
      { index: 1, char: null, placeholderChar: null, isActive: false, hasFakeCaret: false },
      { index: 2, char: null, placeholderChar: null, isActive: false, hasFakeCaret: false }
    ])
  })
})

describe("value", () => {
  test("reflects typed characters into the slots", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")

    type(element, "12")

    expect(element.value).toBe("12")
    expect(slotState(element).map(slot => slot.char)).toEqual([ "1", "2", "", "" ])
    expect(slotState(element).map(slot => slot.isFilled)).toEqual([ true, true, false, false ])
  })

  test("caps the value at the slot count", () => {
    const element = mount("<input-otp maxlength=\"3\"></input-otp>")

    element.value = "123456"

    expect(element.value).toBe("123")
  })

  test("removes characters on backspace", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    type(element, "123")

    backspace(element)

    expect(element.value).toBe("12")
  })

  test("clear() empties the field", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")

    element.clear()

    expect(element.value).toBe("")
    expect(element.hasAttribute("data-empty")).toBe(true)
  })

  test("flags completeness on the host", () => {
    const element = mount("<input-otp maxlength=\"3\"></input-otp>")
    expect(element.hasAttribute("data-complete")).toBe(false)

    element.value = "123"

    expect(element.isComplete).toBe(true)
    expect(element.hasAttribute("data-complete")).toBe(true)
  })

  test("shows placeholder characters until the first character is typed", () => {
    const element = mount("<input-otp maxlength=\"3\" placeholder=\"abc\"></input-otp>")

    expect(slotState(element).map(slot => slot.char)).toEqual([ "a", "b", "c" ])
    expect(slotState(element).map(slot => slot.isPlaceholder)).toEqual([ true, true, true ])

    type(element, "1")

    expect(slotState(element).map(slot => slot.char)).toEqual([ "1", "", "" ])
    expect(slotState(element).every(slot => !slot.isPlaceholder)).toBe(true)
  })
})

describe("pattern", () => {
  test("rejects a change that does not match", () => {
    const element = mount("<input-otp maxlength=\"4\" pattern=\"digits\"></input-otp>")
    type(element, "12")

    type(element, "a")

    expect(element.value).toBe("12")
  })

  test("accepts a change that matches", () => {
    const element = mount("<input-otp maxlength=\"4\" pattern=\"digits\"></input-otp>")

    type(element, "1234")

    expect(element.value).toBe("1234")
  })

  test("always allows emptying the field", () => {
    const element = mount("<input-otp maxlength=\"4\" pattern=\"digits\" value=\"12\"></input-otp>")

    backspace(element)
    backspace(element)

    expect(element.value).toBe("")
  })
})

describe("events", () => {
  test("fires input-otp:change with the new value", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    const changes = []
    element.addEventListener("input-otp:change", event => changes.push(event.detail.value))

    type(element, "1")
    type(element, "2")

    expect(changes).toEqual([ "1", "12" ])
  })

  test("bubbles so a form can listen for it", () => {
    document.body.innerHTML = "<form><input-otp maxlength=\"2\"></input-otp></form>"
    const element = document.querySelector("input-otp")
    const form = document.querySelector("form")
    const seen = []
    form.addEventListener("input-otp:change", event => seen.push(event.detail.value))

    type(element, "1")

    expect(seen).toEqual([ "1" ])
  })

  test("fires input-otp:complete once the last slot is filled", () => {
    const element = mount("<input-otp maxlength=\"3\"></input-otp>")
    const completed = vi.fn()
    element.addEventListener("input-otp:complete", event => completed(event.detail.value))

    type(element, "12")
    expect(completed).not.toHaveBeenCalled()

    type(element, "3")
    expect(completed).toHaveBeenCalledWith("123")
    expect(completed).toHaveBeenCalledTimes(1)
  })

  test("does not fire input-otp:complete again while the field stays full", () => {
    const element = mount("<input-otp maxlength=\"2\"></input-otp>")
    const completed = vi.fn()
    element.addEventListener("input-otp:complete", completed)

    element.value = "12"
    element.value = "34"

    expect(completed).toHaveBeenCalledTimes(1)
  })

  test("fires input-otp:complete again after the value drops below full", () => {
    const element = mount("<input-otp maxlength=\"2\"></input-otp>")
    const completed = vi.fn()
    element.addEventListener("input-otp:complete", completed)

    element.value = "12"
    element.value = "1"
    element.value = "12"

    expect(completed).toHaveBeenCalledTimes(2)
  })
})

describe("focus and selection", () => {
  test("focus() moves focus to the invisible input", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")

    element.focus()

    expect(document.activeElement).toBe(element.input)
    expect(element.hasAttribute("data-focused")).toBe(true)
  })

  test("activates the first empty slot on focus", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")

    element.focus()

    expect(slotState(element).map(slot => slot.isActive)).toEqual([ true, false, false, false ])
    expect(slotState(element).map(slot => slot.hasCaret)).toEqual([ true, false, false, false ])
  })

  test("activates the append slot when the field is partially filled", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"12\"></input-otp>")

    element.focus()

    expect(slotState(element).map(slot => slot.isActive)).toEqual([ false, false, true, false ])
  })

  test("activates the last slot when the field is full", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")

    element.focus()

    expect(slotState(element).map(slot => slot.isActive)).toEqual([ false, false, false, true ])
  })

  test("deactivates every slot on blur", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    element.focus()

    element.blur()

    expect(element.hasAttribute("data-focused")).toBe(false)
    expect(slotState(element).some(slot => slot.isActive)).toBe(false)
  })

  // Arrow keys collapse the mirrored range: leftwards onto its start,
  // rightwards onto its end. Both have to widen back out to the slot the user
  // meant, which is the whole point of mirroring the selection.
  test("steps the active slot left when the caret collapses backwards", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()

    setSelection(element.input, 3)

    expect([ element.input.selectionStart, element.input.selectionEnd ]).toEqual([ 2, 3 ])
    expect(slotState(element).map(slot => slot.isActive)).toEqual([ false, false, true, false ])
  })

  test("steps the active slot right when the caret collapses forwards", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()
    setSelection(element.input, 3)

    setSelection(element.input, 3)

    expect([ element.input.selectionStart, element.input.selectionEnd ]).toEqual([ 3, 4 ])
    expect(slotState(element).map(slot => slot.isActive)).toEqual([ false, false, false, true ])
  })

  test("keeps a bare caret at the append position", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"12\"></input-otp>")
    element.focus()

    setSelection(element.input, 2)

    expect(element.input.selectionStart).toBe(2)
    expect(element.input.selectionEnd).toBe(2)
    expect(slotState(element)[2].hasCaret).toBe(true)
  })

  test("clamps a caret at the start onto the first slot", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()

    setSelection(element.input, 0)

    expect([ element.input.selectionStart, element.input.selectionEnd ]).toEqual([ 0, 1 ])
  })

  test("clamps a caret at the end onto the last slot", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()

    setSelection(element.input, 4)

    expect([ element.input.selectionStart, element.input.selectionEnd ]).toEqual([ 3, 4 ])
  })

  test("keeps a multi-slot range as the user drew it", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()

    setSelection(element.input, 1, 3)

    expect(slotState(element).map(slot => slot.isActive)).toEqual([ false, true, true, false ])
  })

  test("select() highlights every filled slot", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()

    element.select()

    expect(slotState(element).map(slot => slot.isActive)).toEqual([ true, true, true, true ])
  })
})

describe("paste", () => {
  test("runs the pasted text through pasteTransformer", () => {
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")
    element.pasteTransformer = pasted => pasted.replaceAll("-", "")
    element.focus()

    const event = paste(element, "123-456")

    expect(event.defaultPrevented).toBe(true)
    expect(element.value).toBe("123456")
  })

  test("caps a transformed paste at the slot count", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    element.pasteTransformer = pasted => pasted.trim()
    element.focus()

    paste(element, "  123456  ")

    expect(element.value).toBe("1234")
  })

  test("rejects a transformed paste that breaks the pattern", () => {
    const element = mount("<input-otp maxlength=\"6\" pattern=\"digits\"></input-otp>")
    element.pasteTransformer = pasted => pasted.toUpperCase()
    element.focus()

    paste(element, "abc")

    expect(element.value).toBe("")
  })

  test("leaves the browser to handle a paste when nothing needs transforming", () => {
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")
    element.focus()

    const event = paste(element, "123456")

    expect(event.defaultPrevented).toBe(false)
  })
})

describe("lifecycle", () => {
  test("stops listening to document selection changes once removed", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")
    element.focus()
    element.remove()

    expect(() => document.dispatchEvent(new Event("selectionchange"))).not.toThrow()
  })

  test("survives being moved in the document", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"12\"></input-otp>")
    const host = document.createElement("div")
    document.body.appendChild(host)

    host.appendChild(element)

    expect(element.value).toBe("12")
    expect(element.querySelectorAll("[data-input-otp-slot]")).toHaveLength(4)
  })

  test("installs its stylesheet exactly once", () => {
    mount("<input-otp></input-otp><input-otp></input-otp>")

    expect(document.querySelectorAll("#input-otp-zero-style")).toHaveLength(1)
  })
})

describe("styles", () => {
  // The stylesheet is installed once per document and outlives any single
  // component, so each of these starts from a document that has none.
  beforeEach(() => {
    document.head.replaceChildren()
  })

  test("injects the rules that make the input invisible", () => {
    mount("<input-otp></input-otp>")
    const styles = document.getElementById("input-otp-zero-style").textContent

    expect(styles).toContain("caret-color: transparent")
    expect(styles).toContain("[data-input-otp]::selection")
    expect(styles).toContain("-webkit-touch-callout")
  })

  // The theme is a stylesheet the page links; the script only ships what the
  // component cannot work without.
  test("leaves the theme to the page", () => {
    mount("<input-otp></input-otp>")
    const styles = document.getElementById("input-otp-zero-style").textContent

    expect(styles).not.toContain("--input-otp-slot-width")
    expect(styles).not.toContain("input-otp-caret-blink")
  })

  // Anything the page loads itself comes later in the cascade, so an author rule
  // of equal specificity wins without having to be more specific.
  test("goes first in head so a page's own CSS wins a tie", () => {
    document.head.appendChild(document.createElement("style"))

    mount("<input-otp></input-otp>")

    expect(document.head.firstElementChild.id).toBe("input-otp-zero-style")
  })

  test("carries a nonce through for CSP", () => {
    mount("<input-otp nonce=\"abc123\"></input-otp>")

    expect(document.getElementById("input-otp-zero-style").getAttribute("nonce")).toBe("abc123")
  })
})
