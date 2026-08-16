import { OtpHandle } from "../helpers/otp_handle.js"
import { expect, test } from "../test_helper.js"

// The badge is detected either by a known extension marker or by probing the
// field's top-right corner. Planting a marker before focus takes the geometry
// probe out of the picture, so detection lands on the first try.
async function plantBadge(page) {
  await page.evaluate(() => {
    const badge = document.createElement("div")
    badge.setAttribute("data-lastpass-icon-root", "")
    badge.style.position = "absolute"
    document.body.appendChild(badge)
  })
}

function inlineStyle(otp, property) {
  return otp.input.evaluate((input, name) => input.style[name], property)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/pwm.html")
  await plantBadge(page)
})

// A badge lands on the right edge of the field, on top of the last slot. The
// input is widened past the component and the overhang clipped, so the badge
// anchors outside the slots without anything visibly moving.
test("opens a gutter for the badge when there is room", async ({ page }) => {
  const otp = new OtpHandle(page, "#roomy")

  await otp.focus()

  await expect.poll(() => inlineStyle(otp, "width")).toBe("calc(100% + 40px)")
  expect(await inlineStyle(otp, "clipPath")).toContain("40px")
})

// Regression for guilhermerodz/input-otp#107: widening the input inside a
// shrink-wrapped scroll container would push its content out and raise a
// scrollbar, shifting the whole layout.
test("leaves a constrained scroll container alone", async ({ page }) => {
  const otp = new OtpHandle(page, "#tight")
  const card = page.locator("#tight-card")

  await otp.focus()
  // Past the second detection probe, so this is a settled result and not just
  // an early read.
  await page.waitForTimeout(2500)

  expect(await inlineStyle(otp, "width")).toBe("")
  expect(await inlineStyle(otp, "clipPath")).toBe("")

  const overflow = await card.evaluate(element => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
