import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/basic.html")
})

test("reports every change", async ({ otp }) => {
  await otp.focus()
  await otp.type("123")

  await otp.expectEvents("change", [ "1", "12", "123" ])
})

test("reports completion once the last slot is filled", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")

  await otp.expectEvents("complete", [ "123456" ])
})

test("does not report completion twice for the same full value", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.pressRepeatedly("ArrowLeft", 5)
  await otp.expectActive([ 0 ])

  await otp.type("9")

  await otp.expectValue("923456")
  await otp.expectEvents("complete", [ "123456" ])
})

test("reports completion again after the value drops below full", async ({ otp }) => {
  await otp.focus()
  await otp.type("123456")
  await otp.press("Backspace")
  await otp.expectValue("12345")

  await otp.type("9")

  await otp.expectEvents("complete", [ "123456", "123459" ])
})

test("lets the completion handler lock the field", async ({ otp, page }) => {
  await page.goto("/complete.html")

  await otp.focus()
  await otp.type("123456")

  await expect(otp.element).toHaveAttribute("data-disabled", "")
  await expect(otp.input).toBeDisabled()
})

test("emits native input events so plain form code keeps working", async ({ otp, page }) => {
  await page.evaluate(() => {
    globalThis.nativeInputs = []
    document.addEventListener("input", event => globalThis.nativeInputs.push(event.target.value))
  })

  await otp.focus()
  await otp.type("12")

  expect(await page.evaluate(() => globalThis.nativeInputs)).toContain("12")
})
