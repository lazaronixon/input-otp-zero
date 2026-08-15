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

test("marks the host as focused, complete and empty", async ({ otp }) => {
  await expect(otp.element).toHaveAttribute("data-empty", "")
  await expect(otp.element).not.toHaveAttribute("data-focused", "")

  await otp.focus()
  await expect(otp.element).toHaveAttribute("data-focused", "")

  await otp.type("123456")
  await expect(otp.element).toHaveAttribute("data-complete", "")
  await expect(otp.element).not.toHaveAttribute("data-empty", "")
})

test("deactivates every slot on blur", async ({ otp }) => {
  await otp.focus()
  await otp.type("12")
  await otp.expectActive([ 2 ])

  await otp.input.evaluate(input => input.blur())

  await otp.expectActive([])
  await expect(otp.element).not.toHaveAttribute("data-focused", "")
})
