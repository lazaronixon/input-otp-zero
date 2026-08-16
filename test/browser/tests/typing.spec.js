import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/basic.html")
})

test("fills one slot per keystroke", async ({ otp }) => {
  await otp.focus()
  await otp.type("123")

  expect(await otp.chars()).toEqual([ "1", "2", "3", "", "", "" ])
  expect(await otp.value()).toBe("123")
})

test("activates the slot being typed into", async ({ otp }) => {
  await otp.focus()
  await otp.expectActive([ 0 ])

  await otp.type("12")

  await otp.expectActive([ 2 ])
})

test("shows a fake caret only on the empty active slot", async ({ otp }) => {
  await otp.focus()
  await expect(otp.caret).toHaveCount(1)

  await otp.type("123456")

  await expect(otp.caret).toHaveCount(0)
})

// Once every slot is filled the last one stays selected, so further keystrokes
// replace it rather than being swallowed — the value can never outgrow the slots.
test("overwrites the last slot once every slot is filled", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectActive([ 5 ])

  await otp.type("789")

  await otp.expectValue("123459")
  expect(await otp.chars()).toEqual([ "1", "2", "3", "4", "5", "9" ])
})

// A full field leaves the caret collapsed past the last slot, where the input
// is already at its maxlength and the browser drops what you type. The
// selection has to be widened back onto a slot as part of the change itself —
// doing it from a timer means fast typing loses characters.
test("keeps up with typing faster than its own timers", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectActive([ 5 ])

  await otp.typeInstantly("789")

  await otp.expectValue("123459")
})

test("rejects characters that break the pattern", async ({ otp }) => {
  await otp.focus()
  await otp.type("12")
  await otp.type("ab")

  await otp.expectValue("12")
})

test("deletes backwards with Backspace", async ({ otp }) => {
  await otp.focus()
  await otp.type("123")

  await otp.press("Backspace")

  await otp.expectValue("12")
  await otp.expectActive([ 2 ])
})

test("clears the whole value with select-all then Backspace", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")

  await otp.press("ControlOrMeta+a")
  await otp.press("Backspace")

  await otp.expectValue("")
  expect(await otp.chars()).toEqual([ "", "", "", "", "", "" ])
})

// Meta+Backspace deletes to the start of the line on macOS and Control+Backspace
// deletes the previous word elsewhere. The whole code is one word either way.
test("deletes the whole code with a word-delete", async ({ otp }) => {
  await otp.focus()
  await otp.type("1234")

  await otp.press("ControlOrMeta+Backspace")

  await otp.expectValue("")
})

test("deletes only the selected character with a word-delete", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.setSelection(3, 4)

  await otp.press("ControlOrMeta+Backspace")

  await otp.expectValue("12356")
})

// A full field leaves the last slot selected, so Delete removes the character
// under it rather than doing nothing at the end of the text.
test("forward-deletes the selected slot with Delete", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectSelection(5, 6)

  await otp.press("Delete")
  await otp.expectValue("12345")

  await otp.setSelection(0, 1)
  await otp.press("Delete")
  await otp.expectValue("2345")

  await otp.setSelection(2, 3)
  await otp.press("Delete")
  await otp.expectValue("235")
})

test("marks the host as focused, complete and empty", async ({ otp }) => {
  await expect(otp.element).toHaveAttribute("data-empty", "")
  await expect(otp.element).not.toHaveAttribute("data-focused", "")

  await otp.focus()
  await expect(otp.element).toHaveAttribute("data-focused", "")

  await otp.type("123456")
  await expect(otp.element).toHaveAttribute("data-complete", "")
  await expect(otp.element).not.toHaveAttribute("data-empty", "")
})

// The invisible input covers the component and is the only part of it that
// takes pointer events, so hovering the component hovers the input.
test("marks the host as hovering under the pointer", async ({ otp }) => {
  await expect(otp.element).not.toHaveAttribute("data-hovering", "")

  await otp.hover()

  await expect(otp.element).toHaveAttribute("data-hovering", "")
})

test("deactivates every slot on blur", async ({ otp }) => {
  await otp.focus()
  await otp.type("12")
  await otp.expectActive([ 2 ])

  await otp.input.evaluate(input => input.blur())

  await otp.expectActive([])
  await expect(otp.element).not.toHaveAttribute("data-focused", "")
})
