import { OtpHandle } from "../helpers/otp_handle.js"
import { expect, test } from "../test_helper.js"

test.beforeEach(async ({ page }) => {
  await page.goto("/theming.html")
})

test("sizes slots from the theme variables", async ({ page }) => {
  const fallback = new OtpHandle(page, "#default")
  const themed = new OtpHandle(page, "#themed")

  expect((await fallback.slot(0).boundingBox()).width).toBeCloseTo(44, 0)
  expect((await themed.slot(0).boundingBox()).width).toBeCloseTo(64, 0)
  expect((await themed.slot(0).boundingBox()).height).toBeCloseTo(80, 0)
})

test("an inline variable beats an ancestor's", async ({ page }) => {
  const inline = new OtpHandle(page, "#inline")

  expect((await inline.slot(0).boundingBox()).width).toBeCloseTo(96, 0)
})

test("colours the resting border from the theme", async ({ page }) => {
  const themed = new OtpHandle(page, "#themed")

  await expect(themed.slot(0)).toHaveCSS("border-top-color", "rgb(0, 0, 255)")
})

test("colours the active border from the theme", async ({ page }) => {
  const themed = new OtpHandle(page, "#themed")
  await themed.focus()

  await expect(themed.slot(0)).toHaveAttribute("data-active", "")
  await expect(themed.slot(0)).toHaveCSS("border-top-color", "rgb(255, 0, 0)")
})

test("draws the fake caret with the themed colour and width", async ({ page }) => {
  const themed = new OtpHandle(page, "#themed")
  await themed.focus()

  const caret = themed.caret
  await expect(caret).toHaveCount(1)
  await expect(caret).toHaveCSS("background-color", "rgb(0, 128, 0)")
  expect((await caret.boundingBox()).width).toBeCloseTo(3, 0)
})

test("hides the real caret and selection of the invisible input", async ({ page }) => {
  const otp = new OtpHandle(page, "#default")
  await otp.focus()

  await expect(otp.input).toHaveCSS("caret-color", "rgba(0, 0, 0, 0)")
  await expect(otp.input).toHaveCSS("color", "rgba(0, 0, 0, 0)")
})

test("covers the whole component with the invisible input", async ({ page }) => {
  const otp = new OtpHandle(page, "#default")

  const host = await otp.element.boundingBox()
  const input = await otp.input.boundingBox()

  expect(input.width).toBeCloseTo(host.width, 0)
  expect(input.height).toBeCloseTo(host.height, 0)
})
