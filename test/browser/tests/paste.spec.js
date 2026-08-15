import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/basic.html")
})

test("fills every slot from a full paste", async ({ otp }) => {
  await otp.focus()
  await otp.paste("123456")

  await otp.expectValue("123456")
  expect(await otp.chars()).toEqual([ "1", "2", "3", "4", "5", "6" ])
})

test("pastes into the middle of a half-filled code", async ({ otp }) => {
  await otp.focus()
  await otp.type("12")
  await otp.expectActive([ 2 ])

  await otp.paste("34")

  await otp.expectValue("1234")
})

test("caps an oversized paste at the slot count", async ({ otp }) => {
  await otp.focus()
  await otp.paste("1234567890")

  await otp.expectValue("123456")
})

test("rejects a paste that breaks the pattern", async ({ otp }) => {
  await otp.focus()
  await otp.paste("abcdef")

  await otp.expectValue("")
})

test("reports completion for a paste that fills the field", async ({ otp }) => {
  await otp.focus()
  await otp.paste("123456")

  await otp.expectEvents("complete", [ "123456" ])
})

test("runs a paste through pasteTransformer", async ({ otp }) => {
  await otp.element.evaluate(element => {
    element.pasteTransformer = pasted => pasted.replace(/\D/g, "")
  })
  await otp.focus()

  await otp.dispatchPaste("123-456")

  await otp.expectValue("123456")
})

test("caps a transformed paste at the slot count", async ({ otp }) => {
  await otp.element.evaluate(element => {
    element.pasteTransformer = pasted => pasted.trim()
  })
  await otp.focus()

  await otp.dispatchPaste("  1234567890  ")

  await otp.expectValue("123456")
})
