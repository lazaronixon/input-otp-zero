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

// Read through the CSSOM rather than the rule text: each engine serialises a
// declaration its own way, so only the parsed values are comparable.
test("scales the input down on iOS to hide the native selection", async ({ page }) => {
  const declarations = await page.evaluate(() => {
    const sheet = document.getElementById("input-otp-zero-style").sheet
    const supports = Array.from(sheet.cssRules)
      .find(rule => rule.conditionText?.includes("-webkit-touch-callout"))
    const style = supports.cssRules[0].style

    return [ "font-size", "transform", "text-indent", "letter-spacing" ].map(property => ({
      property,
      value: style.getPropertyValue(property),
      priority: style.getPropertyPriority(property)
    }))
  })

  expect(declarations).toEqual([
    { property: "font-size", value: "16px", priority: "important" },
    { property: "transform", value: "scale(0.1)", priority: "important" },
    { property: "text-indent", value: "-9999px", priority: "important" },
    { property: "letter-spacing", value: "-0.6em", priority: "important" }
  ])
})

test("lets the page override the machinery's own layout defaults", async ({ page }) => {
  await expect(page.locator("#plain")).toHaveCSS("display", "inline-flex")
  await expect(page.locator("#overridden")).toHaveCSS("display", "inline-grid")
})
