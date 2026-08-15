import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/basic.html")
})

test("lands on the first empty slot when focused", async ({ otp }) => {
  await otp.focus()

  await otp.expectActive([ 0 ])
  await otp.expectSelection(0, 0)
})

test("lands on the last slot when the value is already complete", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.input.evaluate(input => input.blur())

  await otp.focus()

  await otp.expectActive([ 5 ])
  await otp.expectSelection(5, 6)
})

test("moves one slot at a time with the arrow keys", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectActive([ 5 ])

  await otp.press("ArrowLeft")
  await otp.expectActive([ 4 ])

  await otp.press("ArrowLeft")
  await otp.expectActive([ 3 ])

  await otp.press("ArrowRight")
  await otp.expectActive([ 4 ])
})

test("never leaves a caret stranded between two slots", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")

  await otp.press("ArrowLeft")

  await otp.expectSelection(4, 5)
})

test("stops at the first slot", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.pressRepeatedly("ArrowLeft", 5)
  await otp.expectActive([ 0 ])

  await otp.press("ArrowLeft")

  await otp.expectActive([ 0 ])
  await otp.expectSelection(0, 1)
})

test("stops at the last slot", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectActive([ 5 ])

  await otp.press("ArrowRight")

  await otp.expectActive([ 5 ])
  await otp.expectSelection(5, 6)
})

// A slot is always a one-character range, so each Shift+Arrow adds exactly one
// more slot to it.
test("highlights every slot covered by a shift-arrow range", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.expectActive([ 5 ])

  await otp.press("Shift+ArrowLeft")
  await otp.expectActive([ 4, 5 ])

  await otp.press("Shift+ArrowLeft")
  await otp.expectActive([ 3, 4, 5 ])
})

test("highlights every slot on select-all", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")

  await otp.press("ControlOrMeta+a")

  await otp.expectActive([ 0, 1, 2, 3, 4, 5 ])
})

test("keeps a bare caret at the append position", async ({ otp }) => {
  await otp.focus()
  await otp.type("12")

  await otp.expectSelection(2, 2)
  await otp.expectActive([ 2 ])
})

test("overwrites the slot the caret sits on", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.pressRepeatedly("ArrowLeft", 5)
  await otp.expectActive([ 0 ])

  await otp.type("9")

  await otp.expectValue("923456")
})

test("clicking the component focuses the invisible input", async ({ otp }) => {
  await otp.element.click()

  await expect(otp.input).toBeFocused()
  await expect(otp.element).toHaveAttribute("data-focused", "")
})
