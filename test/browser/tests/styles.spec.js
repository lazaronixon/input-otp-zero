import { OtpHandle } from "../helpers/otp_handle.js"
import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/overrides.html")
})

test("installs one machinery stylesheet for the whole document", async ({ page }) => {
  await expect(page.locator("head #input-otp-zero-style")).toHaveCount(1)
})

// Nothing in the theme file makes the input invisible — the script does, so a
// page that only links the theme still gets a working field.
test("hides the real input without help from the theme", async ({ page }) => {
  const otp = new OtpHandle(page, "#plain")

  await expect(otp.input).toHaveCSS("color", "rgba(0, 0, 0, 0)")
  await expect(otp.input).toHaveCSS("caret-color", "rgba(0, 0, 0, 0)")
  await expect(otp.input).toHaveCSS("position", "absolute")
})

test("lets the page override the theme", async ({ page }) => {
  const otp = new OtpHandle(page, "#overridden")

  await expect(otp.slot(0)).toHaveCSS("border-top-color", "rgb(255, 0, 255)")
})

test("lets the page override the machinery's own layout defaults", async ({ page }) => {
  await expect(page.locator("#plain")).toHaveCSS("display", "inline-flex")
  await expect(page.locator("#overridden")).toHaveCSS("display", "inline-grid")
})
