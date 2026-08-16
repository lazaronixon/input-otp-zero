import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { backspace, mount, paste, setSelection, slotState, type, unmount } from "./test_helper"
import { defineElements } from "input-otp-zero"

afterEach(() => {
  unmount()
  vi.useRealTimers()
})

describe("rendering", () => {
  test("renders one slot per character and an invisible input", () => {
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")

    expect(element.querySelectorAll("input-otp-slot")).toHaveLength(6)
    expect(element.input).toBeInstanceOf(HTMLInputElement)
    expect(element.input.maxLength).toBe(6)
    expect(element.input.hasAttribute("data-input-otp")).toBe(true)
  })

  test("defaults to six slots", () => {
    const element = mount("<input-otp></input-otp>")

    expect(element.maxLength).toBe(6)
    expect(element.querySelectorAll("input-otp-slot")).toHaveLength(6)
  })

  test("gives every slot a character and a caret element", () => {
    const element = mount("<input-otp maxlength=\"2\"></input-otp>")

    element.querySelectorAll("input-otp-slot").forEach(slot => {
      expect(slot.querySelector("input-otp-char")).not.toBeNull()
      expect(slot.querySelector("input-otp-caret")).not.toBeNull()
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
        <input-otp-group>
          <input-otp-slot class="mine"></input-otp-slot>
          <input-otp-slot class="mine"></input-otp-slot>
        </input-otp-group>
        <input-otp-separator></input-otp-separator>
        <input-otp-group>
          <input-otp-slot class="mine"></input-otp-slot>
          <input-otp-slot class="mine"></input-otp-slot>
        </input-otp-group>
      </input-otp>
    `)

    const slots = element.querySelectorAll("input-otp-slot")
    expect(slots).toHaveLength(4)
    expect(element.maxLength).toBe(4)
    // The two groups are the ones written above — none was generated.
    expect(element.querySelectorAll("input-otp-group")).toHaveLength(2)
    slots.forEach(slot => expect(slot.classList.contains("mine")).toBe(true))
  })

  test("warns when maxlength disagrees with the provided slots", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    mount("<input-otp maxlength=\"6\"><input-otp-slot></input-otp-slot></input-otp>")

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("maxlength is 6 but 1 slots were provided"))
    warn.mockRestore()
  })

  test("rebuilds the slots when maxlength changes", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")
    element.value = "1234"

    element.setAttribute("maxlength", "2")

    expect(element.querySelectorAll("input-otp-slot")).toHaveLength(2)
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

  // The properties are the scripting face of the attributes, so setting one has
  // to go back through the attribute the component actually reads.
  test("the properties write through to the attributes", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")

    element.maxLength = 3
    element.pattern = "digits"
    element.placeholder = "abc"
    element.disabled = true

    expect(element.getAttribute("maxlength")).toBe("3")
    expect(element.getAttribute("pattern")).toBe("digits")
    expect(element.getAttribute("placeholder")).toBe("abc")
    expect(element.hasAttribute("disabled")).toBe(true)
  })

  test("setting disabled to false removes the attribute", () => {
    const element = mount("<input-otp disabled></input-otp>")

    element.disabled = false

    expect(element.hasAttribute("disabled")).toBe(false)
    expect(element.input.disabled).toBe(false)
  })

  test("falls back to six slots when maxlength is not a usable number", () => {
    expect(mount("<input-otp maxlength=\"0\"></input-otp>").maxLength).toBe(6)
    unmount()
    expect(mount("<input-otp maxlength=\"-2\"></input-otp>").maxLength).toBe(6)
    unmount()
    expect(mount("<input-otp maxlength=\"abc\"></input-otp>").maxLength).toBe(6)
  })

  test("rounds a fractional maxlength down to whole slots", () => {
    const element = mount("<input-otp maxlength=\"3.7\"></input-otp>")

    expect(element.maxLength).toBe(3)
    expect(element.querySelectorAll("input-otp-slot")).toHaveLength(3)
  })
})

describe("hover", () => {
  test("flags the host while the pointer is over it", () => {
    const element = mount("<input-otp maxlength=\"4\"></input-otp>")

    element.input.dispatchEvent(new Event("mouseover"))
    expect(element.hasAttribute("data-hovering")).toBe(true)

    element.input.dispatchEvent(new Event("mouseleave"))
    expect(element.hasAttribute("data-hovering")).toBe(false)
  })

  // A disabled field is not interactive, so there is nothing to signal.
  test("never flags a disabled field", () => {
    const element = mount("<input-otp maxlength=\"4\" disabled></input-otp>")

    element.input.dispatchEvent(new Event("mouseover"))

    expect(element.hasAttribute("data-hovering")).toBe(false)
  })
})

describe("parts", () => {
  test("registers every part as its own element", () => {
    [ "input-otp", "input-otp-group", "input-otp-slot", "input-otp-char", "input-otp-caret", "input-otp-separator" ]
      .forEach(name => expect(customElements.get(name)).toBeTypeOf("function"))
  })

  test("upgrades hand-written slots so they can paint themselves", () => {
    const element = mount("<input-otp><input-otp-slot></input-otp-slot><input-otp-slot></input-otp-slot></input-otp>")

    element.querySelectorAll("input-otp-slot").forEach(slot => {
      expect(slot).toBeInstanceOf(customElements.get("input-otp-slot"))
      expect(slot.update).toBeTypeOf("function")
    })
  })

  test("a slot builds its own character and caret", () => {
    const element = mount("<input-otp maxlength=\"1\"></input-otp>")
    const slot = element.querySelector("input-otp-slot")

    expect(slot.char.tagName.toLowerCase()).toBe("input-otp-char")
    expect(slot.caret.tagName.toLowerCase()).toBe("input-otp-caret")
    expect(slot.char.getAttribute("aria-hidden")).toBe("true")
    expect(slot.caret.getAttribute("aria-hidden")).toBe("true")
  })

  test("a slot paints itself from a state object", () => {
    const element = mount("<input-otp maxlength=\"1\"></input-otp>")
    const slot = element.querySelector("input-otp-slot")

    slot.update({ char: "7", placeholderChar: null, isActive: true, hasFakeCaret: false })

    expect(slot.char.textContent).toBe("7")
    expect(slot.hasAttribute("data-active")).toBe(true)
    expect(slot.hasAttribute("data-filled")).toBe(true)
    expect(slot.caret.hasAttribute("data-visible")).toBe(false)
  })

  // The parts are created on demand so an empty `<input-otp-slot>` is all
  // anyone has to write — but a hand-written one is kept and painted in place.
  test("a slot keeps the character element you wrote yourself", () => {
    const element = mount(`
      <input-otp>
        <input-otp-slot>
          <input-otp-char class="mine"></input-otp-char>
        </input-otp-slot>
      </input-otp>
    `)
    const slot = element.querySelector("input-otp-slot")

    element.value = "7"

    expect(slot.querySelectorAll("input-otp-char")).toHaveLength(1)
    expect(slot.char.classList.contains("mine")).toBe(true)
    expect(slot.char.textContent).toBe("7")
  })

  test("generates a group around the slots it renders itself", () => {
    const element = mount("<input-otp maxlength=\"3\"></input-otp>")
    const group = element.querySelector("input-otp-group")

    expect(group.children).toHaveLength(3)
    expect(Array.from(group.children).every(slot => slot.matches("input-otp-slot"))).toBe(true)
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

    const slots = Array.from(element.querySelectorAll("input-otp-slot"))
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

  test("removing the value attribute empties the field", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")

    element.removeAttribute("value")

    expect(element.value).toBe("")
  })

  test("treats an emptied value as an empty string", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"1234\"></input-otp>")

    element.value = null

    expect(element.value).toBe("")
  })

  test("setting the value it already has changes nothing", () => {
    const element = mount("<input-otp maxlength=\"4\" value=\"12\"></input-otp>")
    const changed = vi.fn()
    element.addEventListener("input-otp:change", changed)

    element.value = "12"

    expect(changed).not.toHaveBeenCalled()
  })

  // Before the element upgrades there is no input to hold the value, so the
  // attribute stands in for it — that is what makes a server-rendered value work.
  test("falls back to the attribute before it has an input", () => {
    const element = document.createElement("input-otp")
    element.setAttribute("value", "99")

    expect(element.value).toBe("99")

    element.value = "88"
    expect(element.getAttribute("value")).toBe("88")
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

  test("a transformed paste replaces the selected characters", () => {
    const element = mount("<input-otp maxlength=\"6\" value=\"123456\"></input-otp>")
    element.pasteTransformer = pasted => pasted.trim()
    element.focus()
    setSelection(element.input, 1, 3)

    paste(element, "99")

    // The two selected characters are gone, the rest is untouched.
    expect(element.value).toBe("199456")
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
    expect(element.querySelectorAll("input-otp-slot")).toHaveLength(4)
  })

  test("installs its stylesheet exactly once", () => {
    mount("<input-otp></input-otp><input-otp></input-otp>")

    expect(document.querySelectorAll("#input-otp-zero-style")).toHaveLength(1)
  })

  // The observer only feeds a CSS variable used for sizing, so an engine
  // without it should still get a working field.
  test("works in a browser without ResizeObserver", () => {
    const observer = globalThis.ResizeObserver
    delete globalThis.ResizeObserver

    try {
      const element = mount("<input-otp maxlength=\"3\"></input-otp>")

      type(element, "12")
      expect(element.value).toBe("12")
      expect(element.querySelectorAll("input-otp-slot")).toHaveLength(3)
    } finally {
      globalThis.ResizeObserver = observer
    }
  })

  test("defining the elements again leaves the existing ones alone", () => {
    const slot = customElements.get("input-otp-slot")

    defineElements()

    expect(customElements.get("input-otp-slot")).toBe(slot)
    expect(customElements.get("input-otp")).toBe(customElements.get("input-otp"))
  })
})

describe("password manager badge", () => {
  // A badge is injected asynchronously, so detection runs on a timer after
  // focus, and the geometry it measures has to be supplied under jsdom.
  function layOutWithRoomToTheRight(element) {
    element.getBoundingClientRect = () => ({ left: 0, right: 300, top: 0, width: 300, height: 50, bottom: 50 })
    Object.defineProperty(element, "offsetWidth", { value: 300, configurable: true })
    Object.defineProperty(element, "offsetHeight", { value: 50, configurable: true })
    Object.defineProperty(document.documentElement, "clientWidth", { value: 1000, configurable: true })
    vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({ overflowX: "visible" })
    // Missing in jsdom. Answering with the component itself is what a corner
    // with no badge over it looks like.
    document.elementFromPoint = () => element
  }

  function plantBadge() {
    const marker = document.createElement("div")
    marker.setAttribute("data-lastpass-icon-root", "")
    document.body.appendChild(marker)
  }

  test("widens the input behind a clip so the badge clears the last slot", () => {
    vi.useFakeTimers()
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")
    layOutWithRoomToTheRight(element)
    plantBadge()

    element.focus()
    vi.advanceTimersByTime(0)

    expect(element.input.style.width).toBe("calc(100% + 40px)")
    expect(element.input.style.clipPath).toBe("inset(0 40px 0 0)")
  })

  test("leaves the input alone when nothing is pushing it", () => {
    vi.useFakeTimers()
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")
    layOutWithRoomToTheRight(element)

    element.focus()
    vi.advanceTimersByTime(6000)

    expect(element.input.style.width).toBe("")
    expect(element.input.style.clipPath).toBe("")
  })

  // The gutter is only borrowed while it fits — a validation message appearing
  // beside the field can take the room away again.
  test("gives the gutter back when the room disappears", () => {
    vi.useFakeTimers()
    const element = mount("<input-otp maxlength=\"6\"></input-otp>")
    layOutWithRoomToTheRight(element)
    plantBadge()
    element.focus()
    vi.advanceTimersByTime(0)
    expect(element.input.style.width).toBe("calc(100% + 40px)")

    Object.defineProperty(document.documentElement, "clientWidth", { value: 320, configurable: true })
    vi.advanceTimersByTime(1000)

    expect(element.input.style.width).toBe("")
    expect(element.input.style.clipPath).toBe("")
  })

  test("stays out of the way when the strategy is none", () => {
    vi.useFakeTimers()
    const element = mount("<input-otp maxlength=\"6\" push-password-manager-strategy=\"none\"></input-otp>")
    layOutWithRoomToTheRight(element)
    plantBadge()

    element.focus()
    vi.advanceTimersByTime(6000)

    expect(element.pushPasswordManagerStrategy).toBe("none")
    expect(element.input.style.width).toBe("")
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
